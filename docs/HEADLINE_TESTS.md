# Headline tests on the home page

The home page h1 is an ongoing A/B test. The rest of the hero stays as designed.

## How it works

- `frontend/src/landing/headlines.json` is the only place headlines live. Each variant has an `id`, a `headline` and a `status`:
  - `active`: in the test, shown to an equal share of visitors.
  - `queued`: the next challenger, not shown yet.
  - `winner`: shown to everyone; the test is paused while a winner is set.
  - `retired`: no longer shown; kept so old results stay readable.
- Each page load picks one active headline at random (`frontend/src/landing/experiment.js`). No cookie, no localStorage, no visitor id. A returning visitor can see a different headline; that is the price of needing no cookie banner.
- Counted once per page load, only after the home page was seen: `view`, `search` (typed a name and pressed Find), `get` (pressed "Get this email"), `checkout` (Stripe checkout opened).
- Not counted: bots and headless browsers, the demo, and previews via `/?headline=c`.
- The server stores only experiment, variant, event and time in `experiment_events` (migration `backend/supabase/migrations/add_experiment_events.sql`). Until that table exists, counts are kept in memory and reset on each deploy.

## Reading results

`GET /api/experiments/results?format=md` with `Authorization: Bearer $EXPERIMENTS_TOKEN` (Railway variable). It returns 404 when the token is missing or wrong. Without `format=md` it returns JSON.

The primary metric is `search` per `view`, because the headline's job is to get people to search. "Chance best" is the Bayesian probability that a headline has the highest search rate (Beta(1,1) prior, 20,000 draws).

## Rotation rules (what the agent does each week)

1. If the verdict is `retire: x`, set x to `retired` and promote the first `queued` variant to `active`.
2. If the verdict is `winner: x`, start a new experiment. Bump `experiment` (e.g. `home-headline-2`), keep x `active` as the new control, retire the others and promote up to two `queued` challengers. Write down the old result first.
3. Otherwise change nothing. Do not stop early on a lead before every headline has `minViewsPerVariant` views.
4. Keep 3 or 4 active headlines at most. At low traffic, more arms means a longer wait.
5. New candidates must follow the design rules: plain Funnel Sans, no italic accent words, at most 60 characters, and no promise of free Gmail "Send as". Wording comes from the Paper design thread, and Andreas has the final say on any new wording.

A change to `headlines.json` is a normal PR. Merging it deploys.

## Log

| Experiment | Dates | Result |
|---|---|---|
| home-headline-1 | from 2026-11-12 | running: a "Get your dream email today." (control), b "Email with your name on it.", c "Still on @hotmail.com? Time for an upgrade.", d "The modern version of your email." |
