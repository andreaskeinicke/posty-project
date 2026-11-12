import React, { useEffect, useRef, useState } from 'react';

// Small playful pieces for the home page. Every animation is CSS driven and
// switched off under prefers-reduced-motion (see landing.css, "Delight").

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Adds .in to the element once it scrolls into view.
export function useReveal(threshold = 0.25) {
  const ref = useRef(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window) || reducedMotion()) { setIn(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

export function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const [ref, inView] = useReveal(0.15);
  return <Tag ref={ref} className={'reveal ' + (inView ? 'in ' : '') + className} {...rest}>{children}</Tag>;
}

// Placeholder that types example names, then rests on the real hint.
const EXAMPLES = ['Anna Keinicke', 'The Hansen family', 'Bageriet Tilia', 'Mikkel Holm'];
export function useTypedPlaceholder(active, fallback) {
  const [text, setText] = useState(fallback);
  useEffect(() => {
    if (!active || reducedMotion()) { setText(fallback); return undefined; }
    let i = 0, j = 0, dir = 1, wait = 0, alive = true;
    const tick = () => {
      if (!alive) return;
      const word = EXAMPLES[i];
      if (wait > 0) { wait--; }
      else if (dir === 1) { j++; if (j >= word.length) { dir = -1; wait = 18; } }
      else { j--; if (j <= 0) { dir = 1; i = (i + 1) % EXAMPLES.length; wait = 4; } }
      setText('Try ' + word.slice(0, j));
      timer = setTimeout(tick, dir === 1 ? 80 : 35);
    };
    let timer = setTimeout(tick, 900);
    return () => { alive = false; clearTimeout(timer); };
  }, [active, fallback]);
  return text;
}

// The little "postcards" floating around the hero (desktop only).
const CARDS = [
  { addr: 'mikkel@hansen.dk', note: 'Moved in yesterday', tone: 'blue', pos: 'c1' },
  { addr: 'hej@bagerietilia.dk', note: 'Small business, big name', tone: 'peach', pos: 'c2' },
  { addr: 'sofie@nord.studio', note: 'Freelance, finally', tone: 'mint', pos: 'c3' },
  { addr: 'mor@familienholm.dk', note: 'The whole family moved', tone: 'sun', pos: 'c4' }
];
export function FloatCards() {
  return (
    <div className="float-cards" aria-hidden="true">
      {CARDS.map(c => (
        <div key={c.addr} className={'fcard ' + c.pos}>
          <span className={'ava t-' + c.tone}>{c.addr[0].toUpperCase()}</span>
          <div><b>{c.addr}</b><span>{c.note}</span></div>
        </div>
      ))}
    </div>
  );
}

// Hand drawn underline that draws itself under a word.
export function Scribble({ children }) {
  return (
    <span className="scribble">
      {children}
      <svg viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true">
        <path d="M3 12c38-7 92-10 194-5" />
      </svg>
    </span>
  );
}

// Old address gets crossed out and the new one lands.
export function BeforeAfter() {
  const [ref, inView] = useReveal(0.5);
  return (
    <div ref={ref} className={'before-after' + (inView ? ' in' : '')}>
      <div className="ba-old"><span className="ba-label">Before</span><span className="ba-addr">anna.k1985@hotmail.com</span></div>
      <svg className="ba-arrow" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 20h22M22 12l8 8-8 8" /></svg>
      <div className="ba-new"><span className="ba-label">After</span><span className="ba-addr">anna@keinicke.com</span></div>
    </div>
  );
}

// An inbox where letters from people you like arrive one by one.
const LETTERS = [
  { from: 'Mum', tone: 'peach', subj: 'Love the new address!', body: 'So much easier to remember. Saving it now.', time: '09:12' },
  { from: 'Jonas from work', tone: 'blue', subj: 'Re: Friday', body: 'Nice, very professional. See you at 10.', time: '09:40' },
  { from: 'Tennis club', tone: 'mint', subj: 'Your membership is renewed', body: 'Updated your contact details. Welcome back.', time: '10:05' },
  { from: 'Sofie', tone: 'sun', subj: 'Wait, is that your own domain?', body: 'How did you get that? I want one.', time: '10:31' }
];
export function InboxDemo() {
  const [ref, inView] = useReveal(0.35);
  return (
    <div ref={ref} className={'inbox-demo' + (inView ? ' in' : '')} aria-label="Example inbox">
      <div className="ib-head">
        <span className="ib-dots" aria-hidden="true"><i /><i /><i /></span>
        <b>anna@keinicke.com</b>
        <span className="ib-count">4 new</span>
      </div>
      <ul>
        {LETTERS.map((l, i) => (
          <li key={l.from} style={{ transitionDelay: (inView ? 250 + i * 420 : 0) + 'ms' }}>
            <span className={'ava t-' + l.tone}>{l.from[0]}</span>
            <div className="ib-main">
              <div className="ib-top"><b>{l.from}</b><span>{l.time}</span></div>
              <p><b>{l.subj}</b> {l.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
