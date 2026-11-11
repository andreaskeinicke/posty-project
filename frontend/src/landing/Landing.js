import React, { useEffect, useRef, useState } from 'react';
import { candidates, domainsFor, rank, priceOf, money } from './names';
import './landing.css';

// The Posty landing page: pitch, search for an address, one button to get it.
// `api` is injected so the same page runs against the real backend or a demo:
//   api.checkDomains(domains) -> Promise<{ [domain]: { available, price } }>
//   api.startCheckout({ address, domain, price }) -> Promise<{ url } | { simulated: true }>
// `onOpenChat` opens the guided ChatFinder for people who want suggestions.

const POSTY_MONTHLY = 5;
const STYLES = [
  ['all', 'Best picks'], ['pro', 'Professional'], ['short', 'Short'], ['fun', 'Playful'], ['family', 'Family']
];

function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="plg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FA4F5" /><stop offset="1" stopColor="#3F7FE6" />
        </linearGradient>
      </defs>
      <path d="M16 3c7.7 0 13 5 13 11.6S23.7 26 16 26c-1.6 0-3.1-.2-4.5-.6L5 29l1.6-6C4.3 20.9 3 18 3 14.6 3 8 8.3 3 16 3z" fill="url(#plg)" />
      <path d="M10 11.5l6 4.5 6-4.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25.5" cy="6.5" r="3.6" fill="#D4553A" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

function Address({ local, domain }) {
  return <span className="addr">{local}<b>@</b>{domain}</span>;
}

function ResultCard({ c, availability, index, onGet }) {
  const [tld, setTld] = useState(c.avail[0]);
  const domain = c.base + tld;
  const price = priceOf(domain, availability);
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
        <button type="button" className="btn btn-ink" onClick={() => onGet({ local: c.local, domain, price })}>Get this email</button>
      </div>
    </article>
  );
}

