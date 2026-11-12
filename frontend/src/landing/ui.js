import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { SmileyWink } from '@phosphor-icons/react/dist/csr/SmileyWink';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { At } from '@phosphor-icons/react/dist/csr/At';
import { BookmarkSimple } from '@phosphor-icons/react/dist/csr/BookmarkSimple';
import { ChatCircle } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { Circle } from '@phosphor-icons/react/dist/csr/Circle';
import { ClockCounterClockwise } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise';
import { CreditCard } from '@phosphor-icons/react/dist/csr/CreditCard';
import { DeviceMobile } from '@phosphor-icons/react/dist/csr/DeviceMobile';
import { EnvelopeSimple } from '@phosphor-icons/react/dist/csr/EnvelopeSimple';
import { GlobeSimple } from '@phosphor-icons/react/dist/csr/GlobeSimple';
import { Heart as PHeart } from '@phosphor-icons/react/dist/csr/Heart';
import { House } from '@phosphor-icons/react/dist/csr/House';
import { Laptop } from '@phosphor-icons/react/dist/csr/Laptop';
import { LockSimple } from '@phosphor-icons/react/dist/csr/LockSimple';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Minus } from '@phosphor-icons/react/dist/csr/Minus';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { Question } from '@phosphor-icons/react/dist/csr/Question';
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { TrayArrowDown } from '@phosphor-icons/react/dist/csr/TrayArrowDown';
import { User } from '@phosphor-icons/react/dist/csr/User';
import { UsersThree } from '@phosphor-icons/react/dist/csr/UsersThree';

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

// Posty mark (final, Nov 12): blue speech-bubble P on a light tile, no dot.
// Source: project brand/final/posty-mark.svg (100x100).
const BUBBLE_P = 'M18.5 25A8.5 8.5 0 0 1 27 16.5H61.5A24 23.6 0 0 1 61.5 63.7H41.6Q39.6 63.7 38.1 65.1L23.4 79.6Q21.3 81.6 19.8 80.5Q18.5 79.6 18.5 77.6Z';
export function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="pm-tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F7FAFF" /><stop offset="1" stopColor="#E4EEFD" /></linearGradient>
        <linearGradient id="pm-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#C9DCF8" /></linearGradient>
        <linearGradient id="pm-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4C9DFB" /><stop offset="1" stopColor="#3383F0" /></linearGradient>
        <linearGradient id="pm-hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".45" /><stop offset=".18" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
        <filter id="pm-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" floodColor="#1F5FC4" floodOpacity=".28" /></filter>
      </defs>
      <rect x="1" y="1" width="98" height="98" rx="22" fill="url(#pm-tile)" stroke="url(#pm-rim)" strokeWidth="1.5" />
      <path d={BUBBLE_P} fill="url(#pm-p)" filter="url(#pm-sh)" />
      <path d={BUBBLE_P} fill="url(#pm-hi)" stroke="#2A74DF" strokeOpacity=".55" strokeWidth=".9" />
    </svg>
  );
}

export function Address({ local, domain }) {
  return <span className="addr">{local}@{domain}</span>;
}

// Icons: Phosphor (MIT licence), weight "regular", as drawn in the Paper frames.
const ICONS = {
  search: MagnifyingGlass, history: ClockCounterClockwise, check: Check, checkCircle: CheckCircle,
  mail: EnvelopeSimple, chat: ChatCircle, shield: ShieldCheck, globe: GlobeSimple, card: CreditCard,
  phone: DeviceMobile, laptop: Laptop, import: TrayArrowDown, user: User, people: UsersThree,
  lock: LockSimple, arrow: ArrowRight, heart: PHeart, bookmark: BookmarkSimple, at: At,
  home: House, help: Question, plus: Plus, minus: Minus, x: X
};

export function Icon({ name, size = 18, className, weight = 'regular' }) {
  const C = ICONS[name] || Circle;
  return <C className={className} size={size} weight={name === 'check' ? 'bold' : weight} aria-hidden="true" focusable="false" />;
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

// Closing headline joke (Andreas, Nov 12): the provider cycles through old-school
// addresses and lands on "boomermail.com" with a small wink. Static for reduced motion.
const OLD_MAIL = ['hotmail.com', 'yahoo.com', 'msn.com', 'live.com', 'boomermail.com'];
function OldMail() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const last = i === OLD_MAIL.length - 1;
    const t = setTimeout(() => setI((i + 1) % OLD_MAIL.length), last ? 4200 : i === 0 ? 2600 : 1500);
    return () => clearTimeout(t);
  }, [i]);
  const word = OLD_MAIL[i];
  const boomer = word === 'boomermail.com';
  return (
    <span className={'oldmail' + (boomer ? ' is-boomer' : '')}>
      <span key={word} className="om-word">
        {boomer ? <><span className="om-boomer">boomer</span>mail.com</> : word}?
      </span>
      {boomer && <SmileyWink className="om-wink" size="0.8em" weight="duotone" aria-hidden="true" />}
    </span>
  );
}

export function Closing() {
  const [name, setName] = useState('');
  return (
    <section className="band">
      <div className="wrap">
        <div className="closing-line">
          <h2 aria-label="Still on @hotmail.com? Get an address that is actually yours."><span className="om-line" aria-hidden="true">Still on @<OldMail /></span> <span className="dim" aria-hidden="true">Get an address that is actually yours.</span></h2>
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
        <Link className="logo" to="/" aria-label="Posty home"><Logo />Posty</Link>
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
