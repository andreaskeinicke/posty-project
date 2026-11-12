import React, { useEffect, useMemo, useState } from 'react';
import { money } from './names';
import { useStore, clearRecent, toggleSaved } from './store';
import { Address, AGENT_PROMPT, Closing, CopyButton, getUrl, HELLO, Heart, Icon, Link, PageHead, useMeta, POSTY_MONTHLY, WORKSPACE_FROM, SITE } from './ui';

/* ---------- How it works (Paper "Site v5 · pages") ---------- */

// Shared page opening: two-tone headline, one plain line under it.
function Head({ title, sub, children, className = '' }) {
  return (
    <section className={'v5-head ' + className}>
      <div className="wrap">
        <h1>{title}</h1>
        {sub && <p className="lede">{sub}</p>}
        {children}
      </div>
    </section>
  );
}

// Photo frame. Shows a calm placeholder until a licensed photo is set via --photo.
export function Photo({ className = '', children }) {
  return <div className={'v5-photo ' + className} aria-hidden="true">{children}</div>;
}

export function Tile({ name }) {
  return <span className="v5-tile"><Icon name={name} size={20} /></span>;
}

export function HowItWorks() {
  useMeta('How Posty works · From search to sent', 'Search your name and pick an address. Posty registers the domain in your name, creates your Google Workspace inbox and sets MX, SPF, DKIM and DMARC. Then you sign in to Gmail.', '/how-it-works');
  const setup = [
    ['globe', <><b>ostrand.com</b> registered to Mila Ostrand</>],
    ['mail', 'Google Workspace inbox created'],
    ['shield', 'MX, SPF, DKIM and DMARC set']
  ];
  const devices = [
    ['phone', 'On your phone', 'The Gmail app, signed in as you.'],
    ['laptop', 'On your laptop', 'gmail.com, same as always.'],
    ['import', 'Old mail', 'Bring it over when you want.']
  ];
  return (
    <>
      <Head title={<>From search to sent. <span className="dim">You pick the address. We do the rest.</span></>} sub="Here is what happens between your search and your first email." />
      <section className="v5-steps wrap">
        <article className="v5-step">
          <div className="v5-step-t"><span className="n">01</span><h2>Find an address you like</h2><p>Type your name. We only show addresses that are free right now, with the price next to each.</p></div>
          <Photo className="hiw">
            <div className="v5-glass small">
              <div className="hv-row on"><span className="hv-addr">mila<span>@</span>ostrand.com</span><span className="hv-btn blue">Get this email</span></div>
              <div className="hv-row"><span className="hv-addr">hi<span>@</span>milaostrand.com</span></div>
            </div>
          </Photo>
        </article>
        <article className="v5-step">
          <div className="v5-step-t"><span className="n">02</span><h2>We set everything up</h2><p>We register the domain in your name, create your Google Workspace inbox and set the mail records.</p><Link className="v5-more" to="/pricing#behind">See everything we set up <Icon name="arrow" size={14} /></Link></div>
          <ul className="v5-list">
            {setup.map(([ic, t], i) => <li key={i}><Tile name={ic} /><span>{t}</span><Icon name="check" size={16} className="ok" /></li>)}
          </ul>
        </article>
        <article className="v5-step">
          <div className="v5-step-t"><span className="n">03</span><h2>You start sending</h2><p>Sign in to Gmail on your phone and laptop. We help bring your old mail along.</p></div>
          <ul className="v5-cards">
            {devices.map(([ic, h, p]) => <li key={h}><Tile name={ic} /><h3>{h}</h3><p>{p}</p></li>)}
          </ul>
        </article>
      </section>
      <Closing />
    </>
  );
}

/* ---------- Behind the button: the technical work Posty does, named plainly ---------- */

