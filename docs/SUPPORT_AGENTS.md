# Support and setup-coach agents (v1)

Two of the four v1 agents from the operating model: **Support** (answers customers) and
**Setup coach** (checks a customer's setup and drafts nudges for stalled orders). Code in
`backend/support/`, routes in `backend/routes/support.js`, the chat box in
`frontend/src/landing/SupportChat.js`.

## Off by default

Nothing changes in production until `SUPPORT_AGENT_ENABLED=true`. While it is off, every
`/api/support/*` route except `/status` answers 404 and the chat box does not render.

| Variable | Default | What it does |
|---|---|---|
| `SUPPORT_AGENT_ENABLED` | off | Turns on the endpoint and the chat box |
| `SUPPORT_MODEL` | `claude-sonnet-5-5` | Model for answers. Uses the existing `ANTHROPIC_API_KEY` |
| `SUPPORT_ADMIN_TOKEN` | unset | Bearer token for the ops endpoints. Unset = ops API off |
| `SUPPORT_ESCALATION_EMAIL` | `hello@posty.club` | Shown to customers without an order link |

Without `ANTHROPIC_API_KEY`, or when the API fails, the agent answers from the help content
with plain keyword search and says when it does not know.

Before switching it on: apply `backend/supabase/migrations/add_support_signals.sql`. Without
the tables the agent still answers, but signals and escalations are only logged to the console.

## What a customer message goes through

1. **Code-level triage** (`trust.js`). Refunds, billing disputes, account access, domain
   ownership or transfer codes, changes to the contact email or phone, and legal or abuse
   reports are escalated to Andreas with a fixed reply. The model is not called.
2. **Claude answers**, grounded in the FAQ (the same `faq.json` the Questions page renders)
   plus setup articles in `knowledge.js`. Tools, all read-only:
   - `search_help`: keyword search over the help content
   - `check_setup`: public DNS lookups (MX, SPF, DKIM, DMARC, Google verification) for the
     order's domain. Only offered when the chat came from the order's Moving in page
   - `escalate_to_person`: hand over to Andreas
3. **Reply is redacted** and the turn is logged as a support signal.

## Small automatic refunds

Andreas chose the recommended rule on 2026-11-12 (`refunds.js`). A plain refund request is
refunded in code, without the model, only when all of these hold:

- the customer asks from their own order page (the private order link)
- the order total (domain plus first Posty month) is at most `SUPPORT_AUTO_REFUND_MAX_USD`
  (default $10; set 0 to turn it off)
- the domain is not registered yet, the order is open and under 14 days old
- fewer than `SUPPORT_AUTO_REFUND_DAILY_CAP` automatic refunds today (default 5)

The order is read again right before refunding, Stripe's idempotency key stops a double
payout, and test orders never move money. Andreas gets a `refund_auto` escalation note for
each one. Disputes, chargebacks, "charged twice" and everything over the limit still go to him.

## Trust rules against account takeover

- An identity claim in chat proves nothing. The only proof is the order's private status link
  (the token in our emails). Without it the agent knows nothing about any order.
- With it, the model sees the public order view only: domain, address, tier and step states.
  Never the buyer's email, registrant details, Stripe ids or internal errors.
- The model has no tool that moves money (small refunds above happen in code, not by the
  model), writes DNS, changes contact details, gives transfer
  codes or grants access. Those requests are escalated in code before the model sees them.
- Keys, tokens, card numbers and passwords are redacted before anything is stored or sent to
  the model, and stripped from replies. Email addresses are replaced with `[email]` in stored
  signals and escalations.
- Messages that try to change the rules ("ignore previous instructions") are flagged in the
  signal log and counted in the weekly report.
- Rate limits: 30 chat turns and 20 setup checks per 10 minutes per IP.

## Learning loop

Every turn, escalation and setup check writes a row to `support_signals` with a topic
(google_signup, dns, dkim, spam_folder, billing, ownership, ...), whether a person was
needed, the order step and the redacted words (max 500 characters). Text is dropped after
12 months (SQL in the migration).

`GET /api/support/admin/weekly?format=md` (with `Authorization: Bearer $SUPPORT_ADMIN_TOKEN`)
returns the week's top five clusters with counts, escalations, sample questions and a
proposed fix type, plus the share of turns answered without a person. Feed this into the
weekly review; the heartbeat routine can fetch it.

## Setup coach

- `GET /api/support/orders/:token/diagnostics`: read-only DNS checks for that order, with a
  plain-language next step. Skipped for test-mode orders (their DNS is fake).
- `GET /api/support/admin/stalled`: orders waiting on the customer, with a drafted nudge on
  the 1 hour, 24 hours and 3 days schedule. **Drafts only. Nothing is sent.** Sending needs an
  email provider and Andreas's okay.
- `GET /api/support/admin/escalations`: open escalations.

## Not in this version

- Emailing customers or Andreas (no provider is wired; everything is stored and logged).
- Support by email at support@posty.club (same agent, needs an inbound mail hook).
- Free months as a goodwill gesture (refunds below are the only automatic money action).
- An eval set of 20 cases per agent before go-live. The tests cover the trust rules; a
  real-model eval run is the next step.
