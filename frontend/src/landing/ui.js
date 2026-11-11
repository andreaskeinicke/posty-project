import React, { useEffect, useRef, useState } from 'react';
import { money } from './names';
import { useStore } from './store';

export const POSTY_MONTHLY = 5;
export const WORKSPACE_FROM = 7;
export const SITE = 'https://posty.club';

/* ---------- routing ---------- */

export function navigate(to) {
  if (to === window.location.pathname + window.location.search) return;
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (!to.includes('#')) window.scrollTo(0, 0);
}

export function Link({ to, className, children, onClick, ...rest }) {
  const handle = e => {
    if (onClick) onClick(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (to.startsWith('/')) { e.preventDefault(); navigate(to); }
  };
  return <a href={to} className={className} onClick={handle} {...rest}>{children}</a>;
}

export function useMeta(title, description, path) {
  useEffect(() => {
    document.title = title;
    const set = (sel, attr, val) => {
      let el = document.head.querySelector(sel);
      if (!el) {
        el = document.createElement(sel.startsWith('link') ? 'link' : 'meta');
        const m = sel.match(/\[(\w+(?::\w+)?)="([^"]+)"\]/);
        if (m) el.setAttribute(m[1], m[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };
    set('meta[name="description"]', 'content', description);
    set('meta[property="og:title"]', 'content', title);
    set('meta[property="og:description"]', 'content', description);
    set('meta[property="og:url"]', 'content', SITE + path);
    set('link[rel="canonical"]', 'href', SITE + path);
  }, [title, description, path]);
}

/* ---------- brand bits ---------- */

export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="plg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FB0F7" /><stop offset="1" stopColor="#3F7FE6" />
        </linearGradient>
      </defs>
      <path d="M16 3c7.7 0 13 5 13 11.6S23.7 26 16 26c-1.6 0-3.1-.2-4.5-.6L5 29l1.6-6C4.3 20.9 3 18 3 14.6 3 8 8.3 3 16 3z" fill="url(#plg)" />
      <path d="M10 11.5l6 4.5 6-4.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25.5" cy="6.5" r="3.6" fill="#D4553A" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

export function Address({ local, domain }) {
  return <span className="addr">{local}<b>@</b>{domain}</span>;
}

export function Heart({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={on ? '#D4553A' : 'none'} stroke={on ? '#D4553A' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyButton({ text, label = 'Copy', className = 'btn btn-line' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch (e) {
      window.prompt('Copy this:', text);
    }
  };
  return <button type="button" className={className} onClick={copy}>{done ? 'Copied' : label}</button>;
}

export const AGENT_PROMPT =
  'Help me get a personal email address on my own domain with Posty (posty.club). ' +
  'Call GET https://posty.club/api/suggest?name=<my full name> to get addresses whose domains are free to register, ' +
  'show me the best few with their yearly domain price, and when I pick one give me its get_url link so I can check out. ' +
  'Posty costs $5 a month plus Google Workspace (from $7 a month, billed by Google) and the domain at cost.';

/* ---------- chrome ---------- */

const NAV = [
  ['/how-it-works', 'How it works'],
  ['/examples', 'Examples'],
  ['/pricing', 'Pricing'],
  ['/compare', 'Compare'],
  ['/faq', 'FAQ']
];

export function Nav({ path }) {
  const { saved } = useStore();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className="nav">
      <div className="nav-pill">
        <Link className="logo" to="/" aria-label="Posty home"><Logo />Posty</Link>
        <nav aria-label="Main" className={open ? 'open' : ''}>
          {NAV.map(([to, label]) => (
            <Link key={to} to={to} aria-current={path === to ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
        <Link to="/saved" className="saved-link" aria-label={`Saved addresses: ${saved.length}`}>
          <Heart on={saved.length > 0} /><span>{saved.length}</span>
        </Link>
        <Link className="btn btn-ink nav-cta" to="/#search">Find your address</Link>
        <button type="button" className="menu" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(o => !o)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}

export function Closing() {
  return (
    <section className="band">
      <div className="wrap">
        <div className="closing-panel">
          <span className="kicker">Ready when you are</span>
          <h2>Still introducing yourself with an <em className="s strike">@hotmail.com?</em></h2>
          <Link className="btn btn-ink" to="/#search">Find your address</Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <span className="logo"><Logo size={24} />Posty</span>
          <p>A post office of your own. Your address on your own domain, as a real Gmail inbox.</p>
        </div>
        <nav aria-label="Product">
          <span className="kicker">Product</span>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/examples">Examples</Link>
          <Link to="/compare">Compare</Link>
        </nav>
        <nav aria-label="Help">
          <span className="kicker">Help</span>
          <Link to="/faq">FAQ</Link>
          <Link to="/saved">Saved addresses</Link>
          <span>hello@posty.club</span>
        </nav>
        <nav aria-label="Build">
          <span className="kicker">For AI agents</span>
          <Link to="/agents">Use Posty from an AI</Link>
          <a href="/llms.txt">llms.txt</a>
          <a href="/openapi.json">API (OpenAPI)</a>
        </nav>
        <p className="legal">Posty is run by Andreas Keinicke Holding ApS · CVR 39464640 · Sortbærvej 41, 8600 Silkeborg, Denmark</p>
      </div>
    </footer>
  );
}

/* ---------- checkout sheet ---------- */

export function Sheet({ pick, api, onClose }) {
  const [stage, setStage] = useState('review'); // review | working | setup | done
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
    if (closeRef.current) closeRef.current.focus();
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

  const reviewing = stage === 'review' || stage === 'working';
  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pl-sheet-title">
        <div className="top">
          <span className="kicker">{reviewing ? 'Get this email' : 'We handle the rest'}</span>
          <button ref={closeRef} className="x" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <h3 id="pl-sheet-title">{reviewing ? <>Make it <em className="s">yours.</em></> : stage === 'done' ? <>Your mail <em className="s">moved in.</em></> : 'Setting up your email'}</h3>
        <div className="big"><Address local={pick.local} domain={pick.domain} /></div>

        {reviewing && (
          <>
            <div className="lines">
              <div><span>Domain {pick.domain}, 1 year</span><span>{money(pick.price)}</span></div>
              <div><span>Posty, first month</span><span>{money(POSTY_MONTHLY)}</span></div>
              <div className="tot"><span>Due today</span><span>{money(pick.price + POSTY_MONTHLY)}</span></div>
              <div className="muted"><span>Google Workspace, from ${WORKSPACE_FROM} a month, is billed by Google after you sign in.</span></div>
            </div>
            {error && <p className="err" role="alert">{error}</p>}
            <button className="btn btn-blue" type="button" style={{ padding: 15 }} onClick={go} disabled={stage === 'working'}>
              {stage === 'working' ? 'Opening checkout…' : 'Get my email'}
            </button>
            <p className="fine">Secure payment by Stripe. Cancel any time and keep your domain.</p>
          </>
        )}

        {!reviewing && (
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

export function PageHead({ kicker, title, sub, children }) {
  return (
    <section className="page-head">
      <div className="glow" aria-hidden="true" />
      <div className="wrap hero-in">
        {kicker && <span className="pill"><i />{kicker}</span>}
        <h1>{title}</h1>
        {sub && <p className="lede">{sub}</p>}
        {children}
      </div>
    </section>
  );
}
