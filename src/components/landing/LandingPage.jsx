import React, { useState, useEffect } from 'react';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PricingSection from './PricingSection';
import FooterCTA from './FooterCTA';
import './LandingPage.css';

const LandingPage = () => {
  const [livePrice, setLivePrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [priceChangePercent, setPriceChangePercent] = useState(null);

  // Fetch live TSLA price for the hero section
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        // Using a simple fetch to get stock data
        // This can be replaced with your actual stock data API
        const response = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d'
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
