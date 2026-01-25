import React from 'react';
import { useNavigate } from 'react-router-dom';

const HeroSection = ({ livePrice, priceChange, priceChangePercent }) => {
  const navigate = useNavigate();

  const formatPrice = (price) => {
    if (!price) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const isPositive = priceChange >= 0;

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-headline">
          Track Tesla Stock Smarter
        </h1>
        <p className="hero-subtext">
          Real-time TSLA price tracking with powerful analytics.
          Start free and upgrade when you need AI-powered insights and custom alerts.
        </p>
        <div className="hero-cta-group">
          <button
            className="cta-primary"
            onClick={() => navigate('/login')}
          >
            Get Started Free
          </button>
          <button
            className="cta-secondary"
            onClick={() => {
              document.getElementById('pricing')?.scrollIntoView({
                behavior: 'smooth'
              });
            }}
          >
            View Pricing
          </button>
        </div>

        {livePrice && (
          <div className="hero-live-price">
            <div className="live-price-label">TSLA Live Price</div>
            <div>
              <span className="live-price-value">{formatPrice(livePrice)}</span>
              <span className={`live-price-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{priceChangePercent?.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
