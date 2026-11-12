import React, { useEffect, useState } from 'react';
import { track } from './experiment';
import { priceOf, money } from './names';
import { CopyButton, HELLO, Icon, Link, Logo, navigate, useMeta, POSTY_MONTHLY, WORKSPACE_FROM } from './ui';
import { Photo } from './pages';
import SupportChat from './SupportChat';

// The "Get this email" flow, following the Paper frames:
// /get (details + receipt) -> Stripe -> /moving-in (tracker) -> /welcome (moved in).
// Fulfilment after payment is not built yet, so /moving-in and /welcome are UI only:
// they run a simulated progression and are not indexed.

const ADDRESS_RE = /^([a-z0-9][a-z0-9.-]{0,40})@([a-z0-9][a-z0-9-]{0,62}\.[a-z]{2,24})$/;

function readAddress() {
  const p = new URLSearchParams(window.location.search);
  const a = (p.get('address') || '').trim().toLowerCase();
  const m = a.match(ADDRESS_RE);
  return m ? { address: a, local: m[1], domain: m[2], demo: p.get('demo') === '1' } : null;
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function Stepper({ at }) {
  const steps = ['Address', 'Your details', 'Moving in'];
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>
          <span className="sn">{i < at ? <Icon name="check" size={12} /> : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}

export function CheckoutHeader({ at }) {
  return (
    <header className="nav">
      <div className="nav-pill co-pill">
        <Link className="logo" to="/" aria-label="Posty home"><Logo />Posty</Link>
        <Stepper at={at} />
        <span className="secure"><Icon name="lock" size={15} />Secure checkout</span>
      </div>
    </header>
  );
}

const COUNTRIES = [['DK', 'Denmark'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DE', 'Germany'], ['NL', 'Netherlands'], ['GB', 'United Kingdom'], ['US', 'United States'], ['', 'Somewhere else']];

export function Checkout({ api }) {
  const pick = readAddress();
  useMeta('Get your new email · Posty', 'Review your new address and every line of the receipt before you pay.', '/get', true);
  const [check, setCheck] = useState(pick ? 'loading' : 'bad'); // loading | ok | taken | bad | error
  const [price, setPrice] = useState(pick ? priceOf(pick.domain, {}) : 0);
  const [form, setForm] = useState({ firstName: pick ? cap(pick.local.split(/[.-]/)[0]) : '', lastName: '', contactEmail: '', country: 'DK' });
  const plan = 'starter'; // Workspace plan can be changed later with Google
  const [stage, setStage] = useState('review'); // review | working
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pick) return;
    let live = true;
    api.checkDomains([pick.domain]).then(avail => {
      if (!live) return;
      const a = avail[pick.domain];
      if (a && a.available) { setPrice(priceOf(pick.domain, avail)); setCheck('ok'); } else setCheck('taken');
    }).catch(() => live && setCheck('error'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pick) {
    return (
      <section className="page-head"><div className="glow" aria-hidden="true" /><div className="wrap hero-in">
        <h1>Which address <span className="dim">did you want?</span></h1>
        <p className="lede">This link doesn't name an address. Search for one and press Get this email.</p>
        <div className="cta-row"><Link className="btn btn-ink" to="/#search">Find your email</Link></div>
      </div></section>
    );
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const ready = check === 'ok' && stage === 'review';
  const go = async e => {
    e.preventDefault();
    if (!ready) return;
    setStage('working'); setError('');
    try {
      const res = await api.startCheckout({ address: pick.address, domain: pick.domain, price, plan, ...form });
      if (res && res.url) { if (!api.demo) track('checkout'); window.location.href = res.url; return; }
      navigate('/moving-in?address=' + encodeURIComponent(pick.address) + '&demo=1');
    } catch (err) {
      setError(`We couldn't open checkout. Try again in a moment, or write to ${HELLO}.`);
      setStage('review');
    }
  };

  const due = price + POSTY_MONTHLY;
  return (
    <section className="wrap v5-co">
      <form className="v5-co-main" onSubmit={go}>
        <h1>Almost yours. <span className="dim">Two short steps.</span></h1>
        {check === 'loading' && <p className="note">Checking that {pick.domain} is still free…</p>}
        {check === 'taken' && <p className="err" role="alert">Someone else has {pick.domain} now. <Link className="link-btn" to={'/?q=' + encodeURIComponent(pick.local + ' ' + pick.domain.split('.')[0])}>See similar addresses</Link></p>}
        {check === 'error' && <p className="err" role="alert">We couldn't check {pick.domain} just now. Reload in a moment.</p>}

        <h2 className="co-h">1 Who is the address for</h2>
        <div className="fields two">
          <label>First name<input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required maxLength={80} /></label>
          <label>Last name<input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required maxLength={80} /></label>
        </div>
        <div className="fields co-reach">
          <label>Where we can reach you now<input type="email" value={form.contactEmail} onChange={set('contactEmail')} autoComplete="email" required maxLength={254} placeholder="your current email, for setup updates" /></label>
          <label>Country<select value={form.country} onChange={set('country')} autoComplete="country">{COUNTRIES.map(([c, n]) => <option key={n} value={c}>{n}</option>)}</select></label>
        </div>
        <p className="fine">The domain is registered to this name. That makes it yours.</p>

        <h2 className="co-h">2 Payment</h2>
        <div className="co-pay"><span className="v5-tile"><Icon name="card" size={18} /></span><div><b>Card or wallet</b><span>Handled securely by Stripe. Posty never sees your card.</span></div><Icon name="lock" size={18} /></div>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="co-go">
          <button className="btn btn-ink" type="submit" disabled={!ready}>{stage === 'working' ? 'Opening secure checkout…' : 'Get ' + pick.address}</button>
          <span>Cancel any time. The domain stays yours.</span>
        </div>
        {api.demo && <p className="fine">Demo: nothing is bought or charged.</p>}
      </form>

      <aside className="v5-sum" aria-label="Your order">
        <div className="sum-addr"><Logo size={32} /><div><b className="addr">{pick.local}<span className="at">@</span>{pick.domain}</b><span>Your new address</span></div></div>
        <div className="line"><div><b>{pick.domain}</b><span>Domain, at cost, registered to you</span></div><b>{check === 'loading' ? '…' : money(price) + ' / year'}</b></div>
        <div className="line"><div><b>Posty</b><span>Setup, renewals and help</span></div><b>{money(POSTY_MONTHLY)} / month</b></div>
        <div className="line"><div><b>Google Workspace</b><span>Billed by Google to your own account</span></div><b>from ${WORKSPACE_FROM} / month</b></div>
        <div className="due"><b>Due today</b><b className="amt">{check === 'loading' ? '…' : money(due)}</b></div>
        <p className="fine">Posty's first month plus the domain's first year. Google bills Workspace separately. VAT is added where it applies.</p>
        <SupportChat compact stage="checkout" title="Ask before you pay" intro="Questions about what happens next?" context={{ address: pick.address, plan }} />
      </aside>
    </section>
  );
}

/* ---------- Moving in (UI only until fulfilment exists) ---------- */

export function MovingIn() {
  const pick = readAddress() || { address: 'you@yourname.com', domain: 'yourname.com', local: 'you' };
  useMeta('Moving in · Posty', 'Your new address is being set up.', '/moving-in', true);
  const steps = [
    ['Domain registered', `${pick.domain} is registered in your name.`],
    ['Inbox created', `Google Workspace is set up for ${pick.address}.`],
    ['Mail records set', 'MX, SPF, DKIM and DMARC are in place.'],
    ['Sign in to Gmail', 'Your turn. Use the password from the email we just sent.'],
    ['Bring your old mail', 'Optional. We show you how to move it over from Hotmail.']
  ];
  const [at, setAt] = useState(3);
  return (
    <section className="wrap v5-mi">
      <div>
        <h1>{pick.address} is yours. <span className="dim">Here's where we are.</span></h1>
        <p className="lede">We email you at each step, so you can close this page.</p>
        <ol className="mi-list" aria-live="polite">
          {steps.map(([t, d], i) => {
            const st = i < at ? 'done' : i === at ? 'now' : '';
            return (
              <li key={t} className={st}>
                <span className="mi-dot" aria-hidden="true">{i < at && <Icon name="check" size={14} />}</span>
                <div><b>{t}</b><span>{d}</span></div>
                {i === at && i === 3 && <a className="btn btn-ink" href="https://mail.google.com/" target="_blank" rel="noopener noreferrer" onClick={() => setAt(4)}>Open Gmail</a>}
                {i === at && i === 4 && <Link className="btn btn-soft" to={'/welcome?address=' + encodeURIComponent(pick.address)}>Show me how</Link>}
                <span className="sr">{st === 'done' ? ' (done)' : st === 'now' ? ' (current step)' : ''}</span>
              </li>
            );
          })}
        </ol>
        <p className="fine mi-fine">Preview: this page shows the setup steps. Your real order page has the live status.</p>
      </div>
      <Photo className="mi-photo">
        <div className="v5-glass mi-glass">
          <div className="hv-head"><Logo size={16} /><b>Posty</b><span>· your first letter</span></div>
          <div className="hv-row on"><span className="hv-addr"><b>Mormor</b><br /><span>Is this your new address?</span></span><span className="hv-price">now</span></div>
          <div className="hv-row"><span className="hv-addr"><b>Sofie Lund</b><br /><span>Coffee on Thursday?</span></span><span className="hv-price">09:12</span></div>
        </div>
      </Photo>
    </section>
  );
}

/* ---------- Moved in (UI only until fulfilment exists) ---------- */

export function Welcome() {
  const pick = readAddress() || { address: 'you@yourname.com', domain: 'yourname.com', local: 'you' };
  useMeta('Welcome home · Posty', 'Your new address is live.', '/welcome', true);
  const [shared, setShared] = useState(false);
  const share = async () => {
    const text = `My new email address is ${pick.address}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setShared(true); setTimeout(() => setShared(false), 1800); }
    } catch (e) { /* closed the share sheet */ }
  };
  const signature = `${cap(pick.local)}\n${pick.address}`;
  const settle = [
    ['phone', 'Add it to your phone', 'Sign in to the Gmail app with your new address. Takes a minute.', 'Show me how', '/questions?q=phone'],
    ['import', 'Bring your old mail', 'Google has a built-in import tool for old mail and contacts. We walk you through it.', 'Start import', '/questions?q=old%20mail'],
    ['mail', 'Tell the important ones', 'A checklist of places that usually need your new address: bank, doctor, school, work.', 'Open checklist', '/questions?q=change%20address'],
    ['people', 'Add family', `Give someone at home their own address on ${pick.domain}.`, 'Add a person', '/questions?q=family']
  ];
  return (
    <>
      <section className="page-head">
        <div className="glow" aria-hidden="true" />
        <div className="wrap hero-in">
          <span className="pill"><i className="ok" />All 5 steps done · records verified</span>
          <h1 className="wide-h">Welcome home, <span className="dim">{pick.address}</span></h1>
          <p className="lede">Your address is live and your first letter is waiting. From here on, we look after renewals and records quietly in the background.</p>
          <div className="cta-row">
            <a className="btn btn-blue" href="https://mail.google.com/" target="_blank" rel="noopener noreferrer">Open my inbox</a>
            <button type="button" className="btn btn-line" onClick={share}>{shared ? 'Copied' : 'Share my new address'}</button>
          </div>
        </div>
      </section>
      <div className="wrap wl-grid">
        <article className="panel letter">
          <div className="letter-top mono"><span>Inbox · {pick.address}</span><span>just now</span></div>
          <div className="letter-body">
            <div className="from"><Logo size={36} /><div><b>Posty</b><span>to {pick.address}</span></div></div>
            <h2>Your first letter <span className="dim">arrived.</span></h2>
            <p>Hi {cap(pick.local)}. If you are reading this, everything works: the domain is yours, the records are in place, and mail sent to this address lands right here. Reply to this letter any time if something feels off, and we will help.</p>
            <div className="chips">{['MX', 'SPF', 'DKIM', 'DMARC'].map(r => <span key={r} className="rec mono"><Icon name="check" size={12} />{r}</span>)}</div>
          </div>
        </article>
        <article className="panel addr-card">
          <div className="addr-art" aria-hidden="true"><span className="addr">{pick.address}</span></div>
          <div className="addr-card-in">
            <span className="eyebrow mono">New address card</span>
            <b className="addr">{pick.address}</b>
            <p>A small card to send friends, your bank and the school.</p>
            <div className="cta-row left">
              <CopyButton className="btn btn-ink" text={pick.address} label="Copy address" />
              <CopyButton className="btn btn-line" text={signature} label="Email signature" />
            </div>
          </div>
        </article>
      </div>
      <section className="band tight">
        <div className="wrap">
          <div className="settle-head"><h2>Settle in at <span className="dim">your own pace.</span></h2><p>Optional. None of this is needed for mail to work.</p></div>
          <div className="cards4">
            {settle.map(([ic, t, d, cta, to]) => (
              <div key={t} className="panel side-card"><span className="ic"><Icon name={ic} /></span><h3>{t}</h3><p>{d}</p><Link className="more" to={to}>{cta} →</Link></div>
            ))}
          </div>
          <div className="wl-help"><SupportChat stage="welcome" intro="Help with your phone, old mail, DKIM or family addresses." context={{ address: pick.address }} /></div>
          <p className="fine center-t">Preview: this is the page you land on once setup is done.</p>
        </div>
      </section>
    </>
  );
}