// Mirrors backend/fulfilment (Cloudflare registrar + DNS, workspaceBackend.records). Keep in sync.
const BEHIND = [
  ['Your domain', 'globe', [
    ['Live availability check', 'We query the domain registries (RDAP) for every ending and only show addresses you can actually buy.', null],
    ['Registration in your name', 'You are the registrant on record, with your contact details kept private in WHOIS.', 'Registrant: Mila Ostrand'],
    ['DNS zone', 'We host the domain\'s DNS, so every record below can be set and checked without you.', 'NS  *.ns.cloudflare.com']
  ]],
  ['Google Workspace', 'mail', [
    ['Sign in with Google', 'The one step that is yours: accept Google\'s terms, so the mailbox and the bill are in your own name.', null, true],
    ['Domain verification', 'Proves to Google that you own the domain.', 'TXT  google-site-verification=…']
  ]],
  ['Mail that arrives', 'shield', [
    ['MX record', 'Tells the world\'s mail servers to deliver your mail to Gmail.', 'MX  1 smtp.google.com'],
    ['SPF', 'Lists who may send as you, so your mail is not marked as spam.', 'TXT  v=spf1 include:_spf.google.com ~all'],
    ['DKIM', 'A signing key that proves each email really came from you.', 'TXT  google._domainkey  v=DKIM1; k=rsa; p=…'],
    ['DMARC', 'Tells Gmail and Outlook what to do with mail that pretends to be you.', 'TXT  _dmarc  v=DMARC1; p=none']
  ]],
  ['After moving in', 'checkCircle', [
    ['Checked in public DNS', 'We look your records up from the outside, the way other mail servers will, before we call it done.', null],
    ['Renewal every year', 'We renew the domain at cost, so your address never lapses by accident.', null],
    ['Someone to ask', 'If mail stops arriving or a record drifts, you write to us and we fix it.', null]
  ]]
];