function Sheet({ pick, api, onClose }) {
  const [stage, setStage] = useState('review'); // review | working | setup | done | error
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const closeRef = useRef(null);
  const address = pick.local + '@' + pick.domain;
  const steps = [
    `Registering ${pick.domain} in your name`,
    'Creating your Google Workspace (you sign in once)',
    'Adding verification and mail records',
    'Turning on spam protection (SPF, DKIM, DMARC)'
  ];

  useEffect(() => {
    closeRef.current && closeRef.current.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (stage !== 'setup') return undefined;
    if (step >= steps.length) { setStage('done'); return undefined; }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setStep(s => s + 1), reduce ? 150 : 900);
    return () => clearTimeout(t);
  }, [stage, step, steps.length]);

  const go = async () => {
    setStage('working'); setError('');
    try {
      const res = await api.startCheckout({ address, domain: pick.domain, price: pick.price });
      if (res && res.url) { window.location.href = res.url; return; }
      setStage('setup'); setStep(0);
    } catch (e) {
      setError('We could not start checkout. Try again in a moment, or write to hello@posty.club.');
      setStage('review');
    }
  };

  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pl-sheet-title">
        <div className="top">
          <span className="kicker">{stage === 'review' || stage === 'working' ? 'Get this email' : 'We handle the rest'}</span>
          <button ref={closeRef} className="x" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <h3 id="pl-sheet-title">{stage === 'review' || stage === 'working' ? <>Make it <em className="s">yours.</em></> : stage === 'done' ? <>Your mail <em className="s">moved in.</em></> : 'Setting up your email'}</h3>
        <div className="big"><Address local={pick.local} domain={pick.domain} /></div>

        {(stage === 'review' || stage === 'working') && (
          <>
            <div className="lines">
              <div><span>Domain {pick.domain}, 1 year</span><span>{money(pick.price)}</span></div>
              <div><span>Posty, first month</span><span>{money(POSTY_MONTHLY)}</span></div>
              <div className="tot"><span>Due today</span><span>{money(pick.price + POSTY_MONTHLY)}</span></div>
              <div className="muted"><span>Google Workspace, from $7 a month, is billed by Google after you sign in.</span></div>
            </div>
            {error && <p className="err" role="alert">{error}</p>}
            <button className="btn btn-blue" type="button" style={{ padding: 15 }} onClick={go} disabled={stage === 'working'}>
              {stage === 'working' ? 'Opening checkout…' : 'Get my email'}
            </button>
            <p className="fine">Secure payment by Stripe. Cancel any time and keep your domain.</p>
          </>
        )}

        {(stage === 'setup' || stage === 'done') && (
          <ul className="track">
            {steps.map((s, i) => (
              <li key={s} className={i < step ? 'done' : i === step && stage === 'setup' ? 'run' : ''}><i />{s}</li>
            ))}
          </ul>
        )}
        {stage === 'done' && (
          <>
            <p>Sign in at gmail.com as <b className="mono">{address}</b>. Everything else is already set up.</p>
            {api.demo && <p className="fine">Demo: nothing was bought or charged. The real flow runs these same four steps.</p>}
            <button className="btn btn-ink" type="button" onClick={onClose} style={{ alignSelf: 'flex-start' }}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Landing({ api, onOpenChat, initialName = '' }) {
  const [name, setName] = useState(initialName);
  const [style, setStyle] = useState('all');
  const [availability, setAvailability] = useState({});
  const [list, setList] = useState([]);
  const [status, setStatus] = useState(initialName ? 'loading' : 'idle'); // idle | loading | ready | error
  const [query, setQuery] = useState(initialName);
  const [pick, setPick] = useState(null);
  const inputRef = useRef(null);
  const reqId = useRef(0);

  const search = async value => {
    const q = value.trim();
    setQuery(q);
    if (!q) { setStatus('idle'); setList([]); return; }
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
    if (initialName) search(initialName);
    // Run once on mount with the prefilled name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = status === 'ready' ? rank(list, availability, style) : [];
  const focusSearch = e => {
    if (e) e.preventDefault();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => inputRef.current && inputRef.current.focus(), 350);
  };

  return (
    <div className="pl">
      <header className="nav">
        <div className="wrap">
          <a className="logo" href="#top" onClick={focusSearch} aria-label="Posty home"><Logo />Posty</a>
          <nav aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#examples">Examples</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="btn btn-ink" href="#top" onClick={focusSearch}>Find your address</a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-in">
            <span className="pill"><i />A real Gmail inbox on your own domain</span>
            <h1>Get your dream email, <em className="s">today.</em></h1>
            <p className="lede">Type your name. We find an address on a domain nobody owns yet, register it in your name and set it up as a real Gmail inbox. You press one button. We handle the rest.</p>

            <form className="finder" autoComplete="off" onSubmit={e => { e.preventDefault(); search(name); }}>
              <label className="sr" htmlFor="pl-q">Your name</label>
              <span className="at" aria-hidden="true">@</span>
              <input id="pl-q" ref={inputRef} value={name} maxLength={60} placeholder="Type your name, e.g. Maya Lindqvist" onChange={e => setName(e.target.value)} />
              <button className="btn btn-blue" type="submit">Find my email</button>
            </form>
            <div className="vibes" role="group" aria-label="Style">
              {STYLES.map(([k, label]) => (
                <button key={k} type="button" className="chip" aria-pressed={style === k} onClick={() => setStyle(k)}>{label}</button>
              ))}
            </div>
            {onOpenChat && <p className="alt">Not sure what you want? <button type="button" onClick={onOpenChat}>Let Posty suggest some →</button></p>}

            {status !== 'idle' && (
              <div className="results-wrap" aria-live="polite">
                <div className="results-head">
                  <h2>Addresses you can have today</h2>
                  {status === 'ready' && <p>{results.length ? `${results.length} free for “${query}”` : ''}</p>}
                </div>
                <div className="results">
                  {status === 'loading' && [0, 1, 2].map(i => <div key={i} className="skeleton" />)}
                  {status === 'ready' && results.map((c, i) => (
                    <ResultCard key={c.local + c.base + style} c={c} index={i} availability={availability} onGet={setPick} />
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

        <section className="band" id="how">
          <div className="wrap">
            <div className="head">
              <span className="kicker">How it works</span>
              <h2>Three steps, and the hard parts <em className="s">aren't yours.</em></h2>
            </div>
            <div className="steps">
              <div className="step">
                <span className="n">01</span><h3>Type your name</h3>
                <p>We try dozens of addresses and only show the ones on domains you can buy right now.</p>
                <div className="mini"><span className="mono">maya@lindqvist.me</span><span className="ok">● Available</span></div>
              </div>
              <div className="step">
                <span className="n">02</span><h3>Press one button</h3>
                <p>Pay for the domain and your first month. We register it in your name and set up Google Workspace.</p>
                <div className="mini"><span className="ok">✓ Domain registered</span><span className="ok">✓ Mail records added</span><span className="ok">✓ Spam protection on</span></div>
              </div>
              <div className="step">
                <span className="n">03</span><h3>Open Gmail</h3>
                <p>Sign in with your new address. It's a full Gmail inbox, with Calendar and Drive, on web and phone.</p>
                <div className="mini">
                  <div className="inbox-row"><i /><span><b>Sofie</b> · Coffee on Thursday?</span></div>
                  <div className="inbox-row"><i /><span><b>Posty</b> · Your mail moved in</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="band paper" id="examples">
          <div className="wrap">
            <div className="head">
              <span className="kicker">Examples</span>
              <h2>Names people are <em className="s">proud to hand out.</em></h2>
              <p className="sub">Short, real and easy to say out loud. No dots, no numbers, no birth years.</p>
            </div>
            <div className="examples">
              <div className="ex"><span className="kicker">Surname domain</span><Address local="maya" domain="lindqvist.me" /><p>Fits on a business card and a wedding invite.</p></div>
              <div className="ex"><span className="kicker">Full name</span><Address local="jonas" domain="jonasbager.com" /><p>The one people guess right the first time.</p></div>
              <div className="ex"><span className="kicker">Family</span><Address local="sofie" domain="theokafors.family" /><p>One domain, an address for everyone at home.</p></div>
              <div className="ex"><span className="kicker">Friendly</span><Address local="hi" domain="leanguyen.me" /><p>For a portfolio, a newsletter or a side project.</p></div>
              <div className="ex"><span className="kicker">Short</span><Address local="tk" domain="tkmail.com" /><p>Two letters to type at every checkout.</p></div>
              <div className="ex"><span className="kicker">Professional</span><Address local="a.holm" domain="aholm.dev" /><p>Looks right in a recruiter's inbox.</p></div>
            </div>
          </div>
        </section>

        <section className="band" id="pricing">
          <div className="wrap price-grid">
            <div className="head">
              <span className="kicker">Pricing</span>
              <h2>One price. No hidden fees. <em className="s">Yours forever.</em></h2>
              <p className="sub">You pay Posty for the setup and care, Google for the inbox, and the domain at cost. If you leave, the domain and the inbox stay yours.</p>
            </div>
            <div className="plan">
              <div className="amt">$5<small> / month for Posty</small></div>
              <div className="lines">
                <div><span>Posty: search, setup and support</span><span>$5 / month</span></div>
                <div><span>Google Workspace Business Starter, billed by Google</span><span>from $7 / month</span></div>
                <div><span>Your domain, at what the registrar charges</span><span>$11–25 / year</span></div>
                <div className="tot"><span>Usually in total</span><span>about $13 / month</span></div>
              </div>
              <ul className="checks">
                <li>A real Gmail inbox at your own address</li>
                <li>Calendar, Drive and Meet on the same account</li>
                <li>All DNS, verification and spam protection set up for you</li>
                <li>Extra addresses like hello@ on the same domain</li>
              </ul>
              <a className="btn btn-blue" href="#top" onClick={focusSearch} style={{ alignSelf: 'flex-start' }}>Find my email</a>
            </div>
          </div>
        </section>

        <section className="band ink">
          <div className="wrap">
            <div className="head">
              <span className="kicker">House rules</span>
              <h2>The address is yours. <em className="s">So is everything in it.</em></h2>
            </div>
            <div className="rules">
              <div className="rule"><h3>You own the domain</h3><p>It's registered in your name. Leave Posty any time and take it with you.</p></div>
              <div className="rule"><h3>We can't read your mail</h3><p>Your inbox lives in your own Google account. Posty only manages the domain's settings.</p></div>
              <div className="rule"><h3>Google-grade security</h3><p>SPF, DKIM and DMARC on from day one, so your mail lands and nobody can send as you.</p></div>
              <div className="rule"><h3>Help within a day</h3><p>Write to hello@posty.club and get a real answer, usually within hours.</p></div>
            </div>
          </div>
        </section>

        <section className="band" id="faq">
          <div className="wrap">
            <div className="head">
              <span className="kicker">FAQ</span>
              <h2>Fair <em className="s">questions.</em></h2>
            </div>
            <div className="faq">
              <details open><summary>What do I actually get?</summary><p>An email address on your own domain, like maya@lindqvist.me, as a full Gmail inbox through Google Workspace. You read and send in Gmail on the web and on your phone, and you also get Calendar, Drive and Meet.</p></details>
              <details><summary>Why Google Workspace?</summary><p>It's the only way to send from your own address in Gmail everywhere. From January 2027 free Gmail accounts can no longer send as an outside address, so we set you up the way Google supports.</p></details>
              <details><summary>How much does it cost?</summary><p>$5 a month to Posty, Google Workspace from $7 a month paid to Google, and the domain at cost, usually $11 to $25 a year. No setup fee.</p></details>
              <details><summary>Do I need to know anything technical?</summary><p>No. We register the domain and add every record Google needs. You sign in with Google once during setup.</p></details>
              <details><summary>How long does it take?</summary><p>Most addresses work within minutes of checkout. We email you as soon as yours is live.</p></details>
              <details><summary>What happens to my old Gmail address?</summary><p>Nothing. It keeps working. We can forward it to your new inbox so you don't miss anything while people switch.</p></details>
              <details><summary>Who owns the domain?</summary><p>You do. It's registered in your name, and you can move it anywhere if you leave Posty.</p></details>
              <details><summary>Can I use a domain I already own?</summary><p>Yes. Tell us the domain during setup and we'll connect it instead of buying a new one.</p></details>
            </div>
          </div>
        </section>

        <section className="band closing">
          <div className="wrap hero-in">
            <span className="kicker">Ready when you are</span>
            <h2>Still introducing yourself with an <em className="s strike">@hotmail.com?</em></h2>
            <a className="btn btn-ink" href="#top" onClick={focusSearch}>Find your address</a>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span className="logo"><Logo size={24} />Posty</span>
          <nav aria-label="Footer">
            <a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a><span>hello@posty.club</span>
          </nav>
          <p className="legal">Posty is run by Andreas Keinicke Holding ApS · CVR 39464640 · Sortbærvej 41, 8600 Silkeborg, Denmark</p>
        </div>
      </footer>

      {pick && <Sheet pick={pick} api={api} onClose={() => setPick(null)} />}
    </div>
  );
}
