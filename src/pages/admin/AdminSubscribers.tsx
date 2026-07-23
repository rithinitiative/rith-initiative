import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Search, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  source: string | null;
}

const SUBSCRIBERS_QUERY_KEY = ['admin', 'subscribers'] as const;

export default function AdminSubscribers() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: SUBSCRIBERS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      return data as Subscriber[];
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async ({ id }: Pick<Subscriber, 'id' | 'email'>) => {
      const { data, error } = await supabase.rpc('remove_email_subscriber', {
        _subscriber_id: id,
      });

      if (error) {
        throw error;
      }

      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to delete subscriber');
      }

      return id;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: SUBSCRIBERS_QUERY_KEY });

      const previousSubscribers = queryClient.getQueryData<Subscriber[]>(SUBSCRIBERS_QUERY_KEY) || [];

      queryClient.setQueryData<Subscriber[]>(SUBSCRIBERS_QUERY_KEY, (current = []) =>
        current.filter((subscriber) => subscriber.id !== id)
      );

      return { previousSubscribers };
    },
    onError: (error, _variables, context) => {
      if (context?.previousSubscribers) {
        queryClient.setQueryData(SUBSCRIBERS_QUERY_KEY, context.previousSubscribers);
      }
      toast.error(error instanceof Error ? error.message : 'Failed to delete subscriber');
    },
    onSuccess: () => {
      toast.success('Subscriber removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIBERS_QUERY_KEY });
    },
  });

  const filteredSubscribers = subscribers.filter((sub) =>
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    if (subscribers.length === 0) {
      toast.error('No subscribers to export');
      return;
    }

    const headers = ['Email', 'Subscribed At', 'Source'];
    const csvContent = [
      headers.join(','),
      ...subscribers.map((sub) =>
        [
          sub.email,
          format(new Date(sub.subscribed_at), 'yyyy-MM-dd HH:mm:ss'),
          sub.source || 'unknown',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `subscribers_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Subscribers exported successfully');
  };

  const handleDelete = (subscriber: Pick<Subscriber, 'id' | 'email'>) => {
    deleteSubscriberMutation.mutate(subscriber);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Email Subscribers
          </h1>
          <p className="text-muted-foreground mt-1">
            {subscribers.length} total subscriber{subscribers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download size={16} />
          Export CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No subscribers found matching your search' : 'No subscribers yet'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((subscriber) => {
                const isDeletingSubscriber =
                  deleteSubscriberMutation.isPending &&
                  deleteSubscriberMutation.variables?.id === subscriber.id;

                return (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>
                      {format(new Date(subscriber.subscribed_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {subscriber.source || 'unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            disabled={isDeletingSubscriber}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove subscriber?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {subscriber.email} from the subscriber list. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(subscriber)}
                              disabled={isDeletingSubscriber}
                            >
                              {isDeletingSubscriber ? 'Removing...' : 'Remove'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
