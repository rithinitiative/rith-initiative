import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ImageUpload } from '@/components/admin/ImageUpload';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { ArrowDown, ArrowUp, Loader2, Pencil, Trash2, UserRound } from 'lucide-react';
import { htmlToPlainText } from '@/lib/richText';
import { AdminListSkeleton } from "@/components/shared/skeletons";

type TeamSection = 'board' | 'advisory';

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  section: TeamSection;
  photo_url: string | null;
  display_order: number;
  created_at: string;
}

interface TeamFormState {
  name: string;
  role: string;
  bio: string;
  section: TeamSection;
  photoUrl: string;
}

const SECTION_LABELS: Record<TeamSection, string> = {
  board: 'Board',
  advisory: 'Advisory',
};

const SECTION_ORDER: Record<TeamSection, number> = {
  board: 0,
  advisory: 1,
};

const DEFAULT_FORM: TeamFormState = {
  name: '',
  role: '',
  bio: '',
  section: 'board',
  photoUrl: '',
};

const LOCAL_BIO_STORAGE_KEY = 'rith-team-member-bio-preview';

const isMissingBioColumnError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const { code, message } = error as { code?: string; message?: string };
  return code === '42703' || Boolean(message?.toLowerCase().includes("'bio'"));
};

const getLocalBioPreview = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_BIO_STORAGE_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

const setLocalBioPreview = (memberId: string, bio: string) => {
  const bios = getLocalBioPreview();

  if (bio) {
    bios[memberId] = bio;
  } else {
    delete bios[memberId];
  }

  localStorage.setItem(LOCAL_BIO_STORAGE_KEY, JSON.stringify(bios));
};

const getNextDisplayOrder = (members: TeamMember[], section: TeamSection, excludeId?: string) => {
  const sectionOrders = members
    .filter((member) => member.section === section && member.id !== excludeId)
    .map((member) => member.display_order)
    .filter(Number.isFinite);

  return sectionOrders.length ? Math.max(...sectionOrders) + 1 : 0;
};

const compareTeamMembers = (a: TeamMember, b: TeamMember) => {
  const sectionDiff = SECTION_ORDER[a.section] - SECTION_ORDER[b.section];
  if (sectionDiff !== 0) return sectionDiff;

  const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
  if (orderDiff !== 0) return orderDiff;

  const createdAtDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (createdAtDiff !== 0) return createdAtDiff;

  return a.name.localeCompare(b.name);
};

const prepareNewMemberForm = (members: TeamMember[], section: TeamSection) => ({
  ...DEFAULT_FORM,
  section,
});

