# Threads & Bridges — Implementation Plan

Client: **Ruchi** · Project: The Rith Initiative website (Vite + React + TS, shadcn/ui, Supabase)

This plan covers the four items relayed in `Changes.pdf`. The interview
editing/transcription work (item #4) is out of scope here — it is a separate,
one-time service engagement, not a website change.

## Source documents & how they were reconciled

Three documents were supplied and they **disagreed** with each other. Decisions
below were confirmed with the client-side owner (Armaan):

| Topic | `Changes.pdf` | `FILE_3380 conv.pdf` | `threads-bridges-sponsorship-options.html` | **Decision** |
|---|---|---|---|---|
| Payment method | Zelle QR | PayPal hosted buttons | `mailto:` links | **Show both** Zelle QR + PayPal per option |
| Which cards | — | 3 (incl. Sustainability) | 3 (incl. Sustainability) | **Drop Sustainability**, keep Exhibition + Oral History |
| Oral History tiers | $5,000 (new) / $2,500 / $1,000 / $250 | n/a | $250 / $1,000 / $2,500 | **Use Changes.pdf** (4 tiers, add $5,000) |
| Exhibition tiers | — | n/a | $1,000 / $350 | **Keep mockup values** |
| Admin manageability | Full CMS (add/edit/reorder/remove) | — | — | **Build the generic CMS now** |

**What `threads-bridges-sponsorship-options.html` is:** a standalone static
design mockup (inline CSS, `mailto:` CTAs, not wired into the app). It is a
layout/content reference only — the real feature is rebuilt in React using the
site's existing design tokens. It can be deleted once the feature ships.

### PayPal hosted-button IDs (from `FILE_3380 conv.pdf`)
- Exhibition Sponsorship: `6JVM4BZKSCGSU`
- Oral History Project: `4GFPQY2QTTJBQ`
- ~~Sustainability: `69G4W84JPMW8A`~~ (unused — card dropped)

Buttons are **per category, not per amount**. A static Zelle QR is likewise
per-category. So every tier row under a card points at the same payment target;
the donor enters the amount. This is inherent to both mechanisms.

### Outstanding asset
- **Zelle QR image** — not yet received (Ruchi to DM it). The subsection editor
  has an image-upload field for it; until it arrives the card shows a
  "QR coming soon" placeholder. PayPal works immediately.

---

## Item #1 — Sponsorship section + admin-managed project subsections (URGENT)

Sponsorships live as **subsections of the Threads & Bridges – Oral History
Project page**, not on the Donate page. Delivered as a **generic** subsection
system so Ruchi can add/edit/reorder/remove subsections on any project later.

### Data model (2 new tables)

**`project_subsections`** — a titled content block on a project page.
- `id` uuid pk
- `project_id` uuid → `blog_posts(id)` on delete cascade
- `title` text not null
- `anchor_slug` text — id used by the jump-nav (derived from title if blank)
- `section_type` text not null default `'rich_text'` — `'rich_text' | 'sponsorship'`
- `body` text — rich-text HTML (intro copy; used by both types)
- `payment_zelle_qr_url` text — sponsorship only (uploaded image)
- `payment_paypal_button_id` text — sponsorship only
- `payment_note` text — sponsorship only (e.g. the TheirStory note)
- `display_order` int not null default 0
- `is_published` boolean not null default true
- `created_by` uuid, `created_at`, `updated_at` timestamptz

**`project_subsection_tiers`** — a priced tier under a sponsorship subsection.
- `id` uuid pk
- `subsection_id` uuid → `project_subsections(id)` on delete cascade
- `name` text not null (e.g. "Presenting Sponsor")
- `description` text (e.g. "Full exhibition · 3–4 available")
- `amount` numeric not null (drives **highest→lowest** ordering)
- `display_order` int not null default 0 (tiebreak)
- `created_at`, `updated_at` timestamptz

**RLS** (mirrors existing `updates`/`project_interviews` tables):
- Public `SELECT` on published subsections (and their tiers).
- Full CRUD for `is_admin_or_moderator(auth.uid())`.
- `update_updated_at_column()` triggers on both tables.

Each **sponsorship card = one subsection** (its own payment target + tiers).
So the Oral History page gets two sponsorship subsections — "Exhibition
Sponsorship" and "Oral History Project" — plus, optionally, a `rich_text`
intro. Tiers always render sorted by `amount` DESC, satisfying the
highest→lowest rule automatically.

### Frontend — `src/pages/ProjectDetail.tsx`
- Fetch published subsections (+ tiers) for the project.
- **Jump-nav panel**: sticky side rail listing each subsection title as an
  anchor link (`#anchor_slug`), plus existing anchors (Overview / Interviews /
  Gallery) when present. Smooth-scrolls; hidden when there are no subsections.
  No new animation libraries (client asked for none) — native CSS
  `scroll-behavior` + existing `ScrollReveal`.
- **Renderers**:
  - `rich_text` → sanitized HTML block.
  - `sponsorship` → card matching the mockup, rebuilt with site tokens
    (`primary`/`card`/`border`): intro, tier table (amount DESC), Zelle QR image
    (or placeholder) + PayPal button (`/donate?hosted_button_id=…`), payment note.
- New components: `src/components/shared/ProjectSubsections.tsx` (nav + render),
  `SponsorshipCard.tsx`. Helpers in `src/lib/subsections.ts` (types, anchor
  slug, tier sort).

### Admin — `src/pages/admin/AdminPostForm.tsx` (the project editor)
Add a **"Page Subsections"** manager, mirroring the existing Interviews manager:
- Add / remove / reorder (Up/Down) subsections; per-subsection: title,
  type, published toggle, rich-text body.
- When type = `sponsorship`: Zelle QR upload (`ImageUpload` → `images` bucket),
  PayPal button ID, payment note, and a nested **tiers** editor
  (add/remove/reorder; name, description, amount).
- Save logic mirrors `saveInterviews`: tracks `deletedSubsectionIds` /
  `deletedTierIds`, upserts in order.

### Types
- Extend `src/integrations/supabase/types.ts` with Row/Insert/Update for both
  new tables so `.from('project_subsections')` typechecks.

### Seed
- Migration that, **if** the Oral History project exists (`project_slug`),
  inserts the two sponsorship subsections + tiers with the confirmed amounts and
  PayPal IDs, and a placeholder Zelle URL. Safe no-op if the project is absent.

---

## Item #2 — Reduce excessive white space (interior pages)

Tighten spacing on all pages **except the homepage** (client: homepage is fine).
Preserve the current look & feel; **no new animations**.

- Audit the spacing utilities driving vertical rhythm: `section-padding`,
  `container-*`, `SectionDivider`, and per-page `mb-*/mt-*/py-*` on About,
  Events, Projects, ProjectDetail, Blogs, Donate, Shop, Contact.
- Prefer reducing shared tokens (`section-padding` in `index.css`, and the
  `SectionDivider` margins) so the change is consistent and low-risk, then spot-fix
  outliers.
- Leave `Index.tsx` (homepage) untouched.
- Manual visual pass at desktop + mobile breakpoints.

Scoped as a follow-up pass after #1 lands.

---

## Item #3 — Expand the Events section (programs + registration)

Events are separate from Projects (`events` table). Add **programs** to an event
(e.g. Threads & Bridges Festival → "Meet the Panel", "Exhibition").

- **Data**: new `event_programs` table (event_id, title, poster_url,
  description, registration settings, display_order) + a registrations capture
  (reuse the contact-form pattern: a Supabase edge function like
  `send-contact-email`, or an `event_registrations` table).
- **Frontend**: on the flipped event card, add a **"View Program Details"**
  button above "View Media" → opens a large modal (shadcn `Dialog`) showing each
  program's poster, description, and its **own registration** form/link.
- **Admin**: manage programs within the event editor (`AdminEventForm`),
  mirroring the subsection/interview manager pattern.
- Registration submissions must be functional (stored + emailed), like Contact.

Scoped as a follow-up after #1 and #2.

---

## Sequencing
1. **#1 Sponsorship subsection CMS** (urgent) — in progress.
2. **#2 White-space compaction.**
3. **#3 Events programs + registration.**

## Open questions / dependencies
- Zelle QR image (blocks final payment wiring on #1 cards).
- #3: confirm whether registrations should email a fixed address, store in DB,
  or both; and what fields each registration needs.
- Delete `threads-bridges-sponsorship-options.html` from the repo root once #1 ships.
