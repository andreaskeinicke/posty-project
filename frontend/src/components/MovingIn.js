import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './MovingIn.css';
import SupportChat from '../landing/SupportChat';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const POLL_MS = 5000;

/**
 * "Moving in" tracker: the customer's view of the automated setup after payment.
 * Follows the Paper design (five steps, one of which is the customer's turn).
 * Opened from the Stripe success page (sessionId) or from our emails (token).
 */
function MovingIn({ sessionId, token: initialToken }) {
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const tokenRef = useRef(initialToken || null);

  const load = useCallback(async () => {
    const url = tokenRef.current
      ? `${API_BASE_URL}/api/fulfilment/orders/${encodeURIComponent(tokenRef.current)}`
      : `${API_BASE_URL}/api/fulfilment/orders/by-session/${encodeURIComponent(sessionId)}`;
    try {
      const r = await axios.get(url, { validateStatus: s => s === 200 || s === 202 });
      if (r.status === 202) return; // payment confirmation still on its way
      tokenRef.current = r.data.token;
      setView(r.data);
      // Keep a link that survives closing the tab
      if (sessionId && window.history?.replaceState) window.history.replaceState(null, '', `/order/${r.data.token}`);
    } catch (e) {
      setError('We could not load your order. Refresh in a moment, or check your inbox: we email every step.');
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!view || ['working', 'waiting_on_you'].includes(view.status)) load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load, view]);

  if (error) return <Shell><p className="mi-sub">{error}</p></Shell>;
  if (!view) return <Shell><p className="mi-sub">Payment received. Getting your order…</p></Shell>;

  const address = view.address || view.domain;
  const headline = {
    done: <>Your address is <em>ready.</em></>,
    refunded: <>We refunded <em>you.</em></>,
    person_on_it: <>A person is <em>on it.</em></>
  }[view.status] || <>Your letters are <em>on their way.</em></>;

  const sub = {
    done: `${address} works. Send yourself a letter to see it.`,
    refunded: `Someone registered ${view.domain} moments before us. Your payment is refunded and nothing renews.`,
    person_on_it: `Setting up ${view.domain} needs a human touch. We will write to you, usually the same day.`,
    waiting_on_you: `Payment received. We are setting up ${address} now. There is one thing only you can do, and it takes about a minute.`
  }[view.status] || `Payment received. We are setting up ${address} now.`;

  return (
    <Shell>
      <p className="mi-eyebrow">Moving in{view.testMode ? ' · test mode' : ''}</p>
      <h1 className="mi-title">{headline}</h1>
      <p className="mi-sub">{sub}</p>

      <div className="mi-grid">
        <section className="mi-card">
          <div className="mi-card-head">
            <strong>{address}</strong>
            <span className="mi-pill">{view.doneCount} of {view.totalSteps} done</span>
          </div>
          <div className="mi-bar"><div style={{ width: `${(view.doneCount / view.totalSteps) * 100}%` }} /></div>
          <ol className="mi-steps">
            {view.steps.map(step => (
              <li key={step.key} className={`mi-step mi-${step.state}`}>
                <span className="mi-dot" aria-hidden="true">{step.state === 'done' ? '✓' : ''}</span>
                <div className="mi-step-body">
                  <div className="mi-step-row">
                    <span className="mi-step-title">{step.title}</span>
                    <span className="mi-step-meta">{stepMeta(step)}</span>
                  </div>
                  <p>{step.detail}</p>
                  {step.key === 'your_turn' && view.action && (
                    <ActionCard action={view.action} token={tokenRef.current} onSaved={setView} />
                  )}
                </div>
              </li>
            ))}
          </ol>
          {view.canAddDkim && <DkimCard token={tokenRef.current} onSaved={setView} />}
        </section>

        <aside className="mi-side">
          <SupportChat orderToken={tokenRef.current} title="Ask about your setup" intro="We can check your domain's mail records and tell you the next step. Refunds and account changes go to a person." />
          <div className="mi-note"><h3>We keep you posted</h3><p>Every step lands in your current inbox, so you can close this page. Nothing to watch.</p></div>
          <div className="mi-note"><h3>A real person if you need one</h3><p>Stuck on the Google step? Write to us and a person replies, usually the same day.</p></div>
          <div className="mi-note"><h3>Already safe</h3><p>The domain is registered to you. If you stop here, it is still yours.</p></div>
        </aside>
      </div>
    </Shell>
  );
}

function stepMeta(step) {
  if (step.state === 'done' && step.at) return new Date(step.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (step.state === 'waiting_on_you') return 'waiting on you';
  if (step.state === 'working') return 'working on it';
  return '';
}

function ActionCard({ action, token, onSaved }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async e => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/fulfilment/orders/${encodeURIComponent(token)}/workspace`, { verification: value });
      onSaved(r.data);
    } catch (err) {
      setMsg(err.response?.data?.message || 'That did not work. Try again in a moment.');
    } finally { setSaving(false); }
  };

  return (
    <div className="mi-action">
      <div>
        <strong>{action.title}</strong>
        <p>{action.body}</p>
      </div>
      {action.url && (
        <a className="mi-btn" href={action.url} target="_blank" rel="noopener noreferrer">Continue with Google</a>
      )}
      {action.input === 'workspace_verification' && (
        <form className="mi-form" onSubmit={submit}>
          <label htmlFor="mi-verify">Google verification code</label>
          <input id="mi-verify" value={value} onChange={e => setValue(e.target.value)}
            placeholder="google-site-verification=…" autoComplete="off" spellCheck="false" />
          <button className="mi-btn" type="submit" disabled={saving || !value.trim()}>{saving ? 'Saving…' : 'Connect my mail'}</button>
          {msg && <p className="mi-error" role="alert">{msg}</p>}
        </form>
      )}
    </div>
  );
}

function DkimCard({ token, onSaved }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState(null);
  if (!open) return <button className="mi-link" onClick={() => setOpen(true)}>Add DKIM from Google (optional, improves delivery)</button>;
  const submit = async e => {
    e.preventDefault(); setMsg(null);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/fulfilment/orders/${encodeURIComponent(token)}/workspace`, { dkim: value });
      onSaved(r.data);
    } catch (err) { setMsg(err.response?.data?.message || 'That did not work.'); }
  };
  return (
    <form className="mi-form" onSubmit={submit}>
      <label htmlFor="mi-dkim">DKIM record from Google Admin › Apps › Gmail › Authenticate email</label>
      <textarea id="mi-dkim" rows={3} value={value} onChange={e => setValue(e.target.value)} placeholder="v=DKIM1; k=rsa; p=…" />
      <button className="mi-btn" type="submit" disabled={!value.trim()}>Save DKIM</button>
      {msg && <p className="mi-error" role="alert">{msg}</p>}
    </form>
  );
}

function Shell({ children }) {
  return <main className="mi-page"><div className="mi-wrap">{children}</div></main>;
}

export default MovingIn;
