# Posty — Launch Plan (July 2026)

**Mission:** "Get a Gmail, but in your own name. We set everything up for you."
Live domain: **posty.club** (owned, Namecheap, expires 2026-11-28, DNS on Cloudflare).

## Where we are (verified 2026-07-24)

Working end-to-end locally: landing → 6-step questionnaire → **AI recommendation
engine v2** (single Claude call, see `docs/RECOMMENDATION_MODEL_V2.md`) → RDAP
availability check → results grouped by style with prices → guest Stripe checkout
(sandbox, $5/mo + domain fee).

Infrastructure in place: GitHub `andreaskeinicke/posty-project` (main),
Vercel project `posty-project` (GitHub-linked), Supabase "Posty Project"
(schema applied, RLS on, restored & healthy), Stripe sandbox with product+price,
Cloudflare account, Namecheap sandbox API, Anthropic API.

## Phase 1 — Deployed staging ✅ DONE 2026-07-27

Live at **https://posty.club** — single host on Railway (project `posty`,
Hobby plan): Express serves the built frontend + API on one origin.
- 26 env vars set on Railway; NODE_ENV=production
- posty.club CNAME → bysv9gi7.up.railway.app (Cloudflare, DNS-only) + verify TXT;
  old Namecheap parking A record removed
- Stripe test webhook `we_1Txa7w7BIvz8pzUVqzDYF3Fn` → posty.club/api/checkout/webhook,
  signing secret on Railway
- `namecheap` npm package removed (native node-expat broke cloud builds);
  namecheapService optional/disabled pending Phase 2 HTTP rewrite
- Verified in prod: health, SPA routes, full AI round (pick+pitch+curation)
- Open: SUPABASE_SERVICE_ROLE_KEY rotated → case logging + webhook DB writes
  disabled until Andreas updates .env, then set on Railway
- Cleanup: Vercel projects `posty-project` + `posty-project-ybl6` now redundant
  (still auto-deploy from GitHub) — delete in Vercel dashboard

## Phase 2 — Fulfillment (the "we do everything for you" promise)

1. **Wire registration to payment:** call `domainRegistrationService` from
   `checkout.session.completed` behind an `AUTO_REGISTER` env flag.
   Start in **concierge mode**: flag off, we get an email/notification per
   order and trigger registration manually. Flip on once trusted.
2. **Real email delivery:** swap console mode in `emailService` for Resend
   (free tier). Emails: verification, welcome, Gmail setup guide.
3. **Namecheap production API** (needs account approval: $50 balance or
   20 domains) — or register the first orders manually via Cloudflare/Namecheap
   dashboard. Concierge mode makes this a non-blocker.
4. **Gmail integration guide:** the core deliverable. Cloudflare Email Routing
   (receive → forwards to Gmail) + Gmail "Send mail as" via SMTP. Write the
   handheld step-by-step with screenshots; automate what's automatable.

## Phase 3 — Go live

1. Stripe live mode: real product/price, live keys, live webhook.
2. **Dogfood purchase #1:** Andreas buys his own address through the live flow.
   (Candidates from today's test: `andreas@keinicke.dk`, `hey@keini.io` —
   both verified available.)
3. Landing copy pass — the pitch is personal: "Still sharing a hotmail address
   in 2026? Get the email you actually want. Keep Gmail."
4. Ship. Tell people.

## Deliberately later

- Pretty brand/design (current UI is fine to launch)
- Google Workspace upsell (margin opportunity, noted on landing later)
- Business tier: multiple addresses per domain, team conventions
- Live registrar pricing (static TLD price table is fine for MVP)
- Conversational refine loop on results ("shorter", "more fun")

## Known gaps / debt

- Post-payment registration not yet triggered automatically (Phase 2.1)
- Emails console-only (Phase 2.2)
- `namecheap` npm package is v0.0.1 — validate against sandbox before real orders
- Dead frontend files: `AppRouter.js`, `ChatInterface.js`, `DomainResults.js`,
  `QuestionnaireFlow.js`, `VerifyEmail.js`, `DomainVerificationStatus.js`
  (unreferenced; delete in a cleanup pass)
- `claudeService.js` (chat flow) still targets an ancient model — unused by the
  main flow; update or remove with the chat interface decision
- Old strategy docs (`posty_recommendation_engine.md`, `posty_v06.html`,
  root-level setup MDs) should move to `docs/archive/`

## Operating loops (once deployed)

- **Daily smoke test** (scheduled routine): hit `/health` + run one synthetic
  questionnaire round; alert if the AI call or RDAP path breaks.
- **Order watch:** notify on new `domains` rows with status `pending_purchase`
  (concierge fulfillment trigger).
- **Weekly:** Stripe failed-webhook check, Supabase advisors, domain expiry watch.
