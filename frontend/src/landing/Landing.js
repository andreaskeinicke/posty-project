import React, { useEffect, useRef, useState } from 'react';
import { candidates, domainsFor, rank, priceOf, money } from './names';
import { addRecent, clearRecent, isSaved, toggleSaved, useStore } from './store';
import { Address, AGENT_PROMPT, Closing, CopyButton, Heart, Link, Sheet, useMeta, POSTY_MONTHLY, WORKSPACE_FROM } from './ui';

// Home: pitch, search for an address, one button to get it.
// Deep links: /?q=Maya+Lindqvist runs a search; add &pick=maya@lindqvist.me to open checkout for that address.

const STYLES = [
  ['all', 'Best picks'], ['pro', 'Professional'], ['short', 'Short'], ['fun', 'Playful'], ['family', 'Family']
];

function ResultCard({ c, availability, index, onGet, saved }) {
  const [tld, setTld] = useState(c.avail[0]);
  const domain = c.base + tld;
  const price = priceOf(domain, availability);
  const on = isSaved(saved, c.local + '@' + domain);
  return (
    <article className={'card' + (index === 0 ? ' top' : '')} style={{ animationDelay: index * 50 + 'ms' }}>
      <div className="row1">
        <span className="kicker">{c.label}</span>
        <span className="avail">Available</span>
      </div>
      <Address local={c.local} domain={domain} />
      {c.avail.length > 1 && (
        <div className="tlds" role="group" aria-label="Domain ending">
          {c.avail.map(t => (
            <button key={t} type="button" className="tld" aria-pressed={t === tld} onClick={() => setTld(t)}>{t}</button>
          ))}
        </div>
      )}
      <div className="foot">
        <span className="price">Domain <b>{money(price)}</b>/yr</span>
        <span className="acts">
          <button type="button" className="icon-btn" aria-pressed={on} aria-label={on ? 'Remove from saved' : 'Save for later'} onClick={() => toggleSaved({ local: c.local, domain, price })}><Heart on={on} /></button>
          <button type="button" className="btn btn-ink" onClick={() => onGet({ local: c.local, domain, price })}>Get this email</button>
        </span>
      </div>
    </article>
  );
}

function readQuery() {
  const p = new URLSearchParams(window.location.search);
  return { q: (p.get('q') || p.get('name') || '').slice(0, 60), pick: (p.get('pick') || '').toLowerCase() };
}

