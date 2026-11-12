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
  search: ['Which of these would you pick?', 'Is .com better than .dk?', 'What happens when I press Get?'],
  checkout: ['What do I pay today?', 'Starter or Standard?', 'What happens after I pay?'],
  order: ['Where do I find the Google code?', 'Check my setup', 'Why is my mail in spam?'],
  welcome: ['Add it to my phone', 'Bring my old mail', 'What is DKIM?']
};

/**
 * stage: where the customer is (search, checkout, order, welcome, help). context: what the page
 * knows (query, address, plan, shown addresses), sent with each question. compact: a single
 * quiet line that opens into the chat, for pages where the chat should not compete with the task.
 */
export default function SupportChat({ orderToken = null, title = 'Ask Posty', intro, stage = orderToken ? 'order' : 'help', context = null, compact = false }) {
  const [open, setOpen] = useState(!compact);
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
        ...(orderToken ? { orderToken } : {}),
        context: { ...(context || {}), stage }
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

  const chips = SUGGESTIONS[stage] || SUGGESTIONS.help;

  if (!open) {
    return (
      <div className="sc-line">
        <span className="sc-dot" aria-hidden="true" />
        <span>{intro || 'Questions? Ask Posty.'}</span>
        <button type="button" className="link-btn" onClick={() => setOpen(true)}>{title} →</button>
      </div>
    );
  }

  return (
    <section className={'sc' + (compact ? ' sc-compact' : '')} aria-label={title}>
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

      {/* Not a <form>: the chat can sit inside the checkout form. */}
      <div className="sc-form" role="group" aria-label="Ask a question">
        <label className="sr" htmlFor={'sc-in-' + stage}>Your question</label>
        <input
          id={'sc-in-' + stage}
          value={draft}
          maxLength={1500}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Type a question"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(draft); } }}
        />
        <button type="button" disabled={busy || !draft.trim()} onClick={() => send(draft)}>Send</button>
      </div>
      <p className="sc-fine">Please do not share passwords or card numbers here. We never ask for them.</p>
    </section>
  );
}
