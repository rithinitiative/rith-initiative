import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Trash2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";

interface FormField {
  id: string;
  label: string;
  field_type: string;
  options: unknown;
}

interface FormSubmission {
  id: string;
  session_id: string;
  responses: Record<string, string | boolean>;
  created_at: string;
  updated_at: string;
}

interface FormSubmissionsViewerProps {
  postId: string;
  postTitle: string;
}

export function FormSubmissionsViewer({ postId, postTitle }: FormSubmissionsViewerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);

    // Get the form for this post
    const { data: form } = await supabase
      .from('blog_post_forms')
      .select('id')
      .eq('post_id', postId)
      .maybeSingle();

    if (!form) {
      setIsLoading(false);
      return;
    }

    setFormId(form.id);

    // Fetch fields and submissions in parallel
    const [fieldsRes, submissionsRes] = await Promise.all([
      supabase
        .from('blog_form_fields')
        .select('id, label, field_type, options')
        .eq('form_id', form.id)
        .order('display_order', { ascending: true }),
      supabase
        .from('blog_form_submissions')
        .select('*')
        .eq('form_id', form.id)
        .order('created_at', { ascending: false }),
    ]);

    if (fieldsRes.data) {
      setFields(fieldsRes.data);
    }

    if (submissionsRes.data) {
      setSubmissions(submissionsRes.data.map(s => ({
        ...s,
        responses: s.responses as Record<string, string | boolean>,
      })));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, postId]);

  const handleDeleteSubmission = async (submissionId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this submission?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('blog_form_submissions')
      .delete()
      .eq('id', submissionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete submission.',
        variant: 'destructive',
      });
    } else {
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      toast({
        title: 'Deleted',
        description: 'Submission has been deleted.',
      });
    }
  };

  const allowsOther = (options: unknown): boolean => {
    if (typeof options === 'string') {
      try {
        return allowsOther(JSON.parse(options));
      } catch {
        return false;
      }
    }

    return Boolean(options && typeof options === 'object' && !Array.isArray(options) && (options as { allow_other?: unknown }).allow_other === true);
  };

  const formatValue = (submission: FormSubmission, field: FormField): string => {
    const value = submission.responses[field.id];

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (field.field_type === 'date' && value) {
      try {
        return format(new Date(value), 'PPP');
      } catch {
        return String(value);
      }
    }
    if (field.field_type === 'multiple_choice' && value === '__other__' && allowsOther(field.options)) {
      return `Other: ${submission.responses[`${field.id}__other`] || ''}`;
    }
    if (field.field_type === 'checkbox' && value === '__other__' && allowsOther(field.options)) {
      return `Other: ${submission.responses[`${field.id}__other`] || ''}`;
    }
    if (field.field_type === 'checkbox' && typeof value === 'string' && value.includes('|||')) {
      return value
        .split('|||')
        .map((option) => option === '__other__' && allowsOther(field.options) ? `Other: ${submission.responses[`${field.id}__other`] || ''}` : option)
        .join(', ');
    }
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Users size={14} />
          <span className="hidden sm:inline">Responses</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Form Responses: {postTitle}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !formId ? (
          <div className="py-8 text-center text-muted-foreground">
            No form attached to this post.
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No submissions yet.
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <>
                    <TableRow key={submission.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setExpandedRow(
                            expandedRow === submission.id ? null : submission.id
                          )}
                        >
                          {expandedRow === submission.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {submission.session_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(submission.updated_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSubmission(submission.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === submission.id && (
                      <TableRow key={`${submission.id}-details`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            {fields.filter(field => field.field_type !== 'section').map((field) => (
                              <div key={field.id} className="flex gap-2">
                                <span className="font-medium text-sm min-w-32">
                                  {field.label}:
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {submission.responses[field.id] !== undefined
                                    ? formatValue(submission, field)
                                    : '—'}
                                </span>
                              </div>
                            ))}
                            {fields.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                No fields defined for this form.
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="pt-4 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {submissions.length} {submissions.length === 1 ? 'response' : 'responses'}
          </span>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