export default function Landing({ api, onOpenChat, initialName = '' }) {
  useMeta(
    'Posty · Get your dream email today',
    'Type your name and get an email address on your own domain, set up as a real Gmail inbox. One button, about five minutes. $5 a month plus Google Workspace.',
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
  const [pick, setPick] = useState(null);
  const { recent, saved } = useStore();
  const inputRef = useRef(null);
  const reqId = useRef(0);
  const pendingPick = useRef(start.pick);

  const search = async value => {
    const q = value.trim();
    setQuery(q); setName(q);
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
      const want = pendingPick.current;
      pendingPick.current = '';
      if (want && want.includes('@')) {
        const [local, domain] = want.split('@');
        if (avail[domain] && avail[domain].available) setPick({ local, domain, price: priceOf(domain, avail) });
      }
    } catch (e) {
      if (id === reqId.current) setStatus('error');
    }
  };

  useEffect(() => {
    if (first) search(first);
    if (window.location.hash === '#search' && inputRef.current) inputRef.current.focus();
    // Run once on mount with the prefilled or linked name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = status === 'ready' ? rank(list, availability, style) : [];
  const shownRecent = recent.filter(r => r.name.toLowerCase() !== query.toLowerCase()).slice(0, 5);

  return (
    <>
      <section className="hero" id="search">
        <div className="glow" aria-hidden="true" />
        <div className="wrap hero-in">
          <span className="pill"><i />A real Gmail inbox on your own domain</span>
          <h1>Get your dream email, <em className="s">today.</em></h1>
          <p className="lede">Type your name. We find an address on a domain nobody owns yet, register it in your name and set it up as a real Gmail inbox. You press one button. We handle the rest.</p>

          <form className="finder" role="search" autoComplete="off" onSubmit={e => { e.preventDefault(); search(name); }}>
            <label className="sr" htmlFor="pl-q">Your name</label>
            <span className="at" aria-hidden="true">@</span>
            <input id="pl-q" name="q" ref={inputRef} value={name} maxLength={60} placeholder="Type your name, e.g. Maya Lindqvist" onChange={e => setName(e.target.value)} />
            <button className="btn btn-blue" type="submit">Find my email</button>
          </form>
          <div className="vibes" role="group" aria-label="Style">
            {STYLES.map(([k, label]) => (
              <button key={k} type="button" className="chip" aria-pressed={style === k} onClick={() => setStyle(k)}>{label}</button>
            ))}
          </div>
          {shownRecent.length > 0 && (
            <div className="recent" aria-label="Recent searches">
              <span>Recent</span>
              {shownRecent.map(r => (
                <button key={r.name} type="button" className="recent-chip" onClick={() => search(r.name)}>{r.name}</button>
              ))}
              <button type="button" className="link-btn" onClick={clearRecent}>Clear</button>
            </div>
          )}
          <p className="alt">
            {onOpenChat && <>Not sure what you want? <button type="button" onClick={onOpenChat}>Let Posty suggest some →</button><span className="dot-sep">·</span></>}
            <CopyButton className="link-btn" text={AGENT_PROMPT} label="Copy a prompt for your AI" />
          </p>

          {status !== 'idle' && (
            <div className="results-wrap" aria-live="polite">
              <div className="results-head">
                <h2>Addresses you can have today</h2>
                {status === 'ready' && <p>{results.length ? `${results.length} free for “${query}”` : ''}</p>}
              </div>
              <div className="results">
                {status === 'loading' && [0, 1, 2].map(i => <div key={i} className="skeleton" />)}
                {status === 'ready' && results.map((c, i) => (
                  <ResultCard key={c.local + c.base + style} c={c} index={i} availability={availability} onGet={setPick} saved={saved} />
                ))}
              </div>
              {status === 'ready' && !results.length && <p className="note">Nothing free in this style. Try another style, or add a middle name.</p>}
              {status === 'error' && <p className="note">We couldn't check domains just now. Try again in a moment.</p>}
              {api.demo && status === 'ready' && <p className="note">Demo: availability and prices are simulated on this page. On posty.club every address is checked live before it is shown.</p>}
            </div>
          )}
        </div>
      </section>

      <div className="wrap">
        <div className="facts">
          <div><b>~5 min</b><span>from search to inbox</span></div>
          <div><b>Real Gmail</b><span>on web and phone</span></div>
          <div><b>Yours</b><span>the domain is in your name</span></div>
          <div><b>At cost</b><span>domain, no markup</span></div>
        </div>
      </div>

      <section className="band">
        <div className="wrap">
          <div className="head">
            <span className="kicker">How it works</span>
            <h2>Three steps, and the hard parts <em className="s">aren't yours.</em></h2>
          </div>
          <div className="steps">
            <div className="step t-sky">
              <span className="n">01</span><h3>Type your name</h3>
              <p>We try dozens of addresses and only show the ones on domains you can buy right now.</p>
              <div className="mini"><span className="mono">maya@lindqvist.me</span><span className="ok">● Available</span></div>
            </div>
            <div className="step t-blush">
              <span className="n">02</span><h3>Press one button</h3>
              <p>Pay for the domain and your first month. We register it in your name and set up Google Workspace.</p>
              <div className="mini"><span className="ok">✓ Domain registered</span><span className="ok">✓ Mail records added</span><span className="ok">✓ Spam protection on</span></div>
            </div>
            <div className="step t-mint">
              <span className="n">03</span><h3>Open Gmail</h3>
              <p>Sign in with your new address. It's a full Gmail inbox, with Calendar and Drive, on web and phone.</p>
              <div className="mini">
                <div className="inbox-row"><i /><span><b>Sofie</b> · Coffee on Thursday?</span></div>
                <div className="inbox-row"><i /><span><b>Posty</b> · Your mail moved in</span></div>
              </div>
            </div>
          </div>
          <Link className="more" to="/how-it-works">See every step we handle →</Link>
        </div>
      </section>

      <section className="band paper">
        <div className="wrap">
          <div className="head">
            <span className="kicker">Examples</span>
            <h2>Names people are <em className="s">proud to hand out.</em></h2>
            <p className="sub">Short, real and easy to say out loud. No dots, no numbers, no birth years.</p>
          </div>
          <div className="examples">
            <div className="ex"><span className="kicker">Surname domain</span><Address local="maya" domain="lindqvist.me" /><p>Fits on a business card and a wedding invite.</p></div>
            <div className="ex"><span className="kicker">Family</span><Address local="sofie" domain="theokafors.family" /><p>One domain, an address for everyone at home.</p></div>
            <div className="ex"><span className="kicker">Friendly</span><Address local="hi" domain="leanguyen.me" /><p>For a portfolio, a newsletter or a side project.</p></div>
          </div>
          <Link className="more" to="/examples">See more ideas →</Link>
        </div>
      </section>

      <section className="band">
        <div className="wrap price-grid">
          <div className="head">
            <span className="kicker">Pricing</span>
            <h2>One price. No hidden fees. <em className="s">Yours forever.</em></h2>
            <p className="sub">You pay Posty for the setup and care, Google for the inbox, and the domain at cost. If you leave, the domain and the inbox stay yours.</p>
            <Link className="more" to="/pricing">Work out your total →</Link>
          </div>
          <div className="plan">
            <div className="amt">${POSTY_MONTHLY}<small> / month for Posty</small></div>
            <div className="lines">
              <div><span>Posty: search, setup and support</span><span>${POSTY_MONTHLY} / month</span></div>
              <div><span>Google Workspace Business Starter, billed by Google</span><span>from ${WORKSPACE_FROM} / month</span></div>
              <div><span>Your domain, at what the registrar charges</span><span>$11–25 / year</span></div>
              <div className="tot"><span>Usually in total</span><span>about $13 / month</span></div>
            </div>
            <a className="btn btn-blue" href="#search" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => inputRef.current && inputRef.current.focus(), 350); }} style={{ alignSelf: 'flex-start' }}>Find my email</a>
          </div>
        </div>
      </section>

      <section className="band soft">
        <div className="wrap">
          <div className="head">
            <span className="kicker">House rules</span>
            <h2>The address is yours. <em className="s">So is everything in it.</em></h2>
          </div>
          <div className="rules">
            <div className="rule"><h3>You own the domain</h3><p>It's registered in your name. Leave Posty any time and take it with you.</p></div>
            <div className="rule"><h3>We can't read your mail</h3><p>Your inbox lives in your own Google account. Posty only manages the domain's settings.</p></div>
            <div className="rule"><h3>Spam protection on</h3><p>SPF, DKIM and DMARC from day one, so your mail lands and nobody can send as you.</p></div>
            <div className="rule"><h3>Help within a day</h3><p>Write to hello@posty.club and get a real answer, usually within hours.</p></div>
          </div>
        </div>
      </section>

      <Closing />

      {pick && <Sheet pick={pick} api={api} onClose={() => setPick(null)} />}
    </>
  );
}
