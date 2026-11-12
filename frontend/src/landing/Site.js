import React, { useEffect, useState } from 'react';
import Landing from './Landing';
import { HowItWorks, Pricing, Examples, Questions, Compare, Agents, Saved, NotFound } from './pages';
import { Checkout, CheckoutHeader, MovingIn, Welcome } from './Checkout';
import { Footer, Nav } from './ui';
import './landing.css';

// Marketing site: a tiny path router over the landing pages.
// The Express server already serves index.html for every non-API path.

export const ROUTES = ['/', '/how-it-works', '/pricing', '/examples', '/questions', '/faq', '/compare', '/agents', '/saved', '/get', '/moving-in', '/welcome'];

// Path plus query, so a link from /?q=a to /?q=b remounts the page and runs the new search.
function useLocation() {
  const read = () => ({ path: window.location.pathname.replace(/\/+$/, '') || '/', search: window.location.search });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return loc;
}

export default function Site({ api, onOpenChat, initialName }) {
  const { path, search } = useLocation();
  let page;
  switch (path) {
    case '/': page = <Landing api={api} onOpenChat={onOpenChat} initialName={initialName} />; break;
    case '/how-it-works': page = <HowItWorks />; break;
    case '/pricing': page = <Pricing />; break;
    case '/examples': page = <Examples />; break;
    case '/questions': case '/faq': page = <Questions />; break;
    case '/compare': page = <Compare />; break;
    case '/agents': page = <Agents />; break;
    case '/saved': case '/my-searches': page = <Saved />; break;
    case '/get': page = <Checkout api={api} />; break;
    case '/moving-in': page = <MovingIn />; break;
    case '/welcome': page = <Welcome />; break;
    default: page = <NotFound />;
  }
  return (
    <div className="pl">
      {path === '/get' ? <CheckoutHeader at={1} /> : <Nav path={path === '/faq' ? '/questions' : path} />}
      <main id="top" key={path + search}>{page}</main>
      <Footer />
    </div>
  );
}
