import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { AdminFormSkeleton } from '@/components/shared/skeletons';
import { ZELLE_QR_SETTING_KEY } from '@/lib/siteSettings';

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [zelleQrUrl, setZelleQrUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', ZELLE_QR_SETTING_KEY)
          .maybeSingle();
        if (error) throw error;
        setZelleQrUrl(data?.value || '');
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
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { key: ZELLE_QR_SETTING_KEY, value: zelleQrUrl || null, updated_by: user?.id },
          { onConflict: 'key' },
        );
      if (error) throw error;

      // Refresh the cached value so public pages pick up the new QR immediately.
      queryClient.invalidateQueries({ queryKey: ['site_setting', ZELLE_QR_SETTING_KEY] });

      toast({ title: 'Settings saved', description: 'The Zelle QR code has been updated.' });
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

        <Button type="button" variant="hero" onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : (<><Save size={18} /> Save Settings</>)}
        </Button>
      </section>
    </div>
  );
}
