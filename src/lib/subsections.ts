export type SubsectionType = "rich_text" | "sponsorship";

export interface SubsectionTier {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  display_order: number;
}

export interface ProjectSubsection {
  id: string;
  title: string;
  anchor_slug: string | null;
  section_type: SubsectionType;
  body: string | null;
  payment_zelle_qr_url: string | null;
  payment_paypal_button_id: string | null;
  payment_note: string | null;
  display_order: number;
  is_published: boolean;
  tiers: SubsectionTier[];
}

/** Turn a title into a stable, URL-safe anchor id for the jump-nav. */
export const createAnchorSlug = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
};

export const getSubsectionAnchor = (subsection: Pick<ProjectSubsection, "anchor_slug" | "title">) =>
  subsection.anchor_slug?.trim() || createAnchorSlug(subsection.title);

/** Sponsorship tiers always render highest amount first (client requirement). */
export const sortTiersDesc = <T extends Pick<SubsectionTier, "amount" | "display_order">>(tiers: T[]) =>
  [...tiers].sort((a, b) => {
    const amountDiff = (b.amount ?? 0) - (a.amount ?? 0);
    if (amountDiff !== 0) return amountDiff;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

/** Whole-dollar amounts show no decimals; fractional amounts keep cents. */
export const formatTierAmount = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const getPaypalDonateUrl = (buttonId: string) =>
  `https://www.paypal.com/donate?hosted_button_id=${encodeURIComponent(buttonId)}`;
