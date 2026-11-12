import React, { useEffect, useRef, useState } from 'react';
import SupportChat from './SupportChat';
import { candidates, domainsFor, rank, addressRows, money, nameProblem } from './names';
import { addRecent, clearRecent, isSaved, toggleSaved, useStore } from './store';
import { headline, track } from './experiment';
import HeroVisual, { useTypedPlaceholder } from './HeroVisual';
import { Closing, Heart, Icon, Link, Logo, SearchBox, getUrl, navigate, useMeta, POSTY_MONTHLY, WORKSPACE_FROM } from './ui';

// Home: pitch, search for an address, one button to get it.
// Deep links: /?q=Maya+Lindqvist runs a search. The older &pick=local@domain opens checkout for that address.

const FILTERS = [
  ['all', 'All'], ['pro', 'Professional'], ['short', 'Short'], ['fun', 'Playful'], ['family', 'Family']
];
const FIRST = 4;
const MAX = 12;

// Hero copy (Paper "Site v5 · refined"). The h1 comes from the headline test
// (headlines.json, control "Email with your name on it."); see docs/HEADLINE_TESTS.md.
const HERO = {
  sub: 'Pick an address on your own domain. We register it, set up Gmail by Google Workspace and look after it from there.'
};

export function ResultRow({ r, index, saved, endings, onEnding }) {
  const on = isSaved(saved, r.address);
  const top = index === 0;
  const at = r.domain.indexOf('.');
  const tld = r.domain.slice(at);
  return (
    <li className={'row' + (top ? ' top' : '')} style={{ animationDelay: Math.min(index, 8) * 40 + 'ms' }}>
      <div className="row-main">
        <div className="row-addr">
          <span className="addr">{r.local}<span className="at">@</span>{r.domain}</span>
          {top && <span className="badge">Our pick</span>}
        </div>
        {endings && endings.length > 1 && (
          <div className="endings" role="group" aria-label={`Free endings for ${r.local}@${r.domain.slice(0, at)}`}>
            <span>Free endings:</span>
            {endings.map(t => <button key={t} type="button" className="end" aria-pressed={t === tld} onClick={() => onEnding(t)}>{t}</button>)}
          </div>
        )}
        <p className="row-note">{r.note}</p>
      </div>
      <div className="row-price"><b>{money(r.price)} / year</b><span>domain, at cost</span></div>
      <div className="row-acts">
        <button type="button" className="icon-btn" aria-pressed={on} aria-label={on ? `Remove ${r.address} from saved` : `Save ${r.address}`} onClick={() => toggleSaved(r)}><Heart on={on} /></button>
        <Link className={'btn ' + (top ? 'btn-blue' : 'btn-soft')} to={getUrl(r.address)} onClick={() => track('get')}>Get this email</Link>
      </div>
    </li>
  );
}

const INCLUDES = [
  ['globe', 'Your own domain', 'Registered in your name. You own it.'],
  ['mail', 'Gmail by Google Workspace', 'The Gmail you know, on your address.'],
  ['shield', 'Mail records set up', 'So your mail lands in inboxes, not spam.'],
  ['chat', 'Help from Posty', 'We walk you through moving in.']
];

function readQuery() {
  const p = new URLSearchParams(window.location.search);
  return { q: (p.get('q') || p.get('name') || '').slice(0, 60), pick: (p.get('pick') || '').toLowerCase() };
}

