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
        <h1 className="hero-headline landing-fade-in-up">
          Make Confident Tesla Investment Decisions
        </h1>
        <p className="hero-subtext landing-fade-in-up landing-delay-1">
          No jargon. No confusion. Just clear, real-time Tesla stock data with AI-powered insights to help you know when to buy, hold, or wait.
        </p>
        <div className="hero-cta-group landing-fade-in-up landing-delay-2">
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
        <p className="hero-trust-signal landing-fade-in-up landing-delay-2">Free forever. No credit card required.</p>

        {livePrice && (
          <div className="hero-live-price landing-fade-in-up landing-delay-3">
            <div className="live-price-label">
              <span className="live-pulse-dot" />
              TSLA Live Price
            </div>
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
