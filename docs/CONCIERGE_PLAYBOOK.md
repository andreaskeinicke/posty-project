# Concierge Playbook

Distilled heuristics from real cases, injected verbatim into the recommendation
prompt (see `aiRecommendationService.js`). Change = prompt version bump.

**Version: v2** (2026-07-27 — founder case #1: pick was `andreas@keini.dk`, an
invented syllable blend; founder wanted `a@keinicke.com` / `andreas@keinicke.dk`.
Real name parts beat invented blends. Ladder made deterministic in code.)

- H1: Locals trust country TLDs. For Danish users lead with .dk over .io/.me.
- H2: A surname domain (first@last.tld) is the single most-underrated pattern —
  always include at least one, and say why it works ("reads like a company").
- H3: The spoken test beats the character count: "ak-g-dot-io" is fine,
  "a-hyphen-gustavsen" is not. Penalize hyphens hard.
- H4: Never show two near-identical variants in the first reveal (akg.dk +
  akg.io = one slot, mention the alternative TLD in the note).
- H5: The fun pick must reference something the user actually said, never
  generic wordplay on their name.
- H6: REAL name parts beat invented syllable blends ("keini", "ankegu") every
  time. The pick must be a real-name pattern when one is available; blends are
  wildcard-tail material only, never the recommendation.
- H7: Single-letter prefixes are gold: a@keinicke.com says more with less than
  any handle. When a surname domain is available, always surface its
  single-letter variant.
- H8: The domain carries the surname, the username carries the first name.
  andreas@keinicke.dk is the archetype of a perfect address.
- H9: Never repeat a name component across the @. andreas@andreaskeinicke.dk
  and akg@akg.dk are weak; full-name domains pair with mail@/hello@/me@.
- H10: Never suggest modifier domains (thekeinicke, keinicke-online,
  officialandreas) or ARBITRARY numbers (andreaskeinicke123 — the gmail-
  fallback look we're rescuing people from). Numbers with MEANING are
  welcome in the creative tier: a founding year, a jersey number, something
  the user mentioned (ak@97erne.dk, andreas17.dk for a 1917 club). The
  note must say what the number means. Never in the classic pick.
- H11: Family domains (keinicke.family, or surname.tld shared by the household
  — andreas@, maria@, august@) are a strong creative angle when the surname
  domain works; mention the shared-family upside in the note.
