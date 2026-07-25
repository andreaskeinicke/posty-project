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

## Current implementation map

- Prompt + curation: `backend/services/aiRecommendationService.js`
- Case logging: `backend/services/caseLogService.js` → `recommendation_cases`
- Playbook (heuristics injected into prompt): `docs/CONCIERGE_PLAYBOOK.md`
- Unstuck/refine endpoint: planned — `POST /api/questionnaire/refine`
