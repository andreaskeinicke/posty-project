import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './SupportChat.css';

/**
 * Ask Posty: the support agent's chat box. Renders nothing unless the server says the
 * support agent is on (SUPPORT_AGENT_ENABLED), so it is safe to ship before launch.
 * On the Moving in page it passes the order link, so the agent can check that order's setup.
 */
const SUGGESTIONS = {
  help: ['Do I own the domain?', 'How do I add it to my phone?', 'Can I bring my old mail?'],
  order: ['Where do I find the Google code?', 'Check my setup', 'Why is my mail in spam?']
};

export default function SupportChat({ orderToken = null, title = 'Ask Posty', intro }) {
  const [enabled, setEnabled] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    let live = true;
    axios.get('/api/support/status').then(r => { if (live) setEnabled(Boolean(r.data && r.data.enabled)); }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy]);

  if (!enabled) return null;

  const send = async text => {
    const content = String(text || '').trim().slice(0, 1500);
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const r = await axios.post('/api/support/chat', {
        messages: next.map(({ role, content: c }) => ({ role, content: c })),
        ...(orderToken ? { orderToken } : {})
      });
      setMessages([...next, { role: 'assistant', content: r.data.reply, escalated: r.data.escalated, nextStep: r.data.nextStep }]);
    } catch (err) {
      setError(err.response && err.response.status === 429
        ? 'That is a lot of questions at once. Try again in a few minutes.'
        : 'Something went wrong on our side. Write to hello@posty.club and a person replies.');
    } finally {
      setBusy(false);
    }
  };

  const chips = SUGGESTIONS[orderToken ? 'order' : 'help'];

  return (
    <section className="sc" aria-label={title}>
      <div className="sc-head">
        <span className="sc-dot" aria-hidden="true" />
        <div>
          <h3>{title}</h3>
          <p>{intro || 'Answers from our help pages, any time. Refunds and account changes go to a person.'}</p>
        </div>
      </div>

      <div className="sc-log" ref={logRef} aria-live="polite">
        {!messages.length && (
          <div className="sc-chips">
            {chips.map(c => <button key={c} type="button" className="sc-chip" onClick={() => send(c)}>{c}</button>)}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`sc-msg sc-${m.role}`}>
            <p>{m.content}</p>
            {m.escalated && <span className="sc-tag">Passed to a person</span>}
          </div>
        ))}
        {busy && <div className="sc-msg sc-assistant sc-typing" aria-label="Posty is typing"><span /><span /><span /></div>}
        {error && <p className="sc-error" role="alert">{error}</p>}
      </div>

      <form className="sc-form" onSubmit={e => { e.preventDefault(); send(draft); }}>
        <label className="sr" htmlFor={orderToken ? 'sc-in-order' : 'sc-in'}>Your question</label>
        <input
          id={orderToken ? 'sc-in-order' : 'sc-in'}
          value={draft}
          maxLength={1500}
          autoComplete="off"
          placeholder="Type a question"
          onChange={e => setDraft(e.target.value)}
        />
        <button type="submit" disabled={busy || !draft.trim()}>Send</button>
      </form>
      <p className="sc-fine">Please do not share passwords or card numbers here. We never ask for them.</p>
    </section>
  );
}
