import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranscribeRequest {
  interviewId: string;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const getFileName = (url: string) => {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").pop();
    return name || "interview-audio.mp3";
  } catch {
    return "interview-audio.mp3";
  }
};

const normalizeSegments = (segments: unknown): TranscriptSegment[] => {
  if (!Array.isArray(segments)) return [];

  return segments
    .map((segment) => {
      if (!segment || typeof segment !== "object") return null;
      const raw = segment as { start?: unknown; end?: unknown; text?: unknown };
      const start = typeof raw.start === "number" ? raw.start : Number(raw.start);
      const end = typeof raw.end === "number" ? raw.end : Number(raw.end);
      const text = typeof raw.text === "string" ? raw.text.trim() : "";

      if (!Number.isFinite(start) || !Number.isFinite(end) || !text) return null;
      return { start, end, text };
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");

    if (!openAiApiKey) {
      return jsonResponse({ error: "Transcription service is not configured." }, 500);
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !authorization) {
      return jsonResponse({ error: "Missing server configuration." }, 500);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: roleRows, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "moderator"]);

    if (roleError) throw roleError;
    if (!roleRows || roleRows.length === 0) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { interviewId }: TranscribeRequest = await req.json();
    if (!interviewId) {
      return jsonResponse({ error: "Missing interview id." }, 400);
    }

    const { data: interview, error: interviewError } = await adminClient
      .from("project_interviews")
      .select("id, audio_url")
      .eq("id", interviewId)
      .maybeSingle();

    if (interviewError) throw interviewError;
    if (!interview) {
      return jsonResponse({ error: "Interview not found." }, 404);
    }
    if (!interview.audio_url) {
      return jsonResponse({ error: "This interview does not have an audio file." }, 400);
    }

    await adminClient
      .from("project_interviews")
      .update({ transcript_segments: [], transcript_generated_at: null })
      .eq("id", interviewId);

    const audioResponse = await fetch(interview.audio_url);
    if (!audioResponse.ok) {
      return jsonResponse({ error: "Could not download the interview audio." }, 400);
    }

    const audioBlob = await audioResponse.blob();
    const formData = new FormData();
    formData.append("file", audioBlob, getFileName(interview.audio_url));
    formData.append("model", "gpt-4o-transcribe");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const transcriptionResponse = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}` },
      body: formData,
    });

    const responseText = await transcriptionResponse.text();
    if (!transcriptionResponse.ok) {
      let message = responseText;
      try {
        const parsed = JSON.parse(responseText);
        message = parsed.error?.message || parsed.message || responseText;
      } catch {
        // Keep raw response text.
      }
      throw new Error(`OpenAI transcription failed: ${message}`);
    }

    const transcription = JSON.parse(responseText) as {
      text?: string;
      segments?: unknown;
    };
    const transcript = transcription.text?.trim() || "";
    const transcriptSegments = normalizeSegments(transcription.segments);

    const { error: updateError } = await adminClient
      .from("project_interviews")
      .update({
        transcript: transcript || null,
        transcript_segments: transcriptSegments,
        transcript_generated_at: new Date().toISOString(),
      })
      .eq("id", interviewId);

    if (updateError) throw updateError;

    return jsonResponse({
      transcript,
      transcriptSegments,
    });
  } catch (error) {
    console.error("Error in transcribe-interview function:", error);
    const message = error instanceof Error ? error.message : "Failed to transcribe interview.";
    return jsonResponse({ error: message }, 500);
  }
});
