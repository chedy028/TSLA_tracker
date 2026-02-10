import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import FooterCTA from './FooterCTA';
import './LandingPage.css';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const LandingPage = () => {
  const [livePrice, setLivePrice] = useState(null);
  const navigate = useNavigate();

  // Fetch live TSLA price for potential banner use
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d';
        const response = await fetch(
          CORS_PROXY + encodeURIComponent(url)
        );
        const data = await response.json();
        if (data.chart?.result?.[0]) {
          setLivePrice(data.chart.result[0].meta.regularMarketPrice);
        }
      } catch (error) {
        console.log('Could not fetch live price:', error);
      }
    };
    fetchPrice();
  }, []);

  return (
    <div className="landing-page">
      {/* Sticky promo banner */}
      <div className="landing-promo-banner">
        Launch Offer: <strong>$1.99/mo</strong> — Price jumps to $9.99 soon!
      </div>

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-logo">
            <span className="landing-logo-emoji">🎮</span>
            <span className="landing-logo-text">TSLA CHEAT CODE</span>
          </div>
          <button className="landing-nav-signin" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </nav>

      <HeroSection />
      <FeaturesSection />
      <FooterCTA />
    </div>
  );
};

export default LandingPage;
