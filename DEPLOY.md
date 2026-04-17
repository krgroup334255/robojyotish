# Deploy RoboJyotish to Vercel

Your project is built for Vercel (Next.js 14). Deployment takes ~5 minutes.

## 1 · Prepare

Commit everything first:

```bash
cd ~/jyotish-reading
git add -A
git status                        # review: ensure .env.local is NOT listed
git commit -m "Launch promo: first 1000 free + marketing UI"
```

If you haven't pushed this repo to GitHub yet:

```bash
# Create a new empty repo on github.com (don't initialise with README),
# copy the URL, then:
git remote add origin https://github.com/YOUR_USER/robojyotish.git
git branch -M main
git push -u origin main
```

## 2 · Run Supabase promo SQL

Before deploy, in Supabase SQL editor run:

```sql
-- paste contents of supabase/promo.sql
```

This adds `promo_config`, `promo_claims`, the `claim_free_slot()` RPC, and
marks `readings.is_free`.

## 3 · Deploy with Vercel CLI (one-off)

```bash
cd ~/jyotish-reading
npx vercel login      # opens browser; sign in with GitHub
npx vercel link       # links the directory to a new Vercel project
npx vercel            # first preview deploy
```

## 4 · Add environment variables

Either through Vercel dashboard (Project → Settings → Environment Variables)
or via CLI:

```bash
npx vercel env add NEXT_PUBLIC_SITE_URL            # https://robojyotish.com
npx vercel env add NEXT_PUBLIC_SITE_NAME           # RoboJyotish
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add ANTHROPIC_API_KEY
npx vercel env add ANTHROPIC_MODEL                 # claude-opus-4-5-20251101
npx vercel env add STRIPE_PRICE_MYR_CENTS          # 1990
npx vercel env add NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

# Optional, for real payments later:
# npx vercel env add STRIPE_SECRET_KEY
# npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# npx vercel env add STRIPE_WEBHOOK_SECRET
```

For each var, pick **Production, Preview, Development**.

## 5 · Production deploy

```bash
npx vercel --prod
```

You'll get a URL like `https://robojyotish.vercel.app`.

## 6 · Connect your domain

In Vercel dashboard → Project → Settings → Domains → Add `robojyotish.com`.
Vercel gives you 2 DNS records (A + CNAME). Add them in your domain registrar.
Propagation: usually 10-30 minutes.

## 7 · Post-deploy checklist

- [ ] Visit https://robojyotish.com and verify:
  - Launch banner shows at top
  - "FREE" CTA instead of "RM19.90" in hero
  - Promo counter shows "0 of 1000 claimed"
  - `/ta` and `/ms` load with localized banners
- [ ] `/login` — email OTP works in production
- [ ] `/reading` — redirects to login if not signed in
- [ ] Create test reading end-to-end — verify PDF downloads
- [ ] `/admin` — admin bootstrap works (run the `update profiles...` SQL)
- [ ] Share a link on WhatsApp, confirm OG image preview renders

## 8 · Ongoing deploys

After the first push, any `git push` to `main` auto-deploys:

```bash
git add -A
git commit -m "tweak"
git push
```

## 9 · Turning the promo off

When you reach 1000 free signups (or want to end early):

```sql
-- In Supabase SQL editor:
update public.promo_config set is_active = false where id = 1;
```

This instantly flips the UI back to paid mode. To change the cap:

```sql
update public.promo_config set free_cap = 2000 where id = 1;
```

## 10 · Adding Stripe when you're ready

1. Create a Stripe Malaysia account at https://dashboard.stripe.com/register
2. Get test/live keys from Developers → API keys
3. Add webhook in Stripe dashboard:
   - Endpoint: `https://robojyotish.com/api/webhook`
   - Event: `checkout.session.completed`
   - Copy the signing secret
4. Add these env vars in Vercel and redeploy:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`

The checkout logic auto-detects real Stripe keys (starts with `sk_`,
not `placeholder`) and uses them instead of the dev bypass. Free launch
slots still get priority.

## 11 · Marketing checklist for launch day

- [ ] Google Search Console → add property, submit `/sitemap.xml`
- [ ] Google Business Profile (if you have a physical address)
- [ ] WhatsApp Business broadcast list seeded
- [ ] Share on relevant communities: r/malaysia, r/singapore, r/AskIndia,
      Tamil Facebook groups, Hindu temple WhatsApp groups
- [ ] Post a case-study thread on X / Instagram with a sample PDF
- [ ] Upload a demo reel to TikTok / Instagram Reels (Tamil and English)
