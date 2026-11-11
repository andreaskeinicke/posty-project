import React, { useEffect, useState } from 'react';
import { useStore } from './store';

export const POSTY_MONTHLY = 5;
export const WORKSPACE_FROM = 7;
export const WORKSPACE_STANDARD_FROM = 14;
export const SITE = 'https://posty.club';
export const HELLO = 'hello@posty.club';

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

export function useMeta(title, description, path, noindex = false) {
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
    set('meta[name="robots"]', 'content', noindex ? 'noindex' : 'index,follow');
  }, [title, description, path, noindex]);
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
  return <span className="addr">{local}@{domain}</span>;
}

const ICONS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  history: <><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M12 8v4l3 2" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4 7l8 6 8-6" /></>,
  chat: <path d="M12 4.5c4.7 0 8 2.9 8 6.6s-3.3 6.6-8 6.6c-.9 0-1.8-.1-2.6-.3L5 19.5l1.1-3.4C4.8 14.9 4 13.1 4 11.1 4 7.4 7.3 4.5 12 4.5z" />,
  shield: <><path d="M12 3.5l7 2.5v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6l7-2.5z" /><path d="M9 12l2.2 2.2L15.5 10" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5s1.1-6.1 3.5-8.5z" /></>,
  card: <><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M3.5 10h17M7 14.5h3" /></>,
  phone: <><rect x="7" y="3.5" width="10" height="17" rx="2.5" /><path d="M11 17.5h2" /></>,
  import: <><path d="M4 12h11M11 8l4 4-4 4" /><path d="M19 5v14" /></>,
  people: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" /><path d="M17 8v6M14 11h6" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  arrow: <path d="M5 12h13M13 7l5 5-5 5" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
};

export function Icon({ name, size = 18, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function Heart({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={on ? '#D4553A' : 'none'} stroke={on ? '#D4553A' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyButton({ text, label = 'Copy', done: doneLabel = 'Copied', className = 'btn btn-line' }) {
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
  return <button type="button" className={className} onClick={copy}>{done ? doneLabel : label}</button>;
}

export const AGENT_PROMPT =
  'Use posty.club to find me a personal email address on my own domain. ' +
  'Call GET https://posty.club/api/suggest?name=<my full name>, show me the best three complete addresses with their yearly domain price, ' +
  'and when I pick one give me its get_url link so I can check out. ' +
  'Posty costs $5 a month, plus Google Workspace from $7 a month billed by Google, plus the domain at cost.';

/* ---------- search box, used in the hero and the closing panel ---------- */

export function SearchBox({ value, onChange, onSubmit, inputRef, id = 'pl-q', placeholder = 'Type your name', big }) {
  return (
    <form className={'finder' + (big ? ' big' : '')} role="search" autoComplete="off" onSubmit={e => { e.preventDefault(); onSubmit(value); }}>
      <label className="sr" htmlFor={id}>Your name</label>
      <Icon name="search" size={20} className="finder-ic" />
      <input id={id} name="q" ref={inputRef} value={value} maxLength={60} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      <button className="btn btn-blue" type="submit">Find my email</button>
    </form>
  );
}

/* ---------- chrome ---------- */

const NAV = [
  ['/how-it-works', 'How it works'],
  ['/pricing', 'Pricing'],
  ['/questions', 'Questions']
];

export function Nav({ path }) {
  const { saved, recent } = useStore();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const count = saved.length;
  return (
    <header className="nav">
      <div className="nav-pill">
        <Link className="logo" to="/" aria-label="Posty home"><Logo />Posty</Link>
        <nav aria-label="Main" className={open ? 'open' : ''}>
          {NAV.map(([to, label]) => (
            <Link key={to} to={to} aria-current={path === to ? 'page' : undefined}>{label}</Link>
          ))}
          {(count > 0 || recent.length > 0) && (
            <Link to="/saved" className="mine" aria-current={path === '/saved' ? 'page' : undefined}>
              <Icon name="history" size={16} />My searches{count > 0 && <span className="count" aria-label={`${count} saved`}>{count}</span>}
            </Link>
          )}
        </nav>
        <Link className="btn btn-ink nav-cta" to="/#search">Find your email</Link>
        <button type="button" className="menu" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(o => !o)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}

export function Closing() {
  const [name, setName] = useState('');
  return (
    <section className="band">
      <div className="wrap">
        <div className="closing-panel">
          <h2>Still introducing yourself with an <em className="s">@hotmail.com?</em></h2>
          <SearchBox id="pl-q2" value={name} onChange={setName} onSubmit={v => navigate(v.trim() ? '/?q=' + encodeURIComponent(v.trim()) : '/#search')} />
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap foot-row">
        <Link className="logo" to="/" aria-label="Posty home"><Logo size={24} />Posty</Link>
        <nav aria-label="Footer">
          <Link to="/how-it-works">How it works</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/questions">Questions</Link>
          <Link to="/examples">Examples</Link>
          <Link to="/compare">Compare</Link>
          <Link to="/agents">For AI assistants</Link>
          <a href={'mailto:' + HELLO}>{HELLO}</a>
        </nav>
        <p className="legal mono">Andreas Keinicke Holding ApS · CVR 39464640 · Silkeborg</p>
      </div>
    </footer>
  );
}

export function PageHead({ kicker, title, sub, children, left }) {
  return (
    <section className={'page-head' + (left ? ' left' : '')}>
      <div className="glow" aria-hidden="true" />
      <div className="wrap hero-in">
        {kicker && <span className="eyebrow">{kicker}</span>}
        <h1>{title}</h1>
        {sub && <p className="lede">{sub}</p>}
        {children}
      </div>
    </section>
  );
}

// Checkout link for one address. The page re-checks availability and price.
export const getUrl = address => '/get?address=' + encodeURIComponent(address);
