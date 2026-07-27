import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../config/supabaseClient';
import './ChatFinder.css';
import './EmailResults.css';

// Character normalization for domain-safe names
const CHAR_MAPPINGS = {
  'ø': 'o', 'ö': 'o', 'å': 'aa', 'æ': 'ae', 'ü': 'ue', 'ä': 'ae', 'ß': 'ss',
  'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'ç': 'c',
  'ñ': 'n', 'á': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ã': 'a', 'õ': 'o'
};

const COUNTRY_TLDS = {
  'denmark': ['.dk', '.eu', '.me'], 'danmark': ['.dk', '.eu', '.me'],
  'united states': ['.us', '.io', '.me'], 'usa': ['.us', '.io', '.me'],
  'united kingdom': ['.uk', '.io', '.me'], 'uk': ['.uk', '.io', '.me'],
  'spain': ['.es', '.eu', '.io'], 'germany': ['.de', '.eu', '.io'],
  'france': ['.fr', '.eu', '.io'], 'netherlands': ['.nl', '.eu', '.io'],
  'sweden': ['.se', '.eu', '.me'], 'norway': ['.no', '.eu', '.me'],
  'default': ['.com', '.io', '.me']
};

const normalizeName = (name) => {
  let n = name.toLowerCase();
  for (const [s, r] of Object.entries(CHAR_MAPPINGS)) n = n.replace(new RegExp(s, 'g'), r);
  return n.normalize('NFD').replace(/[̀-ͯ]/g, '');
};

const parseName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
};

const USE_CHIPS = [
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'side_hustle', label: 'Side hustle' },
  { value: 'all', label: 'A bit of everything' }
];

function ChatFinder({ onBack }) {
  const [messages, setMessages] = useState([
    {
      from: 'posty',
      text: "Hi, I'm Posty 👋 I find email addresses you'll actually be proud to say out loud — on your own domain, working inside the Gmail you already use.\n\nWhat's your full name?"
    }
  ]);
  const [stage, setStage] = useState('name'); // name → use → location → generating → results
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState({ fullName: '', primaryUseCase: null, country: '', city: '' });
  const [results, setResults] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, results, showMore]);

  const say = (text, extra = {}) =>
    setMessages(m => [...m, { from: 'posty', text, ...extra }]);
  const userSays = (text) =>
    setMessages(m => [...m, { from: 'user', text }]);

  const handleName = (raw) => {
    const fullName = raw.trim();
    if (fullName.length < 2) return;
    userSays(fullName);
    const { firstName } = parseName(fullName);
    setAnswers(a => ({ ...a, fullName }));
    setStage('use');
    setTimeout(() => say(`Nice to meet you, ${firstName}! What will you mostly use the address for?`), 350);
  };

  const handleUse = (chip) => {
    userSays(chip.label);
    setAnswers(a => ({ ...a, primaryUseCase: chip.value }));
    setStage('location');
    setTimeout(() => say('Got it. Where are you based? Just the country — add a city if you like ("Denmark, Copenhagen").'), 350);
  };

  const handleLocation = async (raw) => {
    const text = raw.trim();
    if (text.length < 2) return;
    userSays(text);
    const [countryPart, cityPart] = text.split(',').map(s => s.trim());
    const merged = { ...answers, country: countryPart, city: cityPart || '' };
    setAnswers(merged);
    setStage('generating');
    setTimeout(() => say('Give me ~10 seconds — I\'m building your options and checking what\'s actually available…', { typing: true }), 350);
    await generate(merged);
  };

  const generate = async (a) => {
    try {
      const { firstName, middleName, lastName } = parseName(a.fullName);
      const tlds = COUNTRY_TLDS[a.country.toLowerCase()] || COUNTRY_TLDS['default'];
      const { data: { session } } = await supabase.auth.getSession();

      const response = await axios.post('/api/questionnaire/analyze', {
        responses: {
          name: a.fullName,
          tld_preference: tlds.map(t => t.replace('.', '')),
          _metadata: {
            firstName, middleName, lastName,
            normalizedName: normalizeName(a.fullName),
            country: a.country, city: a.city, tlds,
            primaryUseCase: a.primaryUseCase
          }
        }
      }, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      const s = response.data.suggestions;
      setResults(s);
      setStage('results');
      setMessages(m => m.filter(msg => !msg.typing));
      say(s.pitch
        ? `Here's what I found — all checked and free to register. My recommendation: ${s.pitch}`
        : 'Here\'s what I found — all checked and free to register.');
    } catch (err) {
      console.error('Generate failed:', err);
      setMessages(m => m.filter(msg => !msg.typing));
      say('Hmm, something went wrong on my end. Give it another try?');
      setStage('location');
    }
  };

  const handleBuyNow = async (suggestion) => {
    setIsCheckingOut(true);
    setSelectedEmail(suggestion.email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.post('/api/checkout/create-session', {
        domainName: suggestion.domain,
        domainPrice: suggestion.price || 0,
        caseId: results?.caseId || null
      }, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      say('The checkout hiccuped — try that Buy button again.');
      setIsCheckingOut(false);
      setSelectedEmail(null);
    }
  };

  const handleSend = () => {
    const value = input;
    setInput('');
    if (stage === 'name') handleName(value);
    else if (stage === 'location') handleLocation(value);
  };

  const visibleResults = results
    ? (showMore ? [...results.suggestions, ...(results.more || [])] : results.suggestions)
    : [];

  return (
    <div className="chatfinder-container">
      <div className="chatfinder-card">
        <div className="chatfinder-header">
          <button className="chat-back" onClick={onBack}>←</button>
          <div className="chat-title">Posty</div>
          <div className="chat-subtitle">your email concierge</div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.from}${msg.typing ? ' typing' : ''}`}>
              {msg.text}
              {msg.typing && <span className="dots"><span>.</span><span>.</span><span>.</span></span>}
            </div>
          ))}

          {stage === 'use' && (
            <div className="chat-chips">
              {USE_CHIPS.map(chip => (
                <button key={chip.value} className="chat-chip" onClick={() => handleUse(chip)}>
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {stage === 'results' && results && (
            <div className="chat-results">
              <div className="email-list">
                {visibleResults.map((s, i) => (
                  <div key={i} className={`email-row${s.pick ? ' pick-row' : ''}`}>
                    <div className="row-main">
                      <div className="row-email">
                        {s.email}
                        {s.pick && <span className="pick-tag">My pick</span>}
                      </div>
                      <div className="row-note">{s.reasoning || s.pattern}</div>
                    </div>
                    <div className="row-price">{s.price > 0 ? `+$${s.price.toFixed(0)}/yr` : ''}</div>
                    <button
                      onClick={() => handleBuyNow(s)}
                      disabled={isCheckingOut}
                      className="row-buy"
                    >
                      {isCheckingOut && selectedEmail === s.email ? '…' : 'Buy'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="chat-results-footer">
                {!showMore && (results.more || []).length > 0 && (
                  <button className="chat-chip" onClick={() => setShowMore(true)}>
                    Show {results.more.length} more
                  </button>
                )}
                <span className="chat-results-note">$5/month + the domain. We set up everything with your Gmail.</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {(stage === 'name' || stage === 'location') && (
          <div className="chat-input-bar">
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={stage === 'name' ? 'Your full name…' : 'Your country…'}
            />
            <button onClick={handleSend} disabled={!input.trim()}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatFinder;
