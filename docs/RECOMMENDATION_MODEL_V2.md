# Posty Recommendation Model v2 — AI-native, simple

**Status:** Approved direction (July 2026). Replaces the 11-category rule engine (`posty_recommendation_engine.md`, now archived as reference).

## Why we're changing it

The v1 engine was 11 hand-coded categories with priority scores, length caps, city-abbreviation tables, and profession conditionals. It was the thing blocking launch: lots of logic to maintain, brittle, and it steered the output too much. Meanwhile the model we call (Claude) is already better at naming than the rules are.

**New principle: the rules become a prompt, not code.** One well-written system prompt encodes the conventions as *guidance*, the model spins freely, and the only hard logic we keep in code is (1) input normalization, (2) availability checking, (3) output shaping.

## The flow

```
User input (1 form or 2 chat turns)
   │  full name + what it's for (personal / professional / fun) + optional free text
   ▼
Claude call #1 — generate ~30 candidate addresses as structured JSON
   │  { address: "andreas@keini.cke", base, tld, style, rationale }
   ▼
Bulk availability check (RDAP first, registrar API for price)  ← code, not AI
   ▼
Present available ones, grouped by style, as FULL email addresses
   │  "you@ak.io" — never bare domains
   ▼
Refine loop: "shorter" / "more fun" / "more like #3" → Claude call #2 with feedback
```

Two Claude calls max per round. No conversation state machine, no stages. If the user gives us only a name, we still produce a great list.

## What the prompt teaches (the conventions, as guidance not rules)

1. **Short wins.** The whole point is an address you're proud to say out loud. Target 6–12 chars total; flag anything longer as a trade-off, don't forbid it.
2. **Name + initials arithmetic.** The trick most people don't see on their own:
   - initials as domain: `andreas@akg.dk`, `you@ak.io`
   - single/double letter domains where TLD carries meaning: `andreas@k.email`-style (rarely available but magic when they are)
   - first name + surname-initial: `andreas@keinicke.com` → `ak@keinicke.dk`, `a@keinicke.dk`
   - syllable handles: `anke`, `keini` — 2+2 / first-syllable patterns
3. **Corporate IT conventions** (what a scaling company's IT department would pick — familiar and professional): `first@last.tld`, `first.last@`, `f.last@`, `flast@`. For personal use, `andreas@keinicke.dk` reads exactly like a company address — that's the "professional" feel.
4. **The left side is free.** Once you own the domain, the part before @ costs nothing — `hello@`, `hi@`, `me@`, first-name@. Present addresses, not domains, so users see this.
5. **TLD as part of the word.** `.dk` for Danes, `.io`/`.me`/`.email` as style; domain-hack spirit allowed but never at the cost of pronounceability.
6. **Fun is a valid category.** If the free-text gives us something (club, band, joke, hobby), let the model do one or two playful ones with a one-line rationale. No forced "magic moment" pipeline, no web-search stage at MVP — the model's own knowledge is enough for v1.
7. **ASCII normalization** for æ/ø/å/ü etc. stays in code (deterministic), and the prompt is told both forms.

## What we deliberately dropped from v1

- 11 categories with priorities → the model groups naturally; we just render its `style` field.
- City-abbreviation lookup tables → mentioned in the prompt as an idea; no table to maintain.
- Profession-length conditionals, "side hustle" gates → gone.
- Entity-research web-search stage → deferred; Claude's knowledge covers "Silkeborg IF = 1917" cases well enough for launch.
- The 6-stage questionnaire → collapsed to one small form + optional free text. Fewer questions, faster to the reveal.

## Output contract (what the frontend renders)

```json
{
  "groups": [
    {
      "style": "short-handle",
      "label": "Short & sharp",
      "items": [
        { "email": "you@ak.io", "domain": "ak.io", "available": true,
          "price_eur_year": 32, "note": "Your initials. Two keystrokes." }
      ]
    }
  ]
}
```

Rendering rules kept from v1: group same base across TLDs (`akg — .com / .io / .me`), availability badge on every item, always full addresses.

## Availability & pricing

- First pass: RDAP / DNS check in parallel for all ~30 candidates (free, fast, no key).
- Price + registerability: Cloudflare/Namecheap API only for the ones that survive.
- Cache per domain for 24h.

## Model & cost

- `claude-sonnet-5` for generation (fast, cheap, plenty creative). One call ≈ 1–2k tokens out.
- Availability filtering costs nothing AI-wise. Whole flow well under $0.01/user-round.
