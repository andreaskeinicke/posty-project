import React, { useState } from 'react';
import { money, TLD_PRICE } from './names';
import { toggleSaved, useStore, clearRecent } from './store';
import { Address, AGENT_PROMPT, Closing, CopyButton, Link, PageHead, Sheet, useMeta, POSTY_MONTHLY, WORKSPACE_FROM, SITE } from './ui';

/* ---------- How it works ---------- */

export function HowItWorks() {
  useMeta('How Posty works · From your name to your inbox', 'What happens after you press Get this email: domain registration, Google Workspace, DNS records and spam protection, all set up for you in about five minutes.', '/how-it-works');
  const steps = [
    ['Search', 'You type your name. We generate addresses in a few styles and check every domain live. You only see ones you can buy.', 'You'],
    ['Pick and pay', 'Choose an address and press Get this email. Pay for the domain and your first month with Stripe.', 'You'],
    ['Register', 'We register the domain in your name at the registrar, at cost, with privacy on your contact details where the ending allows it.', 'Posty'],
    ['Sign in with Google', 'Google asks you to create your Workspace account for the new address. It takes one sign-in.', 'You'],
    ['Records and protection', 'We add Google\'s verification, MX, SPF, DKIM and DMARC records so mail arrives, sends and isn\'t spoofed.', 'Posty'],
    ['Moved in', 'Open Gmail on any device and sign in as your new address. We can forward your old inbox while people switch.', 'You']
  ];
  return (
    <>
      <PageHead kicker="How it works" title={<>From “hi” to <em className="s">hello@you.com</em></>} sub="Six short steps. You do three of them, and none of yours involve settings or records." />
      <section className="band tight">
        <div className="wrap">
          <ol className="timeline">
            {steps.map(([t, d, who], i) => (
              <li key={t} className={who === 'Posty' ? 'us' : ''}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <div><h3>{t} <span className={'who ' + (who === 'Posty' ? 'who-us' : '')}>{who === 'Posty' ? 'Posty does this' : 'You do this'}</span></h3><p>{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="band paper">
        <div className="wrap split2">
          <div className="head">
            <span className="kicker">Under the hood</span>
            <h2>The records you'll <em className="s">never have to touch.</em></h2>
            <p className="sub">These are the settings most people give up on. We write them through the registrar's API and check them until Google says the domain is verified.</p>
          </div>
          <div className="records" role="table" aria-label="DNS records Posty sets up">
            <div role="row" className="rh"><span role="columnheader">Type</span><span role="columnheader">What it does</span></div>
            <div role="row"><span role="cell" className="mono">TXT</span><span role="cell">Proves to Google that the domain is yours</span></div>
            <div role="row"><span role="cell" className="mono">MX</span><span role="cell">Sends incoming mail to your Gmail inbox</span></div>
            <div role="row"><span role="cell" className="mono">SPF</span><span role="cell">Lists who may send mail as your domain</span></div>
            <div role="row"><span role="cell" className="mono">DKIM</span><span role="cell">Signs your mail so it lands in inboxes, not spam</span></div>
            <div role="row"><span role="cell" className="mono">DMARC</span><span role="cell">Tells other servers to reject fakes of your address</span></div>
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- Pricing ---------- */

export function Pricing() {
  useMeta('Posty pricing · $5 a month, domain at cost', 'Posty is $5 a month. Google Workspace Business Starter is from $7 a month, billed by Google. Your domain is charged at what the registrar charges, usually $11 to $25 a year.', '/pricing');
  const tlds = Object.keys(TLD_PRICE).filter(t => t !== '.io');
  const [tld, setTld] = useState('.me');
  const [yearly, setYearly] = useState(true);
  const ws = yearly ? WORKSPACE_FROM : 8.4;
  const domainMonthly = TLD_PRICE[tld] / 12;
  const total = POSTY_MONTHLY + ws + domainMonthly;
  return (
    <>
      <PageHead kicker="Pricing" title={<>Five dollars, <em className="s">flat.</em></>} sub="Posty is $5 a month. Google bills you for the Gmail inbox. The domain costs what the registrar charges us, with nothing added." />
      <section className="band tight">
        <div className="wrap price-grid">
          <div className="plan">
            <span className="kicker">Work out your total</span>
            <div className="calc">
              <div className="field-row" role="group" aria-label="Domain ending">
                <span className="lbl">Domain ending</span>
                <div className="tlds">
                  {tlds.map(t => <button key={t} type="button" className="tld" aria-pressed={t === tld} onClick={() => setTld(t)}>{t}</button>)}
                </div>
              </div>
              <div className="field-row" role="group" aria-label="Google Workspace billing">
                <span className="lbl">Google Workspace</span>
                <div className="seg">
                  <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly plan</button>
                  <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly, no commitment</button>
                </div>
              </div>
            </div>
            <div className="lines">
              <div><span>Posty</span><span>{money(POSTY_MONTHLY)} / month</span></div>
              <div><span>Google Workspace Business Starter</span><span>{money(ws)} / month</span></div>
              <div><span>Domain {tld} ({money(TLD_PRICE[tld])} a year)</span><span>{money(domainMonthly)} / month</span></div>
              <div className="tot"><span>Your total</span><span>{money(total)} / month</span></div>
              <div className="muted"><span>Estimates in USD. Domain prices vary by ending and are confirmed live before you pay. Google's price can differ by country. VAT is added at checkout where it applies.</span></div>
            </div>
            <Link className="btn btn-blue" to="/#search" style={{ alignSelf: 'flex-start' }}>Find my email</Link>
          </div>
          <div className="head">
            <span className="kicker">What's included</span>
            <ul className="checks">
              <li>Address search across many styles and endings, checked live</li>
              <li>Domain registration in your name, at cost</li>
              <li>Google Workspace setup: verification, MX, SPF, DKIM and DMARC</li>
              <li>Forwarding from your old inbox while people switch</li>
              <li>Extra addresses like hello@ on the same domain</li>
              <li>Help by email, usually within hours</li>
            </ul>
            <p className="sub">Cancel Posty any time. Your domain and your Google account stay yours, and you can manage them yourself or move them elsewhere.</p>
          </div>
        </div>
      </section>
      <section className="band paper">
        <div className="wrap">
          <div className="head"><span className="kicker">The honest comparison</span><h2>What it costs <em className="s">to do it yourself.</em></h2></div>
          <div className="cmp3">
            <div className="ex"><span className="kicker">Do it yourself</span><h3>Same price, your evening</h3><p>Registrar plus Google Workspace costs about the same, minus our $5. You then add five kinds of DNS records by hand and debug why mail lands in spam.</p></div>
            <div className="ex"><span className="kicker">Free Gmail</span><h3>$0, but a number in your name</h3><p>Good names went years ago. From January 2027 free Gmail also stops sending as outside addresses, which ends the old forwarding trick.</p></div>
            <div className="ex hi"><span className="kicker">Posty</span><h3>About $13 a month, done in five minutes</h3><p>A real Gmail inbox at an address you're proud of. You press one button, and we keep the records right.</p></div>
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- Examples ---------- */

const EXAMPLES = [
  ['Personal brand', 'Your name, nothing else', [['maya', 'lindqvist.me', 'Maya Lindqvist'], ['jonas', 'jonasbager.com', 'Jonas Bager'], ['hi', 'leanguyen.me', 'Lea Nguyen']]],
  ['Professional', 'Looks right in a recruiter\'s inbox', [['a.holm', 'aholm.dev', 'Anna Holm'], ['mkaur', 'mkaur.com', 'Mina Kaur'], ['peter', 'petersen.page', 'Peter Petersen']]],
  ['Short', 'Two letters to type at every checkout', [['tk', 'tkmail.com', 'Tobias Krogh'], ['me', 'ines.email', 'Ines'], ['jo', 'jdm.me', 'Jo D. Mason']]],
  ['Family', 'One domain, an address for everyone at home', [['sofie', 'theokafors.family', 'Sofie Okafor'], ['dad', 'theholms.com', 'Erik Holm'], ['kids', 'teamlarsen.family', 'Mette Larsen']]],
  ['Playful', 'For newsletters, side projects and fun', [['hello', 'nikoh.club', 'Niko Haddad'], ['hey', 'itsclara.com', 'Clara'], ['post', 'olivermail.com', 'Oliver Moe']]],
  ['Interest', 'Say what you love in your address', [['ski', 'astridruns.me', 'Astrid Berg'], ['brew', 'coffeewithtom.com', 'Tom Wells'], ['goal', 'silkeborgfan.club', 'Rasmus Juhl']]]
];

export function Examples() {
  useMeta('Email address ideas · Posty examples', 'Ideas for a personal email address on your own domain: personal brand, professional, short, family, playful and interest-based styles. Tap one to search with your own name.', '/examples');
  return (
    <>
      <PageHead kicker="Examples" title={<>Nine ways to be <em className="s">@you.</em></>} sub="A few styles people pick. Tap any example to search the same style with that name, then try your own." />
      <section className="band tight">
        <div className="wrap">
          {EXAMPLES.map(([cat, line, items]) => (
            <div key={cat} className="ex-group">
              <div className="ex-head"><h2 className="h3">{cat}</h2><p>{line}</p></div>
              <div className="examples">
                {items.map(([l, d, who]) => (
                  <Link key={l + d} className="ex link-card" to={'/?q=' + encodeURIComponent(who)}>
                    <Address local={l} domain={d} />
                    <p>Search “{who}” →</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <p className="note">Examples are illustrations. Availability is checked when you search.</p>
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- FAQ ---------- */

export const FAQ = [
  ['Getting started', [
    ['What do I actually get?', 'An email address on your own domain, like maya@lindqvist.me, as a full Gmail inbox through Google Workspace. You read and send in Gmail on the web and on your phone, and you also get Calendar, Drive and Meet.'],
    ['How long does it take?', 'Most addresses work within minutes of checkout. We email you as soon as yours is live.'],
    ['Do I need to know anything technical?', 'No. We register the domain and add every record Google needs. You sign in with Google once during setup.'],
    ['Can I use a domain I already own?', 'Yes. Tell us the domain during setup and we connect it instead of buying a new one.']
  ]],
  ['Gmail and Google Workspace', [
    ['Why Google Workspace?', 'It is the only way to send from your own address in Gmail everywhere. From January 2027 free Gmail accounts can no longer send as an outside address, so we set you up the way Google supports.'],
    ['What happens to my old Gmail address?', 'Nothing. It keeps working. We can forward it to your new inbox so you don\'t miss anything while people switch.'],
    ['Can I add more addresses?', 'Yes. Add aliases like hello@ or contact@ to the same inbox at no extra cost, or add more people as extra Workspace users.']
  ]],
  ['Domains', [
    ['Who owns the domain?', 'You do. It is registered in your name, and you can move it anywhere if you leave Posty.'],
    ['Why do you only show some endings?', 'We only show addresses whose domain is free to buy right now. Taken or premium-priced domains are left out.'],
    ['What if the address I saved is gone later?', 'Domains can be registered by anyone at any time, so a saved address may be taken later. Search the name again before you buy to see what is free right now.']
  ]],
  ['Billing', [
    ['How much does it cost?', '$5 a month to Posty, Google Workspace from $7 a month paid to Google, and the domain at cost, usually $11 to $25 a year. No setup fee.'],
    ['Can I cancel?', 'Yes, any time. You keep the domain until it expires and your Google account stays yours.'],
    ['Do you add VAT?', 'VAT is added at checkout where it applies, based on where you live.']
  ]],
  ['Privacy and security', [
    ['Can Posty read my email?', 'No. Your inbox is in your own Google account. Posty manages the domain\'s settings, not your mailbox.'],
    ['What do you store about me?', 'Your name, your email for receipts, the domain you bought and the setup status. Recent searches on this site stay in your browser only.'],
    ['How do you stop people faking my address?', 'We publish SPF, DKIM and DMARC records for your domain, which tell other mail servers to reject mail that pretends to be you.']
  ]]
];

export function Faq() {
  useMeta('Posty FAQ · Fair questions', 'Answers about Posty: what you get, Google Workspace, domain ownership, pricing, cancelling, privacy and security.', '/faq');
  return (
    <>
      <PageHead kicker="FAQ" title={<>Fair <em className="s">questions.</em></>} sub="Straight answers. If yours isn't here, write to hello@posty.club." />
      <section className="band tight">
        <div className="wrap faq-wrap">
          {FAQ.map(([group, items]) => (
            <div key={group} className="faq-group">
              <h2 className="h3">{group}</h2>
              <div className="faq">
                {items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
              </div>
            </div>
          ))}
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- Compare ---------- */

export function Compare() {
  useMeta('Posty vs other ways to get your own email address', 'Compare Posty with doing it yourself, free Gmail, and switching to another email provider. Posty keeps you in Gmail with your own domain, set up for you.', '/compare');
  const rows = [
    ['Your own domain', 'yes', 'yes', 'no', 'yes'],
    ['Stay in Gmail, send as your address', 'yes', 'yes', 'no', 'no'],
    ['Finds an available address for you', 'yes', 'no', 'no', 'no'],
    ['DNS and spam protection set up for you', 'yes', 'no', 'yes', 'some'],
    ['Domain registered in your name', 'yes', 'yes', '—', 'some'],
    ['Time to working inbox', '~5 min', '1–3 hours', 'Instant', '30–60 min']
  ];
  const mark = v => v === 'yes' ? <span className="yes">Yes</span> : v === 'no' ? <span className="no">No</span> : v === 'some' ? <span className="some">Sometimes</span> : v;
  return (
    <>
      <PageHead kicker="Compare" title={<>The easy way to <em className="s">your own address.</em></>} sub="There are four ways to get a nicer email address. Here is how they stack up for someone who just wants it to work." />
      <section className="band tight">
        <div className="wrap">
          <div className="table-scroll">
            <table className="cmp">
              <thead><tr><th scope="col"><span className="sr">Feature</span></th><th scope="col" className="hi">Posty</th><th scope="col">Do it yourself</th><th scope="col">Free Gmail</th><th scope="col">New email provider</th></tr></thead>
              <tbody>{rows.map(r => <tr key={r[0]}><th scope="row">{r[0]}</th>{r.slice(1).map((v, i) => <td key={i} className={i === 0 ? 'hi' : ''}>{mark(v)}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="cmp3" style={{ marginTop: 40 }}>
            <div className="ex"><span className="kicker">Do it yourself</span><p>Buy a domain at a registrar, sign up for Google Workspace, then copy verification, MX, SPF, DKIM and DMARC records between two dashboards. It works, if you enjoy that kind of evening.</p></div>
            <div className="ex"><span className="kicker">Free Gmail</span><p>Free and familiar, but the good names are gone. From January 2027 it can't send as an outside address either, so forwarding tricks stop working.</p></div>
            <div className="ex"><span className="kicker">New email provider</span><p>Privacy-focused and business mail services support custom domains, but usually mean moving to their inbox and apps instead of Gmail.</p></div>
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- For AI agents ---------- */

export function Agents() {
  useMeta('Use Posty from ChatGPT, Claude or any AI agent', 'Posty has a public JSON endpoint for AI assistants: GET /api/suggest?name= returns available email addresses with prices and a checkout link. Plus llms.txt and an OpenAPI description.', '/agents');
  const example = `GET ${SITE}/api/suggest?name=Maya%20Lindqvist

{
  "name": "Maya Lindqvist",
  "addresses": [
    {
      "address": "maya@lindqvist.me",
      "domain": "lindqvist.me",
      "style": "Your surname as the domain",
      "domain_price_usd_per_year": 16,
      "get_url": "${SITE}/?q=Maya%20Lindqvist&pick=maya%40lindqvist.me"
    }
  ],
  "pricing": { "posty_usd_per_month": 5, "google_workspace_usd_per_month_from": 7 }
}`;
  return (
    <>
      <PageHead kicker="For AI agents" title={<>Ask your AI for <em className="s">a better address.</em></>} sub="People increasingly ask an assistant instead of a search engine. Posty answers them directly: one public endpoint, a plain-text guide and links that open checkout for the exact address.">
        <div className="cta-row">
          <CopyButton className="btn btn-ink" text={AGENT_PROMPT} label="Copy a prompt for your AI" />
          <a className="btn btn-line" href="/llms.txt">Read llms.txt</a>
        </div>
      </PageHead>
      <section className="band tight">
        <div className="wrap split2">
          <div className="head">
            <span className="kicker">The endpoint</span>
            <h2>One call, <em className="s">real answers.</em></h2>
            <p className="sub">Every address in the response is on a domain that was free when we checked. Send the person to <span className="mono">get_url</span> and they land on checkout for that exact address.</p>
            <ul className="checks">
              <li>No key needed. Rate limited per IP.</li>
              <li>Up to 12 addresses, best first</li>
              <li>Described in <a href="/openapi.json">openapi.json</a></li>
            </ul>
          </div>
          <pre className="code" tabIndex={0}><code>{example}</code></pre>
        </div>
      </section>
      <section className="band paper">
        <div className="wrap">
          <div className="head"><span className="kicker">Deep links</span><h2>Links that <em className="s">do the work.</em></h2></div>
          <div className="cmp3">
            <div className="ex"><span className="kicker">Search</span><p className="mono small">posty.club/?q=Maya+Lindqvist</p><p>Opens Posty with the search already run.</p></div>
            <div className="ex"><span className="kicker">Checkout</span><p className="mono small">…&amp;pick=maya@lindqvist.me</p><p>Opens the Get this email step for that address, if it is still free.</p></div>
            <div className="ex"><span className="kicker">Learn</span><p className="mono small">posty.club/llms.txt</p><p>What Posty is, prices and rules, written for language models.</p></div>
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- Saved and history ---------- */

export function Saved({ api }) {
  useMeta('Your saved addresses · Posty', 'Addresses you saved and names you searched on Posty, kept in this browser.', '/saved');
  const { saved, recent } = useStore();
  const [pick, setPick] = useState(null);
  return (
    <>
      <PageHead kicker="Saved" title={<>Your short <em className="s">list.</em></>} sub="Addresses you saved and names you searched. They stay in this browser and are never sent to us." />
      <section className="band tight">
        <div className="wrap">
          {saved.length === 0 ? (
            <div className="empty">
              <p>No saved addresses yet. Tap the heart on any result to keep it here.</p>
              <Link className="btn btn-ink" to="/#search">Find your address</Link>
            </div>
          ) : (
            <div className="results">
              {saved.map(s => (
                <article key={s.address} className="card">
                  <div className="row1"><span className="kicker">Saved</span><span className="price">Domain <b>{money(s.price)}</b>/yr</span></div>
                  <Address local={s.local} domain={s.domain} />
                  <div className="foot">
                    <button type="button" className="link-btn" onClick={() => toggleSaved(s)}>Remove</button>
                    <button type="button" className="btn btn-ink" onClick={() => setPick(s)}>Get this email</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <div className="history">
              <div className="ex-head"><h2 className="h3">Recent searches</h2><button type="button" className="link-btn" onClick={clearRecent}>Clear history</button></div>
              <div className="recent">
                {recent.map(r => <Link key={r.name} className="recent-chip" to={'/?q=' + encodeURIComponent(r.name)}>{r.name}</Link>)}
              </div>
            </div>
          )}
          <p className="note">Availability can change. Search the name again before you buy to make sure the domain is still free.</p>
        </div>
      </section>
      {pick && <Sheet pick={pick} api={api} onClose={() => setPick(null)} />}
    </>
  );
}

export function NotFound() {
  useMeta('Page not found · Posty', 'This page does not exist. Search for your new email address instead.', '/404');
  return (
    <PageHead kicker="404" title={<>Return to <em className="s">sender.</em></>} sub="This page doesn't exist. Your new address might, though.">
      <div className="cta-row"><Link className="btn btn-ink" to="/#search">Find your address</Link></div>
    </PageHead>
  );
}
