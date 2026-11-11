import React, { useEffect, useRef, useState } from 'react';
import { candidates, domainsFor, rank, addressRows, money } from './names';
import { addRecent, clearRecent, isSaved, toggleSaved, useStore } from './store';
import { Closing, Heart, Icon, Link, SearchBox, getUrl, navigate, useMeta, POSTY_MONTHLY, WORKSPACE_FROM } from './ui';

// Home: pitch, search for an address, one button to get it.
// Deep links: /?q=Maya+Lindqvist runs a search. The older &pick=local@domain opens checkout for that address.

const FILTERS = [
  ['all', 'Best first'], ['pro', 'Professional'], ['short', 'Short'], ['fun', 'Playful'], ['family', 'Family']
];
const FIRST = 4;

export function ResultRow({ r, index, saved }) {
  const on = isSaved(saved, r.address);
  const top = index === 0;
  return (
    <li className={'row' + (top ? ' top' : '')} style={{ animationDelay: Math.min(index, 8) * 40 + 'ms' }}>
      <div className="row-main">
        <div className="row-addr">
          {top && <i className="dot" aria-hidden="true" />}
          <span className="addr">{r.address}</span>
          {top && <span className="badge">Our pick</span>}
        </div>
        <p className="row-note">{r.note}</p>
      </div>
      <div className="row-price"><b>{money(r.price)} / year</b><span>domain, at cost</span></div>
      <div className="row-acts">
        <button type="button" className="icon-btn" aria-pressed={on} aria-label={on ? `Remove ${r.address} from saved` : `Save ${r.address}`} onClick={() => toggleSaved(r)}><Heart on={on} /></button>
        <Link className={'btn ' + (top ? 'btn-blue' : 'btn-soft')} to={getUrl(r.address)}>Get this email</Link>
      </div>
    </li>
  );
}

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
  const { recent, saved } = useStore();
  const inputRef = useRef(null);
  const reqId = useRef(0);

  const search = async value => {
    const q = value.trim();
    setQuery(q); setName(q); setShowAll(false);
    if (!q) { setStatus('idle'); setList([]); return; }
    if (!api.demo || value !== initialName) {
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
    if (start.pick && start.pick.includes('@')) { navigate(getUrl(start.pick)); return; }
    if (first) search(first);
    if (window.location.hash === '#search' && inputRef.current) inputRef.current.focus();
    // Run once on mount with the prefilled or linked name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = status === 'ready' ? addressRows(rank(list, availability, style), availability) : [];
  const shown = showAll ? rows.slice(0, 16) : rows.slice(0, FIRST);
  const shownRecent = recent.filter(r => r.name.toLowerCase() !== query.toLowerCase()).slice(0, 5);

  return (
    <>
      <section className="hero" id="search">
        <div className="glow" aria-hidden="true" />
        <div className="wrap hero-in">
          <span className="eyebrow pill"><i />Your own domain · Gmail by Google Workspace</span>
          <h1>Get your dream email <em className="s">today.</em></h1>
          <p className="lede">Search a name, pick an address, press one button. Domain, inbox and setup: <b>we handle the rest.</b></p>

          <SearchBox big value={name} onChange={setName} onSubmit={search} inputRef={inputRef} placeholder="Type your name, e.g. Anna Keinicke" />
          <p className="hint">
            Try your name, your family, or your business.
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
            <div className="panel results-panel" aria-live="polite">
              <div className="panel-head">
                <p>
                  {status === 'loading' && <>Checking addresses for “{query}”…</>}
                  {status === 'ready' && <><b>{rows.length} {rows.length === 1 ? 'address' : 'addresses'} available</b> for “{query}”, best first</>}
                  {status === 'error' && <>We couldn't check domains just now.</>}
                </p>
                {status === 'ready' && <span className="live">{api.demo ? 'Simulated · demo' : 'Checked live · just now'}</span>}
              </div>
              <div className="filters" role="group" aria-label="Style">
                {FILTERS.map(([k, label]) => (
                  <button key={k} type="button" className="chip" aria-pressed={style === k} onClick={() => { setStyle(k); setShowAll(false); }}>{label}</button>
                ))}
              </div>
              {status === 'loading' && <ul className="rows">{[0, 1, 2].map(i => <li key={i} className="skeleton" />)}</ul>}
              {status === 'ready' && rows.length > 0 && (
                <ul className="rows">{shown.map((r, i) => <ResultRow key={r.address + style} r={r} index={i} saved={saved} />)}</ul>
              )}
              {status === 'ready' && !rows.length && <p className="note pad">Nothing free in this style. Try another style, or add a middle name.</p>}
              {status === 'error' && <p className="note pad">Try again in a moment.</p>}
              {status === 'ready' && rows.length > 0 && (
                <div className="panel-foot">
                  <span>Only addresses you can actually get. Registered in your name, so you own it.</span>
                  {!showAll && rows.length > FIRST && <button type="button" className="link-btn" onClick={() => setShowAll(true)}>Show {Math.min(rows.length, 16) - FIRST} more →</button>}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="band">
        <div className="wrap split2 center">
          <div className="head">
            <span className="eyebrow">After you press the button</span>
            <h2>From search to sent, <em className="s">the same day.</em></h2>
            <ol className="tiles">
              <li className="t-sky"><span className="n">01</span><div><h3>We register your domain</h3><p>It's bought at cost and registered in your name. You own it, not us.</p></div></li>
              <li className="t-peach"><span className="n">02</span><div><h3>We set up your inbox</h3><p>Your Google Workspace account, DNS records and security settings, all done for you. Nothing to configure.</p></div></li>
              <li className="t-mint"><span className="n">03</span><div><h3>You start sending</h3><p>Sign in to Gmail with your new address on your phone and laptop. We help bring your old mail along.</p></div></li>
            </ol>
            <Link className="more" to="/how-it-works">See every step →</Link>
          </div>
          <div className="tracker-card" aria-label="Example of the moving-in tracker">
            <div className="tc-head"><div><span className="eyebrow">Moving in</span><b>anna@keinicke.com</b></div><span className="stamp" aria-hidden="true">NOV<br />11</span></div>
            <ul>
              <li><Icon name="check" size={14} />keinicke.com registered to you</li>
              <li><Icon name="check" size={14} />Google Workspace account created</li>
              <li><Icon name="check" size={14} />Mail and security records connected</li>
              <li className="last"><Icon name="check" size={14} />Inbox ready. Your first letter is waiting.</li>
            </ul>
            <p>You get a status update at every step, and a real person if anything needs a hand.</p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap split2 center">
          <div className="head">
            <span className="eyebrow">Pricing</span>
            <h2>One honest price. <em className="s">No surprises.</em></h2>
            <p className="sub">You see every line before you pay. Cancel any time, and the domain and mailbox stay yours.</p>
          </div>
          <div className="panel receipt">
            <div className="line"><div><b>Posty</b><span>Finding, buying and setting up your address. Renewals, support and a person to ask.</span></div><b>${POSTY_MONTHLY} / month</b></div>
            <div className="line"><div><b>Google Workspace</b><span>Gmail on your own domain, billed by Google straight to your own account.</span></div><b>from ${WORKSPACE_FROM} / month</b></div>
            <div className="line"><div><b>Your domain</b><span>Registered in your name at cost. A .com is about $12 a year.</span></div><b>at cost</b></div>
            <div className="total">
              <div><span className="eyebrow">All in, for most people</span><p className="big-num">about $13<small> / month</small></p></div>
              <Link className="btn btn-ink" to="/pricing">See pricing</Link>
            </div>
          </div>
        </div>
      </section>

      <Closing />
    </>
  );
}
