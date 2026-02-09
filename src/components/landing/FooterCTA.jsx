import React from 'react';
import { useNavigate } from 'react-router-dom';

const FooterCTA = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-cta">
      <div className="footer-cta-content">
        <h2>Start Making Informed Decisions Today</h2>
        <p>
          Free to start. No credit card required. See Tesla's real-time price and valuation in seconds.
        </p>
        <button
          className="cta-primary"
          onClick={() => navigate('/login')}
        >
          Get Started Free
        </button>
      </div>
      <div className="footer-links">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="mailto:support@tslatracker.com">Contact</a>
      </div>
      <p className="footer-copyright">
        &copy; {currentYear} TSLA Tracker. All rights reserved.
      </p>
    </footer>
  );
};

export default FooterCTA;
