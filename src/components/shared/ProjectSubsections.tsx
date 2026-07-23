import { ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeRichText } from "@/lib/richText";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import { ZELLE_QR_SETTING_KEY } from "@/lib/siteSettings";
import {
  ProjectSubsection,
  formatTierAmount,
  getPaypalDonateUrl,
  getSubsectionAnchor,
  sortTiersDesc,
} from "@/lib/subsections";

export interface SubsectionNavItem {
  id: string;
  label: string;
}

const richTextClass =
  "text-muted-foreground leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6";

export function SponsorshipCard({
  subsection,
  zelleQrUrl,
}: {
  subsection: ProjectSubsection;
  zelleQrUrl: string | null;
}) {
  const tiers = sortTiersDesc(subsection.tiers);
  const paypalUrl = subsection.payment_paypal_button_id
    ? getPaypalDonateUrl(subsection.payment_paypal_button_id)
    : null;

  return (
    <div className="rounded-lg border border-border/50 bg-card p-6 shadow-soft sm:p-8">
      <h3 className="font-heading text-2xl font-semibold text-foreground">{subsection.title}</h3>
      {subsection.body && (
        <div
          className={`mt-3 ${richTextClass}`}
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(subsection.body) }}
        />
      )}

      {tiers.length > 0 && (
        <div className="mt-6 border-t border-border/60">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-baseline justify-between gap-4 border-b border-border/60 py-4"
            >
              <div>
                <p className="font-medium text-foreground">{tier.name}</p>
                {tier.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{tier.description}</p>
                )}
              </div>
              <p className="whitespace-nowrap font-heading text-xl font-semibold text-foreground">
                {formatTierAmount(tier.amount)}
              </p>
            </div>
          ))}
        </div>
      )}

      {subsection.payment_note && (
        <p className="mt-4 rounded-md bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          {subsection.payment_note}
        </p>
      )}

      {/* Payment options: Zelle QR + PayPal */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-col items-center gap-2 rounded-md border border-border/50 bg-secondary/20 p-4 text-center">
          {zelleQrUrl ? (
            <img
              src={zelleQrUrl}
              alt={`Zelle QR code to sponsor ${subsection.title}`}
              className="h-40 w-40 rounded-md bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground">
              <QrCode className="h-8 w-8 opacity-60" />
              <span className="px-3 text-xs">Zelle QR coming soon</span>
            </div>
          )}
          <span className="text-sm font-medium text-foreground">Pay with Zelle</span>
          <span className="text-xs text-muted-foreground">Scan the code and enter your chosen amount.</span>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          {paypalUrl ? (
            <>
              <Button variant="hero" size="lg" asChild className="w-full max-w-[240px]">
                <a href={paypalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                  Sponsor with PayPal
                  <ExternalLink size={16} />
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">Secure payment powered by PayPal.</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">PayPal option coming soon.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SubsectionBlock({
  subsection,
  zelleQrUrl,
}: {
  subsection: ProjectSubsection;
  zelleQrUrl: string | null;
}) {
  const anchor = getSubsectionAnchor(subsection);
  return (
    <div id={anchor} className="scroll-mt-28">
      {subsection.section_type === "sponsorship" ? (
        <SponsorshipCard subsection={subsection} zelleQrUrl={zelleQrUrl} />
      ) : (
        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground">{subsection.title}</h2>
          {subsection.body && (
            <div
              className={`mt-3 ${richTextClass}`}
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(subsection.body) }}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ProjectSubsectionsProps {
  subsections: ProjectSubsection[];
  navItems: SubsectionNavItem[];
  /** Rendered in the right column above the subsections (e.g. the project overview). */
  leadingContent?: React.ReactNode;
}

export function ProjectSubsections({ subsections, navItems, leadingContent }: ProjectSubsectionsProps) {
  const { data: zelleQrUrl } = useSiteSetting(ZELLE_QR_SETTING_KEY);

  if (subsections.length === 0 && !leadingContent) return null;

  const showNav = navItems.length > 1;

  const handleJump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    // Keep the URL hash in sync without a hard jump.
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className={showNav ? "grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]" : ""}>
      {showNav && (
        <aside className="lg:sticky lg:top-28 lg:h-max">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            On this page
          </p>
          <nav className="flex flex-col gap-1 border-l border-border/60">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => handleJump(event, item.id)}
                className="-ml-px border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
      )}

      <div className="min-w-0 space-y-10">
        {leadingContent}
        {subsections.map((subsection) => (
          <SubsectionBlock key={subsection.id} subsection={subsection} zelleQrUrl={zelleQrUrl ?? null} />
        ))}
      </div>
    </div>
  );
}
