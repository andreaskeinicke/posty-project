import React, { useEffect, useState } from 'react';
import { priceOf, money } from './names';
import { CopyButton, HELLO, Icon, Link, Logo, navigate, useMeta, POSTY_MONTHLY, WORKSPACE_FROM, WORKSPACE_STANDARD_FROM } from './ui';

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
  const [plan, setPlan] = useState('starter');
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
  const first = form.firstName.trim() || pick.local;
  const ready = check === 'ok' && stage === 'review';
  const go = async e => {
    e.preventDefault();
    if (!ready) return;
    setStage('working'); setError('');
    try {
      const res = await api.startCheckout({ address: pick.address, domain: pick.domain, price, plan, ...form });
      if (res && res.url) { window.location.href = res.url; return; }
      navigate('/moving-in?address=' + encodeURIComponent(pick.address) + '&demo=1');
    } catch (err) {
      setError(`We couldn't open checkout. Try again in a moment, or write to ${HELLO}.`);
      setStage('review');
    }
  };

  return (
    <>
      <section className="page-head co-head">
        <div className="glow" aria-hidden="true" />
        <div className="wrap hero-in">
          <h1>Almost yours, <span className="dim">{first}.</span></h1>
          <p className="lede">A minute or two. You'll see every line before you pay.</p>
        </div>
      </section>
      <form className="wrap co-grid" onSubmit={go}>
        <div className="co-main">
          <section className="panel step-card">
            <h2 className="step-h"><span className="sn done"><Icon name="check" size={14} /></span>Your new address</h2>
            <div className="addr-box">
              <span className="addr">{pick.address}</span>
              <Link className="link-btn" to={'/?q=' + encodeURIComponent(pick.local + ' ' + pick.domain.split('.')[0])}>Change</Link>
            </div>
            {check === 'loading' && <p className="note">Checking that {pick.domain} is still free…</p>}
            {check === 'taken' && <p className="err" role="alert">Someone else has {pick.domain} now. <Link className="link-btn" to="/#search">Search again</Link> for another address.</p>}
            {check === 'error' && <p className="err" role="alert">We couldn't check {pick.domain} just now. Reload in a moment.</p>}
          </section>

          <section className="panel step-card">
            <h2 className="step-h"><span className="sn">2</span>About you</h2>
            <div className="fields two">
              <label>First name<input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required maxLength={80} /></label>
              <label>Last name<input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required maxLength={80} /></label>
            </div>
            <div className="fields">
              <label>Where should we send updates until you move in?<input type="email" value={form.contactEmail} onChange={set('contactEmail')} autoComplete="email" required maxLength={254} placeholder="your current email" /></label>
              <p className="fine">Only for receipts and setup updates. Not shared, not marketed to.</p>
            </div>
            <div className="fields two">
              <label>Country<select value={form.country} onChange={set('country')} autoComplete="country">{COUNTRIES.map(([c, n]) => <option key={n} value={c}>{n}</option>)}</select></label>
            </div>
          </section>

          <section className="panel step-card">
            <h2 className="step-h"><span className="sn">3</span>Your inbox</h2>
            <div className="plans" role="radiogroup" aria-label="Google Workspace plan">
              {[['starter', 'Google Workspace', 'Gmail, Calendar and Drive on your own domain. Best for most people.', WORKSPACE_FROM],
                ['standard', 'Workspace Standard', 'More storage, longer meetings and recordings. Switch any time.', WORKSPACE_STANDARD_FROM]].map(([k, t, d, p]) => (
                <label key={k} className={'plan-opt' + (plan === k ? ' on' : '')}>
                  <input type="radio" name="plan" value={k} checked={plan === k} onChange={() => setPlan(k)} />
                  <b>{t}</b><span>{d}</span><b className="from">from ${p} / mo, billed by Google</b>
                </label>
              ))}
            </div>
            <p className="fine">After payment you sign in with Google once to approve Workspace. Google bills you directly, and you can switch plan later without changing address.</p>
          </section>

          <section className="panel step-card">
            <h2 className="step-h"><span className="sn">4</span>Pay</h2>
            <p className="sub-s">You pay on Stripe's secure page. Posty never sees your card number.</p>
          </section>
        </div>

        <aside className="panel receipt-card" aria-label="Your receipt">
          <span className="eyebrow mono">Your receipt</span>
          <p className="r-addr">{pick.address}</p>
          <div className="line"><div><b>{pick.domain}, first year</b><span>Registered in your name. Renews at cost.</span></div><b>{check === 'loading' ? '…' : money(price)}</b></div>
          <div className="line"><div><b>Posty, first month</b><span>Setup, renewals, support.</span></div><b>{money(POSTY_MONTHLY)}</b></div>
          <div className="line"><div><b>{plan === 'standard' ? 'Workspace Standard' : 'Google Workspace'}</b><span>From ${plan === 'standard' ? WORKSPACE_STANDARD_FROM : WORKSPACE_FROM} / month after you approve it.</span></div><b>billed by Google</b></div>
          <div className="due"><span>Due today</span><b>{check === 'loading' ? '…' : money(price + POSTY_MONTHLY)}</b></div>
          <p className="fine">Then ${POSTY_MONTHLY} / month for Posty. Cancel any time; the domain stays yours.</p>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn btn-blue wide" type="submit" disabled={!ready}>{stage === 'working' ? 'Opening secure checkout…' : 'Get ' + pick.address}</button>
          <ul className="trust">
            <li><Icon name="shield" size={15} />You own the domain, not us</li>
            <li><Icon name="shield" size={15} />Cancel any time</li>
            <li><Icon name="shield" size={15} />Danish company</li>
          </ul>
          {api.demo && <p className="fine">Demo: nothing is bought or charged.</p>}
        </aside>
      </form>
    </>
  );
}

