import React, { useEffect, useState } from 'react';
import Landing from './Landing';
import { HowItWorks, Pricing, Examples, Faq, Compare, Agents, Saved, NotFound } from './pages';
import { Footer, Nav } from './ui';
import './landing.css';

// Marketing site: a tiny path router over the landing pages.
// The Express server already serves index.html for every non-API path.

export const ROUTES = ['/', '/how-it-works', '/pricing', '/examples', '/faq', '/compare', '/agents', '/saved'];

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return path.replace(/\/+$/, '') || '/';
}

export default function Site({ api, onOpenChat, initialName }) {
  const path = usePath();
  let page;
  switch (path) {
    case '/': page = <Landing api={api} onOpenChat={onOpenChat} initialName={initialName} />; break;
    case '/how-it-works': page = <HowItWorks />; break;
    case '/pricing': page = <Pricing />; break;
    case '/examples': page = <Examples />; break;
    case '/faq': page = <Faq />; break;
    case '/compare': page = <Compare />; break;
    case '/agents': page = <Agents />; break;
    case '/saved': page = <Saved api={api} />; break;
    default: page = <NotFound />;
  }
  return (
    <div className="pl">
      <Nav path={path} />
      <main id="top" key={path}>{page}</main>
      <Footer />
    </div>
  );
}
