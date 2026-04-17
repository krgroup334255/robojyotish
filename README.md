# RoboJyotish

AI-powered Hindu Vedic Jyotish readings — delivered as PDF in English, Tamil, or Bahasa Malaysia.

**Tech stack:** Next.js 14 · Supabase (auth + DB + storage) · Anthropic Claude · Swiss Ephemeris (`sweph`) · PDFKit · Stripe · Vercel

```
┌────────────────────────────────────────────────────────────────┐
│  Landing page (/,  /ta,  /ms)   — SEO-optimised                │
│           │                                                    │
│           ▼                                                    │
│  Intake form (/reading)                                        │
│           │  validate + create row in pending_payment          │
│           ▼                                                    │
│  Stripe Checkout (MYR RM19.90, FPX + GrabPay + cards)          │
│           │  webhook → status = paid                           │
│           ▼                                                    │
│  Processing page (/reading/[id]/processing)                    │
│           │  POST /api/process                                 │
│           │    1. compute Vedic chart (sweph, Lahiri)          │
│           │    2. Claude AI generates reading per language     │
│           │    3. status = pending_review                      │
│           ▼                                                    │
│  Admin back-office (/admin) — edit markdown + regenerate       │
│           │  approve → render PDF + upload to storage          │
│           ▼                                                    │
│  Customer dashboard (/dashboard) — email-OTP 2FA login         │
│    signed URL download for released PDFs                       │
└────────────────────────────────────────────────────────────────┘
```

---

## 1 · Prerequisites

- Node 18+ (tested on 20 & 24)
- A Supabase project
- An Anthropic API key
- A Google Cloud project with **Places API** + **Time Zone API** enabled
- (Optional, for launch) A Stripe Malaysia account

---

## 2 · Quick start

```bash
cp .env.example .env.local
# fill in your keys
npm install
npm run dev
# open http://localhost:3000
```

---

## 3 · Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. In **SQL editor**, run [`supabase/schema.sql`](supabase/schema.sql).
2a. Then run [`supabase/promo.sql`](supabase/promo.sql) to set up the
    **first-1000-free launch promo** (free_cap=1000, tracks unique emails).
3. In **Authentication → Providers**, enable **Email** and set *OTP* as the primary method.
   - Under **Authentication → Email Templates**, customise the OTP template.
4. In **Storage**, confirm a **private** bucket named `readings` exists (the SQL creates it).
5. Copy the **project URL**, **anon key**, and **service_role key** into `.env.local`.
6. **Bootstrap your admin account**:

   ```sql
   -- after signing in once via /login, run in SQL editor:
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```

---

## 4 · Google Places API

Enable **Places API** and **Time Zone API** in Google Cloud Console.
Restrict the key to your domain (and `localhost` for dev). Paste into
`NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`. The key never leaves the server — the
frontend calls `/api/places`, which proxies the request.

---

## 5 · Stripe setup (Malaysia)

When your Stripe account is ready:

1. In the Stripe dashboard, get your **test** (or live) keys.
2. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_PRICE_MYR_CENTS=1990
   ```
3. Add a webhook endpoint at `<SITE_URL>/api/webhook` listening to
   `checkout.session.completed`, and copy the signing secret to
   `STRIPE_WEBHOOK_SECRET`.

**Dev shortcut:** if no `STRIPE_SECRET_KEY` is set, `/api/checkout` auto-marks
the reading as paid and redirects straight to `/processing`. This lets you test
the full pipeline end-to-end without Stripe.

---

## 6 · Anthropic Claude

Set `ANTHROPIC_API_KEY` in `.env.local`. The default model is
`claude-opus-4-5-20251101`. Override with `ANTHROPIC_MODEL` if needed.

---

## 7 · Swiss Ephemeris

We use the `sweph` npm package (prebuilt native bindings).
For more accurate computations (beyond Moshier fallback), place `.se1` files
from [https://www.astro.com/ftp/swisseph/ephe/](https://www.astro.com/ftp/swisseph/ephe/)
into the `ephe/` folder.

The chart library lives in [`src/lib/jyotish/chart.ts`](src/lib/jyotish/chart.ts)
and computes: Lagna, planetary longitudes (sidereal, Lahiri ayanamsa), Moon
nakshatra, Vimshottari mahadasha + antardasha, and a 120-year timeline.

---

## 8 · PDF generation

PDFs are rendered with PDFKit using bundled Noto Serif + Noto Sans Tamil fonts
(see `src/lib/pdf/fonts/`). Tamil readings automatically use the Tamil font.
For Malay/English, Noto Serif is used.

---

## 9 · Admin back-office

Once your account has `is_admin = true`:

- `/admin` — queue view: pending review / in progress / released / failed
- `/admin/[id]` — edit each language's markdown, regenerate via Claude, approve
  & release (renders + uploads PDF, sets status to `released`).
- Released readings show up in the customer's `/dashboard` with download links.

---

## 10 · Deploy to Vercel

```bash
npm i -g vercel
vercel link
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ...repeat for every var in .env.example
vercel --prod
```

Then point `robojyotish.com` DNS at Vercel.

---

## 11 · SEO checklist

Built-in:

- Open Graph + Twitter Card metadata
- JSON-LD Organization, Product, FAQPage
- `/sitemap.xml` + `/robots.txt`
- `hreflang` between `/`, `/ta`, `/ms`
- Keyword-rich copy: "AI jyotish reading", "Vedic astrology Malaysia",
  "Tamil jyotish", "Kundli Malaysia", "robo jyotish", etc.

Add after launch:

- Google Search Console — submit sitemap
- Google Business Profile (if you operate from a physical location)
- Backlinks from Malaysian temple sites, r/AskIndia, local astrologer forums
- Instagram / TikTok content in Tamil + Malay

---

## 12 · Directory map

```
src/
  app/
    page.tsx                 # English landing (SEO)
    ta/page.tsx              # Tamil landing
    ms/page.tsx              # Bahasa Malaysia landing
    reading/                 # intake form & processing
    dashboard/               # signed-in user's readings
    admin/                   # admin queue + per-reading editor
    login/                   # email OTP
    api/
      reading/               # create reading, fetch status
      checkout/              # Stripe session
      webhook/               # Stripe event receiver
      process/               # runs chart + AI pipeline
      admin/release/         # approve + render PDF + upload
      admin/reject/          # mark rejected
      admin/regenerate/      # re-call Claude for a language
      places/                # Google Places proxy
      download/              # signed-URL redirector
  components/
    ui/                      # Button, Input, Label, Card, Progress
    forms/                   # ReadingForm, CityAutocomplete
    admin/                   # AdminReviewEditor
  lib/
    jyotish/chart.ts         # Swiss Ephemeris → Vedic chart
    claude/reading.ts        # Anthropic prompt + client
    pdf/generate.ts          # PDFKit renderer
    pdf/fonts/               # Noto Serif + Noto Sans Tamil
    supabase/{client,server,admin}.ts
    stripe/client.ts
    utils.ts
supabase/schema.sql          # tables, RLS, triggers, bucket
ephe/                        # (optional) Swiss Ephemeris SE1 files
```

---

## 13 · Open items (TODO before launch)

- [ ] Create an actual `/public/og-image.png` (1200×630)
- [ ] Add `/public/logo.png`
- [ ] Write `/terms`, `/privacy`, `/contact` pages
- [ ] Verify Stripe Malaysia live keys work
- [ ] Add basic error monitoring (Sentry)
- [ ] Rate-limit `/api/reading` and `/api/places`