export default function AdminTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TeamFormState>(DEFAULT_FORM);
  const [isBioColumnAvailable, setIsBioColumnAvailable] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  const sortedMembers = useMemo(() => {
    return [...members].sort(compareTeamMembers);
  }, [members]);

  const boardMembers = sortedMembers.filter((member) => member.section === 'board');
  const advisoryMembers = sortedMembers.filter((member) => member.section === 'advisory');

  const fetchMembers = async () => {
    try {
      const teamQuery = await supabase
        .from('team_members')
        .select('id, name, role, bio, section, photo_url, display_order, created_at')
        .order('section', { ascending: true })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (teamQuery.error && isMissingBioColumnError(teamQuery.error)) {
        setIsBioColumnAvailable(false);

        const fallbackQuery = await supabase
          .from('team_members')
          .select('id, name, role, section, photo_url, display_order, created_at')
          .order('section', { ascending: true })
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (fallbackQuery.error) throw fallbackQuery.error;

        const localBios = getLocalBioPreview();
        const nextMembers = (fallbackQuery.data || []).map((member) => ({
          ...member,
          bio: localBios[member.id] || null,
        })) as TeamMember[];
        setMembers(nextMembers);
        return;
      }

      const { data, error } = teamQuery;
      if (error) throw error;
      setIsBioColumnAvailable(true);
      const nextMembers = (data || []) as TeamMember[];
      setMembers(nextMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormState(prepareNewMemberForm(members, DEFAULT_FORM.section));
  };

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setFormState({
      name: member.name,
      role: member.role || '',
      bio: member.bio || '',
      section: member.section,
      photoUrl: member.photo_url || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formState.name.trim();
    if (!name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    const existingMember = editingId ? members.find((member) => member.id === editingId) : null;
    const displayOrder =
      existingMember && existingMember.section === formState.section
        ? existingMember.display_order
        : getNextDisplayOrder(members, formState.section, editingId || undefined);

    const payload = {
      name,
      role: formState.role.trim() || null,
      section: formState.section,
      photo_url: formState.photoUrl.trim() || null,
      display_order: displayOrder,
    };
    const payloadWithBio = {
      ...payload,
      ...(isBioColumnAvailable ? { bio: formState.bio.trim() || null } : {}),
    };
    const enteredBio = formState.bio.trim();

    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('team_members')
          .update(payloadWithBio)
          .eq('id', editingId);

        if (error) throw error;

        if (!isBioColumnAvailable) {
          setLocalBioPreview(editingId, enteredBio);
        }

        toast({
          title: 'Team member updated',
          description:
            !isBioColumnAvailable && enteredBio
              ? `${name} has been updated. The bio is saved in this browser for local preview.`
              : `${name} has been updated.`,
        });
      } else {
        const { data, error } = await supabase
          .from('team_members')
          .insert({
            ...payloadWithBio,
            created_by: user?.id,
          })
          .select('id')
          .single();

        if (error) throw error;

        if (!isBioColumnAvailable && data?.id) {
          setLocalBioPreview(data.id, enteredBio);
        }

        toast({
          title: 'Team member added',
          description:
            !isBioColumnAvailable && enteredBio
              ? `${name} has been added. The bio is saved in this browser for local preview.`
              : `${name} has been added to ${SECTION_LABELS[formState.section]}.`,
        });
      }

      resetForm();
      fetchMembers();
    } catch (error) {
      console.error('Error saving team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team member.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      if (editingId === member.id) {
        resetForm();
      }

      toast({
        title: 'Team member removed',
        description: `${member.name} has been removed from the team.`,
      });

      fetchMembers();
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveMember = async (
    sectionMembers: TeamMember[],
    memberIndex: number,
    direction: 'up' | 'down',
  ) => {
    const targetIndex = direction === 'up' ? memberIndex - 1 : memberIndex + 1;
    if (targetIndex < 0 || targetIndex >= sectionMembers.length) return;

    const reorderedMembers = [...sectionMembers];
    [reorderedMembers[memberIndex], reorderedMembers[targetIndex]] = [
      reorderedMembers[targetIndex],
      reorderedMembers[memberIndex],
    ];

    const updates = reorderedMembers.map((member, index) => ({
      id: member.id,
      display_order: index,
    }));

    setMembers((prevMembers) =>
      prevMembers.map((member) => {
        const update = updates.find((item) => item.id === member.id);
        return update ? { ...member, display_order: update.display_order } : member;
      }),
    );

    try {
      const results = await Promise.all(
        updates.map((update) =>
          supabase
            .from('team_members')
            .update({ display_order: update.display_order })
            .eq('id', update.id),
        ),
      );

      const failedUpdate = results.find((result) => result.error);
      if (failedUpdate?.error) throw failedUpdate.error;

      toast({
        title: 'Team order updated',
        description: `${reorderedMembers[targetIndex].name} was moved ${direction}.`,
      });
    } catch (error) {
      console.error('Error updating team order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team order.',
        variant: 'destructive',
      });
      fetchMembers();
    }
  };

  if (isLoading) {
    return (
      <AdminListSkeleton />
    );
  }

  const TeamSectionList = ({
    title,
    sectionMembers,
  }: {
    title: string;
    sectionMembers: TeamMember[];
  }) => {
    return (
      <div className="space-y-3">
        <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>

        {sectionMembers.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
            No members in this section yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sectionMembers.map((member, index) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-soft sm:flex-row sm:items-center"
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                    <UserRound size={20} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.role || 'No role specified'}
                  </p>
                  {member.bio && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {htmlToPlainText(member.bio)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    Position {index + 1}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleMoveMember(sectionMembers, index, 'up')}
                    disabled={index === 0}
                    aria-label={`Move ${member.name} up`}
                    title={`Move ${member.name} up`}
                  >
                    <ArrowUp size={14} />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleMoveMember(sectionMembers, index, 'down')}
                    disabled={index === sectionMembers.length - 1}
                    aria-label={`Move ${member.name} down`}
                    title={`Move ${member.name} down`}
                  >
                    <ArrowDown size={14} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(member)}
                    className="gap-2"
                  >
                    <Pencil size={14} />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove team member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove {member.name} from the Rith Team? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(member)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Rith Team</h1>
        <p className="text-sm text-muted-foreground">
          Add, update, and remove board and advisory members shown on the About page.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-border/50 bg-card p-6 shadow-soft"
      >
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {editingId ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Changes here are reflected in the About page Rith Team section.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="member-name">Name *</Label>
            <Input
              id="member-name"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <Input
              id="member-role"
              value={formState.role}
              onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value }))}
              placeholder="President, Advisor, etc."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-bio">Bio / Description</Label>
          <RichTextEditor
            id="member-bio"
            value={formState.bio}
            onChange={(bio) => setFormState((prev) => ({ ...prev, bio }))}
            placeholder="Short bio or description shown below this team member."
            minHeightClassName="min-h-[160px]"
          />
          {!isBioColumnAvailable && (
            <p className="text-xs text-amber-600">
              Temporary preview mode: bios are saved in this browser only until the Supabase migration is applied.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Section *</Label>
            <Select
              value={formState.section}
              onValueChange={(value: TeamSection) =>
                setFormState((prev) => ({
                  ...prev,
                  section: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="board">Board</SelectItem>
                <SelectItem value="advisory">Advisory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ImageUpload
          value={formState.photoUrl}
          onChange={(url) => setFormState((prev) => ({ ...prev, photoUrl: url }))}
          label="Profile Image"
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : editingId ? (
              'Update Team Member'
            ) : (
              'Add Team Member'
            )}
          </Button>

          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-8">
        <TeamSectionList title="Board" sectionMembers={boardMembers} />
        <TeamSectionList title="Advisory" sectionMembers={advisoryMembers} />
      </div>
    </div>
  );
}
