# Concierge Playbook

Distilled heuristics from real cases, injected verbatim into the recommendation
prompt (see `aiRecommendationService.js`). Change = prompt version bump.

**Version: v1** (2026-07-25 — pre-traffic seed heuristics, from founder taste)

- H1: Locals trust country TLDs. For Danish users lead with .dk over .io/.me.
- H2: A surname domain (first@last.tld) is the single most-underrated pattern —
  always include at least one, and say why it works ("reads like a company").
- H3: The spoken test beats the character count: "ak-g-dot-io" is fine,
  "a-hyphen-gustavsen" is not. Penalize hyphens hard.
- H4: Never show two near-identical variants in the first reveal (akg.dk +
  akg.io = one slot, mention the alternative TLD in the note).
- H5: The fun pick must reference something the user actually said, never
  generic wordplay on their name.