/* ---------- Moving in (UI only until fulfilment exists) ---------- */

export function MovingIn() {
  const pick = readAddress() || { address: 'you@yourname.com', domain: 'yourname.com', local: 'you' };
  useMeta('Moving in · Posty', 'Your new address is being set up.', '/moving-in', true);
  const [done, setDone] = useState(2);
  const steps = [
    ['Payment received', 'Receipt sent to your current inbox.'],
    [pick.domain + ' registered in your name', 'You are the owner on record. Renews at cost each year.'],
    ['Your turn: approve Google Workspace', 'This is the only step we cannot do for you.'],
    ['Mail records connected', 'We set up MX, SPF, DKIM and DMARC so your mail arrives and is trusted.'],
    ['Inbox ready', 'We send a first letter to your new address so you can see it works.']
  ];
  useEffect(() => {
    if (done < 3 || done >= steps.length) return undefined;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setDone(d => d + 1), reduce ? 200 : 1100);
    return () => clearTimeout(t);
  }, [done, steps.length]);
  const finished = done >= steps.length;
  const tag = i => i < done ? '' : i === done && i === 2 ? 'waiting on you' : i === done ? 'working' : i === 3 ? 'after approval' : 'usually minutes';
  return (
    <>
      <section className="page-head">
        <div className="glow" aria-hidden="true" />
        <div className="wrap hero-in">
          <span className="eyebrow flag">Moving in · step 3 of 3</span>
          <h1>Your letters are <span className="dim">on their way.</span></h1>
          <p className="lede">Payment received. We're setting up {pick.address} now. There is one thing only you can do, and it takes about a minute.</p>
        </div>
      </section>
      <div className="wrap mi-grid">
        <section className="panel mi-card" aria-live="polite">
          <div className="mi-top"><b className="addr">{pick.address}</b><span className="badge soft">{Math.min(done, steps.length)} of {steps.length} done</span></div>
          <div className="bar"><i style={{ width: (Math.min(done, steps.length) / steps.length) * 100 + '%' }} /></div>
          <ol className="mi-steps">
            {steps.map(([t, d], i) => (
              <li key={t} className={i < done ? 'done' : i === done ? (i === 2 ? 'you' : 'run') : ''}>
                <span className="st">{i < done && <Icon name="check" size={14} />}</span>
                <div>
                  <div className="mi-row"><b>{t}</b><span className="mono tag">{tag(i)}</span></div>
                  <p>{d}</p>
                  {i === 2 && done === 2 && (
                    <div className="approve">
                      <div><b>Approve Google Workspace</b><span>Sign in with Google and accept their terms. Google bills you from here.</span></div>
                      <button type="button" className="btn btn-ink" onClick={() => setDone(3)}>Continue with Google</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {finished && <Link className="btn btn-blue" to={'/welcome?address=' + encodeURIComponent(pick.address)}>See your new inbox →</Link>}
          <p className="fine">Preview: this page shows the setup steps. Nothing here is connected to a real account yet.</p>
        </section>
        <div className="mi-side">
          <div className="panel side-card"><span className="ic"><Icon name="mail" /></span><h3>We keep you posted</h3><p>Every step lands in your current inbox, so you can close this page. Nothing to watch.</p></div>
          <div className="panel side-card"><span className="ic"><Icon name="chat" /></span><h3>A real person if you need one</h3><p>Stuck on the Google step? Write to {HELLO} and a person replies.</p></div>
          <div className="panel side-card"><span className="ic"><Icon name="shield" /></span><h3>Already safe</h3><p>The domain is registered to you. If you stop here, it is still yours.</p></div>
        </div>
      </div>
    </>
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
          <p className="fine center-t">Preview: this is the page you land on once setup is done.</p>
        </div>
      </section>
    </>
  );
}
