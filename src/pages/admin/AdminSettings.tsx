import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { AdminFormSkeleton } from '@/components/shared/skeletons';
import {
  ZELLE_QR_SETTING_KEY,
  SPONSORSHIP_HERO_HEADING_KEY,
  SPONSORSHIP_HERO_SUBTITLE_KEY,
} from '@/lib/siteSettings';

const SETTING_KEYS = [
  ZELLE_QR_SETTING_KEY,
  SPONSORSHIP_HERO_HEADING_KEY,
  SPONSORSHIP_HERO_SUBTITLE_KEY,
];

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [zelleQrUrl, setZelleQrUrl] = useState('');
  const [sponsorHeading, setSponsorHeading] = useState('');
  const [sponsorSubtitle, setSponsorSubtitle] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', SETTING_KEYS);
        if (error) throw error;

        const byKey = new Map((data || []).map((row) => [row.key, row.value]));
        setZelleQrUrl(byKey.get(ZELLE_QR_SETTING_KEY) || '');
        setSponsorHeading(byKey.get(SPONSORSHIP_HERO_HEADING_KEY) || '');
        setSponsorSubtitle(byKey.get(SPONSORSHIP_HERO_SUBTITLE_KEY) || '');
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({ title: 'Error', description: 'Failed to load settings.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const rows = [
        { key: ZELLE_QR_SETTING_KEY, value: zelleQrUrl.trim() || null, updated_by: user?.id },
        { key: SPONSORSHIP_HERO_HEADING_KEY, value: sponsorHeading.trim() || null, updated_by: user?.id },
        { key: SPONSORSHIP_HERO_SUBTITLE_KEY, value: sponsorSubtitle.trim() || null, updated_by: user?.id },
      ];
      const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;

      // Refresh cached values so public pages pick up the changes immediately.
      SETTING_KEYS.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: ['site_setting', key] }),
      );

      toast({ title: 'Settings saved', description: 'Your changes are live.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <AdminFormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Site Settings</h1>
        <p className="text-muted-foreground text-sm">
          Global settings shared across the website.
        </p>
      </div>

      <section className="max-w-2xl space-y-4 rounded-lg border border-border/50 bg-card p-5 shadow-soft">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Zelle QR Code</h2>
          <p className="text-sm text-muted-foreground">
            This single QR code is used for every Zelle payment on the site — the Donate page and all
            sponsorship options. Upload a new image here to change it everywhere at once.
          </p>
        </div>

        <ImageUpload
          value={zelleQrUrl}
          onChange={setZelleQrUrl}
          label="Zelle QR Code Image"
        />
      </section>

      <section className="max-w-2xl space-y-4 rounded-lg border border-border/50 bg-card p-5 shadow-soft">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Sponsorship Page</h2>
          <p className="text-sm text-muted-foreground">
            The hero text at the top of the Sponsorship Options page. Leave a field blank to use the
            default. The option cards below the hero come from the project's sponsorship sections.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sponsor_heading">Heading</Label>
          <Input
            id="sponsor_heading"
            value={sponsorHeading}
            onChange={(e) => setSponsorHeading(e.target.value)}
            placeholder="Sponsorship Options"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sponsor_subtitle">Subtitle</Label>
          <Textarea
            id="sponsor_subtitle"
            value={sponsorSubtitle}
            onChange={(e) => setSponsorSubtitle(e.target.value)}
            rows={3}
            placeholder="Leave blank to auto-generate from the number of options."
          />
        </div>
      </section>

      <Button type="button" variant="hero" onClick={handleSave} disabled={isLoading}>
        {isLoading ? 'Saving...' : (<><Save size={18} /> Save Settings</>)}
      </Button>
    </div>
  );
}
