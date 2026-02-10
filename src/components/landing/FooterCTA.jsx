import React from 'react';

const FooterCTA = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-cta">
      <div className="footer-disclaimer">
        Not financial advice. Do your own research before investing.
      </div>
      <div className="footer-links">
        <a href="/refund">Refund Policy</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
      </div>
      <p className="footer-copyright">
        &copy; {currentYear} TSLA Cheat Code. All rights reserved.
      </p>
    </footer>
  );
};

export default FooterCTA;
