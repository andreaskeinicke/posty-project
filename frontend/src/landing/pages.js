import React, { useMemo, useState } from 'react';
import { money, TLD_PRICE } from './names';
import { useStore, clearRecent } from './store';
import { ResultRow } from './Landing';
import FAQ_DATA from './faq.json';
import SupportChat from './SupportChat';
import { Address, AGENT_PROMPT, Closing, CopyButton, HELLO, Icon, Link, PageHead, useMeta, POSTY_MONTHLY, WORKSPACE_FROM, SITE } from './ui';

function AgentPanel() {
  return (
    <section className="band tight">
      <div className="wrap">
        <div className="dark-panel">
          <div>
            <span className="eyebrow">For AI assistants</span>
            <h2>Ask your assistant to find you <span className="dim">an address.</span></h2>
            <p>Posty publishes a plain description of what it does and how to search, so assistants can look up addresses for you and hand you a link to finish. <Link to="/agents">How it works for assistants →</Link></p>
          </div>
          <div className="prompt">
            <div className="prompt-top"><span className="mono">Prompt</span><CopyButton className="link-btn light" text={AGENT_PROMPT} label="Copy" /></div>
            <p className="mono">Use posty.club to find a personal email address for Anna Keinicke. Show me three complete options with prices.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

export function HowItWorks() {
  useMeta('How Posty works · Three steps, we take the hard one', 'Search your name, pick an address and pay once. Posty registers the domain in your name, connects Google Workspace and sets up MX, SPF, DKIM and DMARC. You approve Google once.', '/how-it-works');
  const usual = [
    ['Find an address that is free', 'Guess and check', 'One search'],
    ['Buy the domain', 'Separate registrar', 'Included, in your name'],
    ['Set up the mailbox', 'Separate signup', 'Google Workspace, linked'],
    ['MX, SPF, DKIM, DMARC', 'Copy by hand', 'Done for you'],
    ['Renewals and record checks', 'Your job', 'We watch them']
  ];
  return (
    <>
      <section className="page-head left">
        <div className="glow" aria-hidden="true" />
        <div className="wrap hiw-hero">
          <div className="hero-in">
            <span className="eyebrow">How it works</span>
            <h1>Three steps. <span className="dim">We take the hard one.</span></h1>
            <p className="lede">Most email providers hand you a list of DNS records and wish you luck. Posty finds the address, buys the domain in your name, and connects everything. You choose, and approve once with Google.</p>
            <div className="cta-row left">
              <Link className="btn btn-ink" to="/#search">Find your email</Link>
              <Link className="btn btn-line" to="/pricing">See pricing</Link>
            </div>
          </div>
          <div className="hiw-art" aria-hidden="true">
            <div className="art-card a1"><Icon name="search" size={16} /><span>anna keinicke</span></div>
            <div className="art-card a2"><span className="addr">anna@keinicke.com</span><span className="ok-t">Available</span></div>
            <div className="art-card a3"><span className="mono">MX</span><span className="mono">SPF</span><span className="mono">DKIM</span><span className="mono">DMARC</span></div>
            <div className="art-card a4"><Icon name="mail" size={16} /><span><b>Posty</b> · Your first letter arrived</span></div>
          </div>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap three">
          <article className="panel how-card">
            <div className="hc-top"><span className="num">1</span><span className="who">You</span></div>
            <div className="mini-ui">
              <div className="mu-input">Anna Keinicke</div>
              <div className="mu-row"><b>anna@keinicke.com</b><span>Available</span></div>
              <div className="mu-row"><b>hi@annak.dk</b><span>Available</span></div>
            </div>
            <h3>Search for your name</h3>
            <p>Type your name, family or business. We check real availability across domains and show complete addresses, not just domains.</p>
          </article>
          <article className="panel how-card">
            <div className="hc-top"><span className="num">2</span><span className="who">You</span></div>
            <div className="mini-ui">
              <div className="mu-row plain"><span>Domain, first year</span><b>$12</b></div>
              <div className="mu-row plain"><span>Posty, monthly</span><b>${POSTY_MONTHLY}</b></div>
              <div className="mu-row plain"><span>Workspace, by Google</span><b>from ${WORKSPACE_FROM}</b></div>
            </div>
            <h3>Pick it and pay once</h3>
            <p>One receipt with every line: the domain at cost, Posty at $5 a month, and Google Workspace billed by Google.</p>
          </article>
          <article className="panel how-card">
            <div className="hc-top"><span className="num">3</span><span className="who us">Posty</span></div>
            <div className="mini-ui chips">
              {['Domain in your name', 'Workspace linked', 'MX', 'SPF', 'DKIM', 'DMARC', 'First letter sent'].map(c => <span key={c} className="rec mono"><Icon name="check" size={12} />{c}</span>)}
            </div>
            <h3>We move you in</h3>
            <p>We register the domain in your name, connect Workspace and set up the mail records. You approve Google once.</p>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="wrap split2">
          <div className="head">
            <span className="eyebrow">The usual way vs Posty</span>
            <h2>No DNS <span className="dim">homework.</span></h2>
            <p className="sub">Setting up email on your own domain normally means buying a domain in one place, mail in another, then copying records between them. Small mistakes there are why mail goes missing.</p>
          </div>
          <div className="panel vs">
            <table>
              <thead><tr><th scope="col"><span className="sr">Task</span></th><th scope="col">Usually</th><th scope="col" className="hi">With Posty</th></tr></thead>
              <tbody>{usual.map(([a, b, c]) => <tr key={a}><th scope="row">{a}</th><td>{b}</td><td className="hi">{c}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>

      <AgentPanel />
      <Closing />
    </>
  );
}

/* ---------- Pricing ---------- */

export function Pricing() {
  useMeta('Posty pricing · $5 a month, every other line at cost', 'Posty is $5 a month. Google Workspace Business Starter is from $7 a month, billed by Google. Your domain is charged at cost, about $12 a year for a .com. About $13 a month in total.', '/pricing');
  const tlds = ['.com', '.me', '.dev', '.family', '.email', '.club'];
  const [tld, setTld] = useState('.com');
  const domainYear = tld === '.com' ? 12 : TLD_PRICE[tld];
  const domainMonthly = domainYear / 12;
  const total = POSTY_MONTHLY + WORKSPACE_FROM + domainMonthly;
  const who = [
    ['t-sky', 'Just you', 'anna@keinicke.com', 'A personal address that outlives any job, school or provider.'],
    ['t-peach', 'A household', 'Room for the whole family', 'Add people on the same domain. Each extra person is another Workspace seat, billed by Google.'],
    ['t-mint', 'A small business', 'hello@yourbakery.dk', 'Look established from the first invoice, without an IT person.']
  ];
  return (
    <>
      <PageHead kicker="Pricing" title={<>One price for Posty. <span className="dim">Every other line, at cost.</span></>} sub="You see the whole receipt before you pay. No bundles, no first-year tricks, and the domain is registered in your name from day one." />
      <section className="band tight">
        <div className="wrap price-grid">
          <div className="panel plan">
            <div className="plan-top"><span className="logo"><Logo24 />Posty</span><span className="badge soft">One plan</span></div>
            <div className="amt">${POSTY_MONTHLY}<small> / month for Posty</small></div>
            <ul className="checks">
              <li>We find and register your domain, in your name</li>
              <li>We connect Google Workspace and every mail record</li>
              <li>We watch renewals and records, and fix what drifts</li>
              <li>Help from us when you need it</li>
              <li>Cancel any time. The domain stays yours</li>
            </ul>
            <Link className="btn btn-ink wide" to="/#search">Find your email</Link>
          </div>
          <div className="panel receipt warm">
            <span className="eyebrow mono">What you actually pay</span>
            <h2 className="h3">For one person on a <span className="tld-pick">{tld}</span></h2>
            <div className="tlds" role="group" aria-label="Domain ending">
              {tlds.map(t => <button key={t} type="button" className="tld" aria-pressed={t === tld} onClick={() => setTld(t)}>{t}</button>)}
            </div>
            <div className="line"><div><b>Posty</b><span>Setup, renewals, record checks, help.</span></div><b>{money(POSTY_MONTHLY)} / mo</b></div>
            <div className="line"><div><b>Google Workspace</b><span>Billed by Google. Business Starter, from.</span></div><b>{money(WORKSPACE_FROM)} / mo</b></div>
            <div className="line"><div><b>Your domain</b><span>At cost, about {money(domainYear)} a year for a {tld}.</span></div><b>≈ {money(domainMonthly)} / mo</b></div>
            <div className="total"><span>About</span><p className="big-num">{money(Math.round(total))}<small> / month</small></p></div>
            <p className="fine">Domain prices vary by ending. You see the exact number next to every address in search. Google's price can differ by country and plan. VAT is added at checkout where it applies.</p>
          </div>
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <h2>Same price, <span className="dim">whoever you are.</span></h2>
          <div className="three" style={{ marginTop: 28 }}>
            {who.map(([t, k, a, d]) => (
              <article key={k} className="panel who-card">
                <div className={'who-art ' + t} aria-hidden="true"><Logo24 /></div>
                <div className="who-in"><span className="eyebrow mono">{k}</span><b>{a}</b><p>{d}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="band tight">
        <div className="wrap split2">
          <div className="head">
            <span className="eyebrow">Pricing questions</span>
            <h2>Fair <span className="dim">questions.</span></h2>
            <Link className="more" to="/questions">All questions →</Link>
          </div>
          <div className="faq">
            {FAQ.find(g => g[0] === 'Billing')[3].slice(0, 3).map(([q, a]) => <details key={q} open><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}

function Logo24() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3c7.7 0 13 5 13 11.6S23.7 26 16 26c-1.6 0-3.1-.2-4.5-.6L5 29l1.6-6C4.3 20.9 3 18 3 14.6 3 8 8.3 3 16 3z" fill="#3F7FE6" />
      <path d="M10 11.5l6 4.5 6-4.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25.5" cy="6.5" r="3.6" fill="#D4553A" stroke="#fff" strokeWidth="1.6" />
    </svg>
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
      <PageHead kicker="Examples" title={<>Ways to be <span className="dim">@you.</span></>} sub="A few styles people pick. Tap any example to search the same style with that name, then try your own." />
      <section className="band tight">
        <div className="wrap">
          {EXAMPLES.map(([cat, line, items]) => (
            <div key={cat} className="ex-group">
              <div className="ex-head"><h2 className="h3">{cat}</h2><p>{line}</p></div>
              <div className="three">
                {items.map(([l, d, who]) => (
                  <Link key={l + d} className="panel ex link-card" to={'/?q=' + encodeURIComponent(who)}>
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

/* ---------- Questions ---------- */

// Shared with the support agent (backend/support/knowledge.js reads the same file).
export const FAQ = FAQ_DATA;

const TOPICS = ['Cancel', 'Old mail', 'Workspace', 'Family', 'Change address'];

export function Questions() {
  useMeta('Questions · Ask Posty anything', 'Answers about Posty: owning your domain, Google Workspace, bringing old mail, family addresses, privacy, pricing and cancelling.', '/questions');
  const [q, setQ] = useState(() => (new URLSearchParams(window.location.search).get('q') || '').slice(0, 60));
  const [group, setGroup] = useState('');
  const items = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return FAQ.filter(g => !group || g[0] === group)
      .flatMap(g => g[3].map(([qq, a]) => ({ g: g[0], q: qq, a })))
      .filter(x => words.every(w => (x.q + ' ' + x.a).toLowerCase().includes(w)));
  }, [q, group]);
  const filtered = q || group;
  return (
    <>
      <PageHead kicker="Questions & help" title={<>Ask us <span className="dim">anything.</span></>}>
        <form className="finder" role="search" onSubmit={e => e.preventDefault()}>
          <label className="sr" htmlFor="pl-faq">Search questions</label>
          <Icon name="search" size={20} className="finder-ic" />
          <input id="pl-faq" value={q} maxLength={60} placeholder="Search questions, like “do I own the domain”" onChange={e => setQ(e.target.value)} />
          {q && <button type="button" className="btn btn-line" onClick={() => setQ('')}>Clear</button>}
        </form>
        <div className="recent">
          {TOPICS.map(t => <button key={t} type="button" className="chip" aria-pressed={q.toLowerCase() === t.toLowerCase()} onClick={() => { setQ(t.toLowerCase() === q.toLowerCase() ? '' : t); setGroup(''); }}>{t}</button>)}
        </div>
      </PageHead>
      <section className="band tight">
        <div className="wrap">
          <div className="cards4">
            {FAQ.map(([g, ic, sub]) => (
              <button key={g} type="button" className={'panel side-card topic' + (group === g ? ' on' : '')} aria-pressed={group === g} onClick={() => setGroup(group === g ? '' : g)}>
                <span className="ic"><Icon name={ic} /></span><h3>{g}</h3><p>{sub}</p>
              </button>
            ))}
          </div>
          <div className="q-grid">
            <div>
              <span className="eyebrow mono">{filtered ? `${items.length} ${items.length === 1 ? 'answer' : 'answers'}${group ? ' in ' + group : ''}` : 'Most asked'}</span>
              <div className="faq boxed">
                {items.map((x, i) => <details key={x.q} open={i < 2 && !filtered ? true : undefined}><summary>{x.q}</summary><p>{x.a}</p></details>)}
                {!items.length && <p className="note">No answer matches that yet. Write to us and we'll add one.</p>}
              </div>
            </div>
            <aside className="q-side">
              <SupportChat />
              <div className="panel side-card stuck">
                <span className="eyebrow mono">Still stuck?</span>
                <h3>Write to us.</h3>
                <p>Tell us what you were trying to do. We read every message and reply by email.</p>
                <a className="btn btn-ink wide" href={'mailto:' + HELLO}>Send us a message</a>
              </div>
              <div className="dark-panel small">
                <span className="eyebrow">For AI assistants</span>
                <p>These answers are also published as plain text, so assistants can answer questions about Posty correctly.</p>
                <a className="mono" href="/llms.txt">posty.club/llms.txt</a>
              </div>
              <p className="fine">Posty is run by Andreas Keinicke Holding ApS, Silkeborg, Denmark. <span className="mono">CVR 39464640</span></p>
            </aside>
          </div>
        </div>
      </section>
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
    ['Time to working inbox', 'Same day', '1–3 hours', 'Instant', '30–60 min']
  ];
  const mark = v => v === 'yes' ? <span className="yes">Yes</span> : v === 'no' ? <span className="no">No</span> : v === 'some' ? <span className="some">Sometimes</span> : v;
  return (
    <>
      <PageHead kicker="Compare" title={<>The easy way to <span className="dim">your own address.</span></>} sub="There are four ways to get a nicer email address. Here is how they stack up for someone who just wants it to work." />
      <section className="band tight">
        <div className="wrap">
          <div className="table-scroll panel">
            <table className="cmp">
              <thead><tr><th scope="col"><span className="sr">Feature</span></th><th scope="col" className="hi">Posty</th><th scope="col">Do it yourself</th><th scope="col">Free Gmail</th><th scope="col">New email provider</th></tr></thead>
              <tbody>{rows.map(r => <tr key={r[0]}><th scope="row">{r[0]}</th>{r.slice(1).map((v, i) => <td key={i} className={i === 0 ? 'hi' : ''}>{mark(v)}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="three" style={{ marginTop: 40 }}>
            <div className="panel ex"><span className="eyebrow">Do it yourself</span><p>Buy a domain at a registrar, sign up for Google Workspace, then copy verification, MX, SPF, DKIM and DMARC records between two dashboards. It works, if you enjoy that kind of evening.</p></div>
            <div className="panel ex"><span className="eyebrow">Free Gmail</span><p>Free and familiar, but the good names are gone. From January 2027 it can't send as an outside address either, so forwarding tricks stop working.</p></div>
            <div className="panel ex"><span className="eyebrow">New email provider</span><p>Privacy-focused and business mail services support custom domains, but usually mean moving to their inbox and apps instead of Gmail.</p></div>
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- For AI agents ---------- */

export function Agents() {
  useMeta('Use Posty from ChatGPT, Claude or any AI assistant', 'Posty has a public JSON endpoint for AI assistants: GET /api/suggest?name= returns available email addresses with prices and a checkout link. Plus llms.txt and an OpenAPI description.', '/agents');
  const example = `GET ${SITE}/api/suggest?name=Maya%20Lindqvist

{
  "name": "Maya Lindqvist",
  "addresses": [
    {
      "address": "maya@lindqvist.me",
      "domain": "lindqvist.me",
      "style": "Your surname as the domain",
      "domain_price_usd_per_year": 16,
      "get_url": "${SITE}/get?address=maya%40lindqvist.me"
    }
  ],
  "pricing": { "posty_usd_per_month": 5, "google_workspace_usd_per_month_from": 7 }
}`;
  return (
    <>
      <PageHead kicker="For AI assistants" title={<>Ask your AI for <span className="dim">a better address.</span></>} sub="People increasingly ask an assistant instead of a search engine. Posty answers them directly: one public endpoint, a plain-text guide and links that open checkout for the exact address.">
        <div className="cta-row">
          <CopyButton className="btn btn-ink" text={AGENT_PROMPT} label="Copy a prompt for your AI" />
          <a className="btn btn-line" href="/llms.txt">Read llms.txt</a>
        </div>
      </PageHead>
      <section className="band tight">
        <div className="wrap split2">
          <div className="head">
            <span className="eyebrow">The endpoint</span>
            <h2>One call, <span className="dim">real answers.</span></h2>
            <p className="sub">Every address in the response is on a domain that was free when we checked. Send the person to <span className="mono">get_url</span> and they land on checkout for that exact address.</p>
            <ul className="checks">
              <li>No key needed</li>
              <li>Up to 12 addresses, best first</li>
              <li>Described in <a href="/openapi.json">openapi.json</a></li>
            </ul>
          </div>
          <pre className="code" tabIndex={0}><code>{example}</code></pre>
        </div>
      </section>
      <section className="band">
        <div className="wrap">
          <span className="eyebrow">Deep links</span>
          <h2>Links that <span className="dim">do the work.</span></h2>
          <div className="three" style={{ marginTop: 28 }}>
            <div className="panel ex"><span className="eyebrow">Search</span><p className="mono small">posty.club/?q=Maya+Lindqvist</p><p>Opens Posty with the search already run.</p></div>
            <div className="panel ex"><span className="eyebrow">Checkout</span><p className="mono small">posty.club/get?address=maya@lindqvist.me</p><p>Opens checkout for that address, after checking it is still free.</p></div>
            <div className="panel ex"><span className="eyebrow">Learn</span><p className="mono small">posty.club/llms.txt</p><p>What Posty is, prices and rules, written for language models.</p></div>
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- My searches: saved addresses and history ---------- */

export function Saved() {
  useMeta('My searches · Posty', 'Addresses you saved and names you searched on Posty, kept in this browser.', '/saved', true);
  const { saved, recent } = useStore();
  return (
    <>
      <PageHead left kicker="My searches" title={<>Your short list. <span className="dim">Saved in this browser.</span></>} sub="Addresses you saved and names you searched. They stay on this device and are never sent to us." />
      <section className="band tight">
        <div className="wrap saved-grid">
          <div>
            {saved.length === 0 ? (
              <div className="empty panel">
                <Icon name="heart" size={22} />
                <p>No saved addresses yet. Tap the heart on any result to keep it here.</p>
                <Link className="btn btn-ink" to="/#search">Find your email</Link>
              </div>
            ) : (
              <div className="panel results-panel">
                <div className="panel-head"><p><b>{saved.length} saved {saved.length === 1 ? 'address' : 'addresses'}</b></p></div>
                <ul className="rows">{saved.map((s, i) => <ResultRow key={s.address} r={{ ...s, note: 'Saved ' + new Date(s.at || Date.now()).toLocaleDateString() + '. We check it is still free before you pay.' }} index={i + 1} saved={saved} />)}</ul>
              </div>
            )}
          </div>
          <aside className="history-panel" aria-label="Search history">
            <div className="hp-head"><h2 className="h3">Search history</h2>{recent.length > 0 && <button type="button" className="link-btn" onClick={clearRecent}>Clear</button>}</div>
            {recent.length === 0 ? <p className="note">Names you search will show up here.</p> : (
              <ul>
                {recent.map(r => (
                  <li key={r.name}><span>{r.name}</span><Link to={'/?q=' + encodeURIComponent(r.name)}>Search again</Link></li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  useMeta('Page not found · Posty', 'This page does not exist. Search for your new email address instead.', '/404', true);
  return (
    <PageHead kicker="404" title={<>Return to <span className="dim">sender.</span></>} sub="This page doesn't exist. Your new address might, though.">
      <div className="cta-row"><Link className="btn btn-ink" to="/#search">Find your email</Link></div>
    </PageHead>
  );
}
