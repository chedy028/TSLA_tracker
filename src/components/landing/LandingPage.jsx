import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PricingSection from './PricingSection';
import FooterCTA from './FooterCTA';
import './LandingPage.css';

const CORS_PROXY = 'https://corsproxy.io/?';

const LandingPage = () => {
  const [livePrice, setLivePrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [priceChangePercent, setPriceChangePercent] = useState(null);
  const navigate = useNavigate();

  // Fetch live TSLA price for the hero section
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d';
        const response = await fetch(
          CORS_PROXY + encodeURIComponent(url)
        );
        const data = await response.json();

        if (data.chart?.result?.[0]) {
          const quote = data.chart.result[0].meta;
          const previousClose = quote.previousClose;
          const currentPrice = quote.regularMarketPrice;

          setLivePrice(currentPrice);
          setPriceChange(currentPrice - previousClose);
          setPriceChangePercent(((currentPrice - previousClose) / previousClose) * 100);
        }
      } catch (error) {
        console.log('Could not fetch live price:', error);
        // Fallback to demo data if API fails
        setLivePrice(248.50);
        setPriceChange(3.25);
        setPriceChangePercent(1.32);
      }
    };

    fetchPrice();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-logo">
            <span className="logo-icon">T</span>
            <span className="logo-text">TSLA Tracker</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <button className="landing-nav-signin" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </nav>
      <HeroSection
        livePrice={livePrice}
        priceChange={priceChange}
        priceChangePercent={priceChangePercent}
      />
      <FeaturesSection />
      <PricingSection />
      <FooterCTA />
    </div>
  );
};

export default LandingPage;