export function BehindTheButton() {
  return (
    <section className="band v5-rule v5-behind" id="behind">
      <div className="wrap">
        <h2>Finding the address is the easy part. <span className="dim">Here is everything behind the button.</span></h2>
        <ul className="v5-facts">
          <li><b>3</b><span>accounts to set up and connect: registrar, Google, DNS</span></li>
          <li><b>5</b><span>DNS records, each copied exactly, character by character</span></li>
          <li><b>1</b><span>typo is enough to send your mail to spam, or nowhere</span></li>
        </ul>
        <div className="v5-bt">
          {BEHIND.map(([group, ic, rows]) => (
            <div key={group} className="bt-group">
              <div className="bt-h"><Tile name={ic} /><h3>{group}</h3></div>
              <ul>
                {rows.map(([t, p, rec, you]) => (
                  <li key={t} className={you ? 'you' : ''}>
                    <div className="bt-t"><b>{t}</b><span>{p}</span></div>
                    {rec ? <code className="bt-rec">{rec}</code> : <span className="bt-rec none" />}
                    <span className={'bt-who' + (you ? ' you' : '')}>{you ? 'You, once' : <><Icon name="check" size={14} />Posty</>}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="v5-bt-foot">On your own, that is a registrar, the Google Admin console and a DNS dashboard, with values copied between them by hand. With Posty, it is one button and one Google sign-in.</p>
      </div>
    </section>
  );
}

const VS = [
  ['Your own domain', true],
  ['Gmail by Google Workspace', true],
  ['Finds free addresses for your name', false],
  ['Domain, mailbox and DNS in one place, not three dashboards', false],
  ['Google domain verification done for you', false],
  ['MX records pointed at Gmail', false],
  ['SPF, DKIM and DMARC set, so your mail is not spam', false],
  ['Every record checked from the outside before you start', false],
  ['Renewal watched, so your address never lapses', false],
  ['Someone to ask when it breaks', false]
];

function DoItYourself() {
  return (
    <section className="band v5-rule v5-diy">
      <div className="wrap">
        <h2>Why not do it yourself? <span className="dim">You can. Here is what Posty saves you.</span></h2>
        <div className="v5-vs">
          <div>
            <h3>On your own</h3>
            <p>Registrar, Google Workspace and DNS, set up by you.</p>
            <ul>{VS.map(([t, ok]) => <li key={t} className={ok ? '' : 'no'}><Icon name={ok ? 'check' : 'x'} size={14} />{t}{!ok && <span className="sr"> (not included)</span>}</li>)}</ul>
          </div>
          <div>
            <h3>With Posty</h3>
            <p>One search, one button. We set it up and look after it.</p>
            <ul>{VS.map(([t]) => <li key={t}><Icon name="check" size={14} />{t}</li>)}</ul>
          </div>
        </div>
        <Link className="v5-more" to="#behind" onClick={e => { e.preventDefault(); const el = document.getElementById('behind'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}>See every technical step <Icon name="arrow" size={14} /></Link>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */

export function Pricing() {
  useMeta('Posty pricing · One honest price', 'Posty is $5 a month. Google Workspace Business Starter is from $7 a month, billed by Google. Your domain is charged at cost, about $12 a year for a .com. About $13 a month in total.', '/pricing');
  const lines = [
    ['Posty', 'Finding, buying and setting up your address. Renewals and help.', `$${POSTY_MONTHLY} / month`],
    ['Google Workspace', 'Gmail on your own domain, billed by Google to your own account.', `from $${WORKSPACE_FROM} / month`],
    ['Your domain', 'Registered in your name at cost. A .com is about $12 a year.', 'at cost']
  ];
  return (
    <>
      <section className="v5-head split">
        <div className="wrap v5-split">
          <div>
            <h1>One honest price. <span className="dim">Every line up front.</span></h1>
            <p className="lede">Cancel any time. The domain and the mailbox stay yours.</p>
          </div>
          <div className="v5-receipt">
            {lines.map(([h, p, a]) => <div key={h} className="line"><div><b>{h}</b><span>{p}</span></div><b>{a}</b></div>)}
            <div className="tot">
              <div><span>All in, for most people</span><p><b>about $13</b> / month</p></div>
              <Link className="btn btn-ink" to="/#search">Find your email</Link>
            </div>
          </div>
        </div>
      </section>
      <DoItYourself />
      <BehindTheButton />
      <Closing />
    </>
  );
}

/* ---------- Examples ---------- */

const EXAMPLES = [
  ['Personal brand', 'Your name, nothing else', [['maya', 'lindqvist.me', 'Maya Lindqvist'], ['jonas', 'jonasbager.com', 'Jonas Bager'], ['hi', 'leanguyen.me', 'Lea Nguyen']]],
  ['Professional', 'Looks right in a recruiter\'s inbox', [['a.holm', 'aholm.dev', 'Ane Holm'], ['mkaur', 'mkaur.com', 'Mina Kaur'], ['peter', 'petersen.page', 'Peter Petersen']]],
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

export const FAQ = [
  ['Your domain', 'globe', 'Ownership, renewals, endings', [
    ['Do I really own the domain?', 'Yes. It is registered with you as the owner, and you can move it to another provider whenever you like. Posty manages it for you while you are a customer.'],
    ['Why do you only show some endings?', 'We only show addresses whose domain is free to buy right now. Taken or premium-priced domains are left out.'],
    ['Can I use a domain I already own?', 'Yes. Tell us the domain and we connect it instead of buying a new one.'],
    ['Can I change my address later?', 'You can add more addresses on the same domain at any time, like hello@ or a nickname. A different domain is a new search and a new domain.'],
    ['What if an address I saved is gone later?', 'Domains can be registered by anyone at any time, so a saved address may be taken later. Search the name again before you buy to see what is free right now.']
  ]],
  ['Your inbox', 'mail', 'Workspace, phone, old mail', [
    ['Why Google Workspace and not free Gmail?', 'Gmail is ending free sending from your own address in January 2027. Workspace gives you a proper inbox on your own domain, with Gmail, Calendar and Drive, billed by Google.'],
    ['Can I bring my old mail and contacts?', 'Yes. Google has a built-in import tool for mail and contacts from Gmail, Outlook, Hotmail and most other providers. We walk you through it after you move in.'],
    ['How do I add it to my phone?', 'Open the Gmail app, add an account, choose Google and sign in with your new address. Takes a minute.'],
    ['Can my family get addresses too?', 'Yes. Add people on the same domain. Each extra person is another Google Workspace seat, billed by Google.'],
    ['What happens to my old address?', 'Nothing. It keeps working. Tell people your new address at your own pace.']
  ]],
  ['Safety & privacy', 'shield', 'Records, spam, your data', [
    ['Is my mail safe? Who can read it?', 'Your inbox lives in your own Google account. Posty manages the domain\'s settings, not your mailbox, and cannot read your mail.'],
    ['How do you stop people faking my address?', 'We publish SPF, DKIM and DMARC records for your domain, which tell other mail servers to reject mail that pretends to be you.'],
    ['What do you store about me?', 'Your name, your email for receipts, the domain you bought and the setup status. Recent searches on this site stay in your browser only.']
  ]],
  ['Billing', 'card', 'Receipts, cancelling, changes', [
    ['Why is Google Workspace billed separately?', 'Your mailbox is a Google account in your name, so Google bills you directly. That keeps the mailbox yours, whatever happens to Posty.'],
    ['What if I cancel Posty?', 'The domain and the Workspace account stay yours. You can keep them running yourself, or move them anywhere.'],
    ['Can I use free Gmail instead of Workspace?', 'We build on Google Workspace, because Gmail is ending its free way of sending from your own address in January 2027.'],
    ['How much does it cost in total?', '$5 a month to Posty, Google Workspace from $7 a month paid to Google, and the domain at cost, about $12 a year for a .com. About $13 a month for most people.'],
    ['Do you add VAT?', 'VAT is added at checkout where it applies, based on where you live.']
  ]]
];

// The questions people ask first, in the order they ask them.
const TOP = [
  ['Do I keep using Gmail?', 'Yes. Your new address runs on Gmail by Google Workspace, so you use the Gmail app and gmail.com as before, signed in as your new address.'],
  ['Who owns the domain?', 'You do. It is registered in your name, and you can move it to another provider whenever you like. Posty looks after it while you are a customer.'],
  ['What happens to my old Hotmail address?', 'Nothing. It keeps working. Tell people your new address at your own pace, and bring your old mail and contacts over with Google\'s import tool when you want.'],
  ['Can my family get addresses too?', 'Yes. Add people on the same domain. Each extra person is another Google Workspace seat, billed by Google.'],
  ['What does it cost in total?', '$5 a month to Posty, Google Workspace from $7 a month paid to Google, and the domain at cost, about $12 a year for a .com. About $13 a month for most people.'],
  ['Can I cancel?', 'Any time. The domain and the Workspace account stay yours. You can keep them running yourself or move them anywhere.'],
  ['Do I need to know anything technical?', 'No. We register the domain, create the inbox and set the mail records. You sign in to Gmail once.']
];

function Accordion({ items, openFirst }) {
  const [open, setOpen] = useState(openFirst ? 0 : -1);
  return (
    <div className="v5-acc">
      {items.map(([q, a], i) => {
        const on = open === i;
        const id = 'qa-' + i;
        return (
          <div key={q} className={'qa' + (on ? ' on' : '')}>
            <h3><button type="button" aria-expanded={on} aria-controls={id} onClick={() => setOpen(on ? -1 : i)}>{q}<Icon name={on ? 'minus' : 'plus'} size={18} /></button></h3>
            <div id={id} role="region" hidden={!on}><p>{a}</p></div>
          </div>
        );
      })}
    </div>
  );
}

export function Questions() {
  useMeta('Questions · Posty, answered plainly', 'Answers about Posty: Gmail, owning your domain, your old Hotmail address, family addresses, the total price, cancelling and what you need to know.', '/questions');
  const q = (new URLSearchParams(window.location.search).get('q') || '').slice(0, 60);
  const all = useMemo(() => {
    const seen = new Set(TOP.map(x => x[0]));
    return [...TOP, ...FAQ.flatMap(g => g[3]).filter(x => !seen.has(x[0]))];
  }, []);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.length ? all.filter(([qq, a]) => words.every(w => (qq + ' ' + a).toLowerCase().includes(w))) : [];
  return (
    <>
      <section className="v5-head split">
        <div className="wrap v5-qgrid">
          <div className="v5-qside">
            <h1>Questions, <span className="dim">answered plainly.</span></h1>
            <div className="v5-card">
              <Tile name="chat" />
              <h3>Still wondering?</h3>
              <p>Send us a message and we walk you through it.</p>
              <a className="btn btn-soft wide" href={'mailto:' + HELLO}>Send us a message</a>
            </div>
          </div>
          <div>
            {words.length > 0 && (
              <div className="v5-qhits">
                <p className="fine">{hits.length ? `${hits.length} ${hits.length === 1 ? 'answer' : 'answers'} about “${q}”` : `Nothing about “${q}” yet. Write to us and we'll add it.`} <Link to="/questions">Show all</Link></p>
                {hits.length > 0 && <Accordion key={'h' + q} items={hits} openFirst />}
              </div>
            )}
            {!words.length && <Accordion items={TOP} openFirst />}
            {!words.length && FAQ.map(([g, , , items]) => {
              const rest = items.filter(x => !TOP.some(t => t[0] === x[0]));
              return rest.length ? <div key={g} className="v5-qgroup"><h2>{g}</h2><Accordion items={rest} /></div> : null;
            })}
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

export function Saved({ api }) {
  useMeta('My searches · Posty', 'Addresses you saved and names you searched on Posty, kept in this browser.', '/saved', true);
  const { saved, recent } = useStore();
  const [live, setLive] = useState({});
  const domains = saved.map(s => s.domain).join(',');
  useEffect(() => {
    if (!api || !domains) return undefined;
    let gone = false;
    api.checkDomains(domains.split(',')).then(r => { if (!gone) setLive(r || {}); }).catch(() => {});
    return () => { gone = true; };
  }, [api, domains]);
  return (
    <>
      <Head title={<>Your shortlist. <span className="dim">Saved on this device.</span></>} />
      <section className="wrap v5-saved">
        <div className="v5-box">
          <div className="v5-box-h">Saved addresses</div>
          {saved.length === 0 ? (
            <div className="v5-empty">
              <Icon name="heart" size={22} />
              <p>Nothing saved yet. Tap the heart on any result to keep it here.</p>
              <Link className="btn btn-ink" to="/#search">Find your email</Link>
            </div>
          ) : (
            <ul>
              {saved.map((s, i) => {
                const st = live[s.domain];
                const taken = st && st.available === false;
                const free = st && st.available;
                return (
                  <li key={s.address}>
                    <button type="button" className="heart-btn" aria-label={`Remove ${s.address} from saved`} onClick={() => toggleSaved(s)}><Heart on /></button>
                    <div className="sv-who"><span className="addr">{s.local}<span className="at">@</span>{s.domain}</span><span>{money(s.price)} / year</span></div>
                    <span className={'state' + (taken ? ' bad' : free ? ' ok' : '')}>{taken ? 'Taken since you saved it' : free ? 'Still free' : 'Checking…'}</span>
                    {taken
                      ? <Link className="btn btn-soft" to={'/?q=' + encodeURIComponent(s.local + ' ' + s.domain.split('.')[0])}>See similar</Link>
                      : <Link className={'btn ' + (i === 0 ? 'btn-blue' : 'btn-soft')} to={getUrl(s.address)}>Get this email</Link>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="v5-box" aria-label="Recent searches">
          <div className="v5-box-h"><span>Recent searches</span>{recent.length > 0 && <button type="button" className="link-btn" onClick={clearRecent}>Clear</button>}</div>
          {recent.length === 0 ? <p className="v5-none">Names you search show up here.</p> : (
            <ul className="hist">
              {recent.map(r => (
                <li key={r.name}><Link to={'/?q=' + encodeURIComponent(r.name)}><Icon name="history" size={16} /><span>{r.name}</span><Icon name="arrow" size={16} /></Link></li>
              ))}
            </ul>
          )}
        </aside>
      </section>
      <div className="v5-space" />
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
