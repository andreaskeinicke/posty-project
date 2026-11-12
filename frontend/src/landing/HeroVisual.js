import React, { useEffect, useRef, useState } from 'react';
import { Logo } from './ui';

// Paper "Site v5 · refined": a photo frame with one glass panel of address results.
// Decorative, so it is hidden from screen readers.

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) { setInView(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// Types a few example names into an empty search box, then rests.
const EXAMPLES = ['Anna Keinicke', 'Jens Holm', 'Sofie Lund'];
export function useTypedPlaceholder(active, fallback) {
  const [text, setText] = useState(fallback);
  useEffect(() => {
    if (!active || prefersReducedMotion()) { setText(fallback); return undefined; }
    let i = 0, j = 0, dir = 1, pause = 0, timer;
    const tick = () => {
      const word = EXAMPLES[i];
      if (pause > 0) pause--;
      else if (dir === 1) { j++; if (j >= word.length) { dir = -1; pause = 22; } }
      else { j--; if (j <= 0) { dir = 1; i++; pause = 4; } }
      if (i >= EXAMPLES.length) { setText(fallback); return; }
      setText(j ? word.slice(0, j) : fallback);
      timer = setTimeout(tick, dir === 1 ? 90 : 30);
    };
    timer = setTimeout(tick, 1200);
    return () => clearTimeout(timer);
  }, [active, fallback]);
  return text;
}

const RESULTS = [
  ['anna@keinicke.com', '$12'], ['hi@annakeinicke.com', '$12'], ['anna@keinicke.dk', '$11'], ['anna@keinicke.studio', '$29']
];
export default function HeroVisual() {
  const [ref, inView] = useInView(0.35);
  return (
    <div className={'hero-visual' + (inView ? ' in' : '')} ref={ref} aria-hidden="true">
      <div className="hv-glass">
        <div className="hv-head"><Logo size={18} /><b>Posty</b><span>· anna keinicke</span></div>
        {RESULTS.map(([addr, price], i) => {
          const [local, domain] = addr.split('@');
          return (
            <div key={addr} className={'hv-row' + (i === 0 ? ' on' : '')} style={{ transitionDelay: inView ? 200 + i * 120 + 'ms' : '0ms' }}>
              <span className="hv-addr">{local}<span>@</span>{domain}</span>
              <span className="hv-price">{price} / yr</span>
              <span className={'hv-btn' + (i === 0 ? ' blue' : '')}>Get this email</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