export default function Landing({ api, onOpenChat, initialName = '' }) {
  useMeta(
    'Posty · Get your dream email today',
    'Search a name, pick an address on your own domain, press one button. Posty registers the domain in your name and sets up a real Gmail inbox with Google Workspace. $5 a month plus Workspace and the domain at cost.',
    '/'
  );
  const start = readQuery();
  const first = start.q || initialName;
  const [name, setName] = useState(first);
  const [style, setStyle] = useState('all');
  const [availability, setAvailability] = useState({});
  const [list, setList] = useState([]);
  const [status, setStatus] = useState(first ? 'loading' : 'idle'); // idle | loading | ready | error
  const [query, setQuery] = useState(first);
  const [showAll, setShowAll] = useState(false);
  const [ending, setEnding] = useState({}); // chosen ending per candidate
  const { recent, saved } = useStore();
  const inputRef = useRef(null);
  const reqId = useRef(0);
  const h1 = headline().variant.headline;
  const typed = useTypedPlaceholder(!name, 'Type your name');

  const search = async value => {
    const q = value.trim();
    setQuery(q); setName(q); setShowAll(false);
    if (!q) { setStatus('idle'); setList([]); return; }
    if (!api.demo || value !== initialName) {
      if (!api.demo) track('search');
      addRecent(q);
      const url = new URL(window.location.href);
      url.searchParams.set('q', q); url.searchParams.delete('pick'); url.hash = '';
      window.history.replaceState({}, '', url.pathname + url.search);
    }
    const cands = candidates(q);
    const id = ++reqId.current;
    setStatus('loading');
    try {
      const avail = await api.checkDomains(domainsFor(cands));
      if (id !== reqId.current) return;
      setAvailability(avail); setList(cands); setStatus('ready');
    } catch (e) {
      if (id === reqId.current) setStatus('error');
    }
  };

  useEffect(() => {
    if (!api.demo) track('view');
    if (start.pick && start.pick.includes('@')) { navigate(getUrl(start.pick)); return; }
    if (first) search(first);
    if (window.location.hash === '#search' && inputRef.current) inputRef.current.focus();
    // Run once on mount with the prefilled or linked name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One row per name idea; its free endings are chips on the row.
  const ranked = status === 'ready' ? rank(list, availability, style) : [];
  const freeCount = ranked.reduce((n, c) => n + c.avail.length, 0);
  const groups = ranked.map(c => {
    const key = c.local + '@' + c.base;
    const t = c.avail.includes(ending[key]) ? ending[key] : c.avail[0];
    return { key, endings: c.avail, r: addressRows([{ ...c, avail: [t] }], availability)[0] };
  });
  const rows = groups;
  const shown = showAll ? groups.slice(0, MAX) : groups.slice(0, FIRST);
  const shownRecent = recent.filter(r => r.name.toLowerCase() !== query.toLowerCase()).slice(0, 5);

  return (
    <>
      <section className="hero" id="search">
        <div className="glow" aria-hidden="true" />
        <div className="wrap hero-in">
          <span className="badge-soft"><Logo size={18} />Your own domain, with Gmail by Google Workspace</span>
          <h1>{h1}</h1>
          <p className="lede">{HERO.sub}</p>

          <SearchBox big value={name} onChange={setName} onSubmit={search} inputRef={inputRef} placeholder={typed} />
          <p className="hint">
            About $13 a month, all in. Cancel any time, the domain stays yours.
            {onOpenChat && <><span className="dot-sep">·</span><button type="button" className="link-btn" onClick={onOpenChat}>Not sure? Let Posty suggest a few</button></>}
          </p>
          {shownRecent.length > 0 && (
            <div className="recent" aria-label="Recent searches">
              <span>Recent</span>
              {shownRecent.map(r => (
                <button key={r.name} type="button" className="recent-chip" onClick={() => search(r.name)}>{r.name}</button>
              ))}
              <button type="button" className="link-btn" onClick={clearRecent}>Clear</button>
            </div>
          )}

          {status !== 'idle' && (
            <div className="v5-results">
            <div className="filters" role="group" aria-label="Style">
              {FILTERS.map(([k, label]) => (
                <button key={k} type="button" className="chip" aria-pressed={style === k} onClick={() => { setStyle(k); setShowAll(false); }}>{label}</button>
              ))}
            </div>
            <div className="panel results-panel" aria-live="polite">
              <div className="panel-head">
                <p>
                  {status === 'loading' && <>Checking addresses for “{query}”…</>}
                  {status === 'ready' && <><b>{freeCount} {freeCount === 1 ? 'address' : 'addresses'} free</b> for “{query}”, best first</>}
                  {status === 'error' && <>We couldn't check domains just now.</>}
                </p>
                {status === 'ready' && <span className="live">{api.demo ? 'Simulated · demo' : 'Checked live just now'}</span>}
              </div>
              {status === 'loading' && <ul className="rows">{[0, 1, 2].map(i => <li key={i} className="skeleton" />)}</ul>}
              {status === 'ready' && rows.length > 0 && (
                <ul className="rows">{shown.map((g, i) => <ResultRow key={g.key + style} r={g.r} index={i} saved={saved} endings={g.endings} onEnding={t => setEnding(e => ({ ...e, [g.key]: t }))} />)}</ul>
              )}
              {status === 'ready' && !rows.length && <p className="note pad">{nameProblem(query) || 'Nothing free in this style. Try another style, or add a middle name.'}</p>}
              {status === 'error' && <p className="note pad">Try again in a moment.</p>}
              {status === 'ready' && rows.length > 0 && (
                <div className="panel-foot">
                  <span>Only addresses you can actually get.</span>
                  {!showAll && rows.length > FIRST && <button type="button" className="link-btn" onClick={() => setShowAll(true)}>Show {Math.min(rows.length, MAX) - FIRST} more</button>}
                </div>
              )}
              {status === 'ready' && rows.length > 0 && (
                <div className="pad-x">
                  <SupportChat compact stage="search" title="Ask Posty" intro="Not sure which one to pick?"
                    context={{ query, addresses: shown.map(r => r.address) }} />
                </div>
              )}
            </div>
            <aside className="v5-includes">
              <h2>Every address includes</h2>
              <ul>{INCLUDES.map(([ic, h, p]) => <li key={h}><span className="v5-tile"><Icon name={ic} size={18} /></span><div><b>{h}</b><span>{p}</span></div></li>)}</ul>
              <div className="inc-tot"><span>All in, for most people</span><b>about $13 / month</b></div>
            </aside>
            </div>
          )}
          {status === 'idle' && <HeroVisual />}
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>An address you can say out loud. <span className="dim">No numbers, no underscores, no spelling it twice for your bank.</span></h2>
          <div className="pair">
            <div className="pair-card">
              <dl className="ba">
                <dt>Before</dt><dd className="old">mila.ostrand87@hotmail.com</dd>
                <dt>After</dt><dd className="new"><Logo size={22} />mila@ostrand.com</dd>
              </dl>
              <div><h3>Your name, at last</h3><p>Short and personal on a domain that carries your name. It works for the rest of your life, whoever you work for.</p></div>
            </div>
            <div className="pair-card">
              <dl className="own">
                <div><dt>Domain owner</dt><dd>Mila Ostrand</dd></div>
                <div><dt>Mailbox</dt><dd>Google Workspace, your account</dd></div>
                <div><dt>Mail records</dt><dd>MX · SPF · DKIM · DMARC, set up</dd></div>
                <div><dt>Renewal</dt><dd>At cost, watched by Posty</dd></div>
              </dl>
              <div><h3>Yours, not ours</h3><p>The domain is registered to you and the mailbox is your own Google account. Posty sets it up and keeps it healthy.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <span className="eyebrow">After you press the button</span>
          <h2>From search to sent. <span className="dim">Usually the same day, with nothing to configure.</span></h2>
          <ol className="grid3">
            <li><span className="n">01</span><h3>We register your domain</h3><p>Bought at cost and registered in your name. You own it, not us.</p></li>
            <li><span className="n">02</span><h3>We set up your inbox</h3><p>Your Google Workspace account, mail records and security settings, done for you.</p></li>
            <li><span className="n">03</span><h3>You start sending</h3><p>Sign in to Gmail on your phone and laptop. We help bring your old mail along.</p></li>
          </ol>
          <Link className="more" to="/how-it-works">See every step →</Link>
        </div>
      </section>

      <section className="band">
        <div className="wrap split2 center">
          <div className="head">
            <span className="eyebrow">Pricing</span>
            <h2>One honest price. <span className="dim">Every line up front.</span></h2>
            <p className="sub">Cancel any time. The domain and the mailbox stay yours.</p>
          </div>
          <div className="panel receipt">
            <div className="line"><div><b>Posty</b><span>Finding, buying and setting up your address. Renewals, support and a person to ask.</span></div><b>${POSTY_MONTHLY} / month</b></div>
            <div className="line"><div><b>Google Workspace</b><span>Gmail on your own domain, billed by Google straight to your own account.</span></div><b>from ${WORKSPACE_FROM} / month</b></div>
            <div className="line"><div><b>Your domain</b><span>Registered in your name at cost. A .com is about $12 a year.</span></div><b>at cost</b></div>
            <div className="total">
              <div><span className="eyebrow">All in, for most people</span><p className="big-num">about $13<small> / month</small></p></div>
              <Link className="btn btn-ink" to="/#search">Find your email</Link>
            </div>
          </div>
        </div>
      </section>

      <Closing />
    </>
  );
}
