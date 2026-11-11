# Automated setup after payment

What happens after a customer presses "Get this email" and pays. Code: `backend/fulfilment/`.

## Shape

A deterministic, idempotent workflow. No LLM touches money or DNS.

```
Stripe checkout.session.completed
  └─ fulfilment_orders row (one per checkout session, duplicate webhooks are no-ops)
      register_domain  check registry again → price guard → register with the customer as registrant
      dns_zone         make sure the Cloudflare zone exists
      mail_setup       provider setup; pauses for the one customer step
      mail_records     MX / SPF / DMARC / Google verification (+ DKIM when pasted)
      verify_mail      wait until public DNS shows the MX
      complete         "your address is ready"
```

Order states: `active`, `awaiting_customer`, `done`, `needs_human`, `refunded`.
Every transition writes a row to `fulfilment_events` (audit trail and the learning-loop signal feed).

- **Runner**: `startRunner()` in `server.js` ticks every 30 s and works due orders (retries with backoff, polls slow registrations and the forwarding verification click).
- **Lease**: an order is leased while worked, so the webhook hand-off and the runner never double-work it.
- **Crash safety**: `registration.requested_at` is saved before the registrar is called; on restart we poll the registrar's status instead of buying again. A registration we did not request is never handed to an order (`already_in_account`).

## Interfaces

- `Registrar` (`registrars/`): `check`, `register`, `getStatus`. `CloudflareRegistrar` (API beta: domain-check, registrations, registration-status) and `FakeRegistrar`.
- DNS provider (`dns/`): `ensureZone`, `upsertRecords` (idempotent, replaces a clashing SPF/DMARC instead of duplicating), Email Routing helpers. `CloudflareDns` and `FakeDns`.
- `MailBackend` (`mail/`): `provision`, `records`, `verify`.
  - `workspace` (launch): customer buys Google Workspace from Google, pastes the verification code on the Moving-in page, Posty writes all DNS. DKIM can be pasted later.
  - `forward` (entry tier): Cloudflare Email Routing catch-all into the customer's current inbox. Receive-only.

## Money safety

- Every order gets `dry_run` when it is created. Only a **livemode** Stripe event **and** `FULFILMENT_REGISTRAR=cloudflare` **and** `FULFILMENT_ALLOW_LIVE_REGISTRATION=true` make a live order. Everything else uses the fake registrar and fake DNS. Stripe test payments can never spend money or touch real DNS.
- Checkout (subscription mode) captures immediately, so "authorise, then capture" becomes: registry check before checkout (409 if taken), check again before registering, and refund + cancel if the name was taken in between (`FULFILMENT_AUTO_REFUND`, otherwise a person decides).
- Price guard: if the registry price is more than `FULFILMENT_PRICE_TOLERANCE_USD` above what the customer paid for the domain, stop.
- Premium names, extensions the API cannot register (e.g. `.dk` today), failed / blocked / action-required registrations all go to `needs_human`. Registrations are non-refundable, so we never auto-retry a failed one.

## Customer page

`/checkout/success?session_id=…` shows the live tracker when fulfilment is on, then rewrites the URL to `/order/<token>` (the link our emails use). API:

- `GET /api/fulfilment/orders/by-session/:sessionId` (202 while the webhook has not landed)
- `GET /api/fulfilment/orders/:token`
- `POST /api/fulfilment/orders/:token/workspace` `{ verification?, dkim? }` (strictly validated, rate limited)

## Ops (people and ops agents)

Bearer `FULFILMENT_ADMIN_TOKEN`:

- `GET /api/fulfilment/admin/orders?state=needs_human`
- `GET /api/fulfilment/admin/orders/:id/events`
- `POST /api/fulfilment/admin/orders/:id/retry` `{ step? }`

## Turning it on

1. Apply `backend/supabase/migrations/add_fulfilment_orders.sql`.
2. Set `FULFILMENT_ENABLED=true` (registrar stays `fake`): test-mode checkouts now run end to end as dry runs.
3. For real registrations: Cloudflare account needs a Registrar-write API token, a billing method, a default registrant contact and the accepted Registration Agreement. Then `FULFILMENT_REGISTRAR=cloudflare` and `FULFILMENT_ALLOW_LIVE_REGISTRATION=true`, with live Stripe keys.

## Known gaps

- Google Workspace phase 1 needs the customer to paste Google's verification code (Posty's Cloudflare account holds the DNS). Phase 2 (reseller API) removes this step.
- Renewals and registrant contact updates are not in the Cloudflare API beta yet; registrations default to `auto_renew=false`.
- Emails are still console-only until an email provider is wired into `emailService`.
