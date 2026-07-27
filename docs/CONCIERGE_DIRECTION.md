# The Posty Concierge — how we find someone's email address

**Owner:** Claude (the AI side of Posty). Andreas owns brand/design; this document
is the direction for how the recommendation experience probes, suggests, guides,
and learns. It evolves — see "Learning loop".

## The stance

We are not a domain search box. We are a modern concierge: someone who knows the
conventions of good email addresses better than the customer does, asks only what
we need, shows a **few** confident options rather than a wall of choices, and
argues for them like a good shop assistant — with reasons the customer hadn't
thought of ("your surname is actually rarer than your first name — own it").

## What we need from the user (and why)

Priority-ordered. The first two are enough for a strong first round; everything
else sharpens it.

1. **Full name** — the raw material. Every convention (initials, syllables,
   surname-domains, f.last patterns) derives from it.
2. **What the address is for** (personal / work / side hustle / everything) —
   sets the register: `a.gustavsen@` vs `hey@`.
3. **Country (+ city if offered)** — unlocks country TLDs (a Dane with .dk reads
   local and trustworthy) and city handles (cph). Never require it.
4. **How they'll say it out loud** — the underrated one. An address is mostly
   shared verbally or typed on a phone. We should probe: "Will you mostly share
   this in person, on a CV, on a stage?" → weights brevity vs. formality.
5. **Texture** (interests, a club, a nickname, anything they volunteer) — fuel
   for the creative picks. Optional, one open question, never an interrogation.
6. **Taste calibration by reaction, not by question.** Don't ask "short or
   long?" — show a spread in round one (one ultra-short, one classic, one warm,
   one wildcard) and read what they click/refine. The flow is the questionnaire.

Rule of thumb: **≤6 questions before first results, ≤60 seconds.** Every extra
question must buy more suggestion quality than it costs in drop-off.

## Presentation: few, argued, expandable

- **First reveal: ~8 addresses max** (2 per style group), even when we generated
  30+. Choice overload kills conversion; a concierge curates.
- Every address carries a one-line argument (the `note`) — concrete, not generic.
  "Reads like a company address — because it is one" beats "professional option".
- **The concierge pick:** the model flags 1 address as its personal pick with a
  short pitch shown prominently. People want a recommendation, not a menu.
- "Show more options" reveals the rest, grouped. Nothing is thrown away.
- Prices always visible. No fake scarcity, ever.

## When they get stuck (unstuck mode)

If nothing lands ("none of these feel right"), we switch from menu to
conversation:
- Ask ONE diagnostic question: "What's off — too long, too playful, too plain?"
- Regenerate with that feedback + the rejected list (never repeat a rejected
  domain).
- This is where free thinking earns its keep: pull from the texture data,
  domain-hack angles, bilingual puns, year/number connections — things a rule
  engine could never do. It's allowed to show ONE risky idea per round.

## Learning loop (how I get better per case)

Data: every run is logged as a **case** — input profile, everything generated,
what was shown first vs. behind "more", what was clicked, what reached checkout,
what was bought (webhook closes the loop). Table: `recommendation_cases`.

Cadence:
1. **Per-session:** nothing automatic changes; the prompt is stable per version.
2. **Review pass** (weekly once there's traffic; manually triggered before
   that): I read the cases and answer — which styles get clicked vs. ignored?
   Where do users bail? Which notes/pitches correlate with checkout? What did
   people type in unstuck mode?
3. Distilled findings go into `docs/CONCIERGE_PLAYBOOK.md` as short numbered
   heuristics ("H7: Danes click .dk surname domains 3× more than .io — lead
   with them for DK users"). The system prompt includes the current playbook
   heuristics section verbatim, so learning ships as a prompt change with a
   version bump logged in each case row.
4. Keep tension deliberately: the playbook constrains, the wildcard slot stays
   free. One slot per reveal is always the model's unconstrained idea, so we
   never optimize ourselves into boring.

## Success metrics per case

- Reveal→click rate (did anything interest them?)
- Click→checkout rate (did the argument land?)
- Unstuck entries (how often round one missed)
- Time to first reveal (target <25s including availability checks)

## Founder direction 2026-07-27 (post test-purchase)

1. **Post-purchase = confidence.** The buyer must immediately understand they
   bought a *working email in their own Gmail*, not a domain. Handholding is
   the product: explicit journey (registered → address created → connected to
   YOUR Gmail), an email at every step, nothing for them to figure out alone.
   Success page copy is the stopgap; Phase 2 (Resend emails + status page) is
   the real thing.
2. **The finder is a conversation, not a form.** Chat interface: Posty asks,
   the user answers in bubbles (text + quick-reply chips), results appear
   in-conversation with the pitch as a Posty message, refinement happens by
   replying. The v2 chat prototype was right about the feel; v3 has the
   engine to back it.

## v3 architecture (2026-07-27, after founder case #1)

The lesson: the addresses people actually want most are **arithmetic on their
real name parts**, not creativity. So the pipeline splits:

1. **Classic ladder — code, instant** (`classicLadderService.js`): surname
   domains with first-name and single-letter prefixes (a@keinicke.com), then
   first-name domain, name combos, initials. Needs only name + country.
2. **Availability check** on the ladder immediately (RDAP, parallel).
3. **One fast AI call, thinking disabled** (`aiRecommendationService.js`):
   pick + pitch among *confirmed-available* classics, plus ≤5 creative extras
   from interests. Reasoning-off on sonnet-5 cut rounds from ~120s to ~4s.
4. Curation: pick first, classics by rung, ≤2 creative in the first reveal.

Speed target <25s: currently ~4-8s per round.

## Current implementation map

- Classic ladder: `backend/services/classicLadderService.js`
- AI pick/pitch/extras: `backend/services/aiRecommendationService.js`
- Case logging: `backend/services/caseLogService.js` → `recommendation_cases`
- Playbook (heuristics injected into prompt): `docs/CONCIERGE_PLAYBOOK.md` (v2)
- Unstuck/refine endpoint: planned — `POST /api/questionnaire/refine`

## Backlog (founder-parked, 2026-07-27)

- **Results presentation**: evolve beyond the flat list — bring back light
  category grouping inside the chat (classic / short / creative / family),
  collapse same-base TLD variants into one row with a TLD picker. Founder:
  "will need some work over time... various categories of recommendation."
- **Visual design**: current UI is functional but dated. Andreas owns the
  design pass (design-taste skill applies when that work starts); the chat
  experience and API contract stay stable underneath.
