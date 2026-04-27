const DEFAULT_DESCRIPTION =
  "Discover upcoming Indian cultural events, festivals, and community gatherings hosted by The Rith Initiative in Virginia.";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripRichText = (value = "") =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value, maxLength) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;

const getOrigin = (req) => {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "www.rithinitiative.org";
  return `${proto}://${host}`;
};

const isCrawlerRequest = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  return /(facebookexternalhit|facebot|twitterbot|slackbot|discordbot|linkedinbot|whatsapp|skypeuripreview|telegrambot|pinterest|vkshare|snapchat|imessage|applebot)/i.test(
    userAgent
  );
};

const getImageType = (imageUrl) => {
  if (/\.png($|\?)/i.test(imageUrl)) return "image/png";
  if (/\.jpe?g($|\?)/i.test(imageUrl)) return "image/jpeg";
  if (/\.webp($|\?)/i.test(imageUrl)) return "image/webp";
  if (/\.gif($|\?)/i.test(imageUrl)) return "image/gif";
  return null;
};

const fetchSupabase = async (path) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
};

export default async function handler(req, res) {
  const eventId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const origin = getOrigin(req);
  const fallbackImage = `${origin}/og-image.png`;

  let event = null;
  let imageUrl = fallbackImage;

  if (eventId) {
    const events = await fetchSupabase(
      `events?select=id,title,description,featured_image_url,is_archived&id=eq.${encodeURIComponent(eventId)}&limit=1`
    );
    event = Array.isArray(events) ? events[0] : null;

    if (event?.featured_image_url) {
      imageUrl = event.featured_image_url;
    } else if (event?.id) {
      const media = await fetchSupabase(
        `media?select=url&entity_type=eq.event&media_type=eq.image&entity_id=eq.${encodeURIComponent(event.id)}&order=display_order.asc,created_at.asc&limit=1`
      );
      imageUrl = media?.[0]?.url || fallbackImage;
    }
  }

  const title = event?.title || "Events & Programs";
  const description = truncate(stripRichText(event?.description || "") || DEFAULT_DESCRIPTION, 180);
  const redirectUrl = event?.id ? `${origin}/events?event=${encodeURIComponent(event.id)}` : `${origin}/events`;
  const shareUrl = event?.id ? `${origin}/events/share/${encodeURIComponent(event.id)}` : `${origin}/events`;
  const imageType = getImageType(imageUrl);

  if (!isCrawlerRequest(req)) {
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, redirectUrl);
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | The Rith Initiative</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(shareUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    ${imageType ? `<meta property="og:image:type" content="${escapeHtml(imageType)}">` : ""}
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta property="og:site_name" content="The Rith Initiative">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  </head>
  <body>
    <p><a href="${escapeHtml(redirectUrl)}">View ${escapeHtml(title)}</a></p>
  </body>
</html>`);
}
