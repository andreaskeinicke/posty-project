import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Setup coach on the order page: reads the domain's public mail records (read-only) and shows
 * what is fine and the one next step. Renders nothing while the support agent is off, or for
 * test-mode orders (their DNS is simulated).
 */
const MARK = { ok: '✓', warn: '!', missing: '•', wrong: '×', unknown: '?' };

export default function SetupCheck({ token, refreshKey }) {
  const [diag, setDiag] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);

  const run = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const r = await axios.get(`/api/support/orders/${encodeURIComponent(token)}/diagnostics`);
      setDiag(r.data);
      setCheckedAt(new Date());
    } catch (e) {
      setDiag(null); // 404 while the agent is off: stay hidden
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => { run(); }, [run, refreshKey]);

  if (!diag || diag.testMode || !diag.checks || !diag.checks.length) return null;
  const good = diag.checks.filter(c => c.status === 'ok').length;

  return (
    <section className="scheck" aria-label="Setup check">
      <div className="scheck-head">
        <div>
          <h3>Setup check</h3>
          <p>{good} of {diag.checks.length} look right from the outside{checkedAt ? ` · checked ${checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
        </div>
        <button type="button" className="scheck-btn" onClick={run} disabled={busy}>{busy ? 'Checking…' : 'Check again'}</button>
      </div>
      <ul>
        {diag.checks.map(c => (
          <li key={c.key} className={'scheck-' + c.status}>
            <span className="scheck-mark" aria-hidden="true">{MARK[c.status] || '?'}</span>
            <div><b>{c.label}</b><span>{c.detail}</span></div>
          </li>
        ))}
      </ul>
      {diag.nextStep && <p className="scheck-next"><b>Next:</b> {diag.nextStep}</p>}
    </section>
  );
}
