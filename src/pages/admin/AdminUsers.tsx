import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AdminListSkeleton } from "@/components/shared/skeletons";
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

interface Admin {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  invited_by_email: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancellingEmail, setCancellingEmail] = useState<string | null>(null);

  const loadAdministrators = async (): Promise<Admin[]> => {
    const adminsResult = await supabase.rpc('get_all_admins');

    if (!adminsResult.error) {
      return adminsResult.data || [];
    }

    console.warn('get_all_admins RPC failed, falling back to table queries:', adminsResult.error);

    const rolesResult = await supabase
      .from('user_roles')
      .select('user_id, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });

    if (rolesResult.error) throw rolesResult.error;

    const roleRows = rolesResult.data || [];
    if (roleRows.length === 0) return [];

    const profileResult = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', roleRows.map((row) => row.user_id));

    if (profileResult.error) throw profileResult.error;

    const profileByUserId = new Map(
      (profileResult.data || []).map((profile) => [profile.user_id, profile])
    );

    return roleRows.map((roleRow) => {
      const profile = profileByUserId.get(roleRow.user_id);
      return {
        user_id: roleRow.user_id,
        email: profile?.email || '(email unavailable)',
        full_name: profile?.full_name || null,
        created_at: roleRow.created_at,
      };
    });
  };

  const fetchAdmins = async () => {
    try {
      const adminRows = await loadAdministrators();
      setAdmins(adminRows);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load administrators');
      setAdmins([]);
    }

    try {
      const invitesResult = await supabase.rpc('get_admin_invitations');
      // Invitations are best-effort — don't crash the page if the function isn't ready yet
      setInvitations(invitesResult.error ? [] : (invitesResult.data || []));
    } catch (error) {
      console.warn('Error fetching admin invitations:', error);
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdminEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase.rpc('add_admin_by_email', {
        _email: newAdminEmail.trim().toLowerCase()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (result.success) {
        toast.success(result.message || 'Admin added successfully');
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        toast.error(result.error || 'Failed to add admin');
      }
    } catch (error: any) {
      console.error('Error adding admin:', error);
      toast.error(error.message || 'Failed to add admin');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminUserId: string, email: string) => {
    setRemovingId(adminUserId);
    try {
      const { data, error } = await supabase.rpc('remove_admin_by_email', {
        _email: email
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast.success(result.message || 'Admin removed successfully');
        fetchAdmins();
      } else {
        toast.error(result.error || 'Failed to remove admin');
      }
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error(error.message || 'Failed to remove admin');
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancelInvitation = async (email: string) => {
    setCancellingEmail(email);
    try {
      const { data, error } = await supabase.rpc('remove_admin_by_email', {
        _email: email,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast.success(result.message || 'Invitation cancelled');
        fetchAdmins();
      } else {
        toast.error(result.error || 'Failed to cancel invitation');
      }
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast.error(error.message || 'Failed to cancel invitation');
    } finally {
      setCancellingEmail(null);
    }
  };

  if (isLoading) {
    return <AdminListSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manage Administrators</h1>
        <p className="text-muted-foreground mt-1">
          Add or remove admin access for users
        </p>
      </div>

      {/* Add Admin Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Administrator
          </CardTitle>
          <CardDescription>
            Enter the email address to invite as an administrator. If they already have an account,
            admin access is granted immediately. If not, an invitation is saved and they will
            automatically receive admin access when they sign up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAdmin} className="flex gap-3">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="flex-1"
              disabled={isAdding}
            />
            <Button type="submit" disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Admin
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Admins List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Administrators
          </CardTitle>
          <CardDescription>
            {admins.length} administrator{admins.length !== 1 ? 's' : ''} with access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No administrators found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>{admin.full_name || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(admin.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {admin.user_id === user?.id ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={removingId === admin.user_id}
                            >
                              {removingId === admin.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Administrator</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove admin access for <strong>{admin.email}</strong>?
                                They will no longer be able to access the admin dashboard.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveAdmin(admin.user_id, admin.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Admin
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              These email addresses have been invited. They will receive admin access automatically when they sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>{format(new Date(invite.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={cancellingEmail === invite.email}
                          >
                            {cancellingEmail === invite.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cancel the admin invitation for <strong>{invite.email}</strong>?
                              If they sign up, they will not receive admin access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelInvitation(invite.email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel Invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
