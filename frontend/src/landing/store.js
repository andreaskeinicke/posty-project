import { useEffect, useState } from 'react';

// Per-visitor search history and saved addresses, kept in this browser only.
// Every read and write is guarded: private windows and blocked storage just mean no history.

const KEYS = { recent: 'posty.recent.v1', saved: 'posty.saved.v1' };
const EVENT = 'posty-store';
const MAX_RECENT = 8;
const MAX_SAVED = 30;

function read(key) {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage unavailable: keep going without history */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addRecent(name) {
  const n = (name || '').trim();
  if (!n) return;
  const list = read(KEYS.recent).filter(x => x.name.toLowerCase() !== n.toLowerCase());
  list.unshift({ name: n, at: Date.now() });
  write(KEYS.recent, list.slice(0, MAX_RECENT));
}

export function clearRecent() { write(KEYS.recent, []); }

export function isSaved(saved, address) { return saved.some(s => s.address === address); }

export function toggleSaved({ local, domain, price }) {
  const address = local + '@' + domain;
  const list = read(KEYS.saved);
  const next = list.some(s => s.address === address)
    ? list.filter(s => s.address !== address)
    : [{ address, local, domain, price, at: Date.now() }, ...list].slice(0, MAX_SAVED);
  write(KEYS.saved, next);
}

export function useStore() {
  const [state, setState] = useState(() => ({ recent: read(KEYS.recent), saved: read(KEYS.saved) }));
  useEffect(() => {
    const sync = () => setState({ recent: read(KEYS.recent), saved: read(KEYS.saved) });
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return state;
}
