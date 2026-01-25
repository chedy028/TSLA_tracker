import React from 'react';
import { useNavigate } from 'react-router-dom';

const PricingSection = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        { text: 'Real-time TSLA price', included: true },
        { text: 'Basic price chart', included: true },
        { text: '7-day price history', included: true },
        { text: 'AI chat assistant', included: false },
        { text: 'Custom price alerts', included: false },
        { text: 'Advanced analytics', included: false }
      ],
      ctaText: 'Start Free',
      ctaVariant: 'secondary',
      highlighted: false
    },
    {
      name: 'Premium',
      price: '$9.99',
      period: '/month',
      description: 'For serious Tesla investors',
      features: [
        { text: 'Everything in Free', included: true },
        { text: 'AI-powered chat assistant', included: true },
        { text: 'Custom price alerts', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Extended price history', included: true },
        { text: 'Priority support', included: true }
      ],
      ctaText: 'Go Premium',
      ctaVariant: 'primary',
      highlighted: true
    }
  ];

  const CheckIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="check-icon"
    >
      <path
        d="M16.667 5L7.5 14.167 3.333 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const XIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="check-icon"
    >
      <path
        d="M15 5L5 15M5 5l10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">
        <div className="pricing-header">
          <h2 className="pricing-title">
            Simple, Transparent Pricing
          </h2>
          <p className="pricing-subtitle">
            Start free, upgrade when you're ready
          </p>
        </div>
        <div className="pricing-grid">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`pricing-card ${tier.highlighted ? 'pricing-card--highlighted' : ''}`}
            >
              {tier.highlighted && (
                <span className="pricing-popular-badge">Most Popular</span>
              )}
              <h3 className="pricing-card-name">{tier.name}</h3>
              <div className="pricing-card-price">
                <span className="pricing-amount">{tier.price}</span>
                <span className="pricing-period">{tier.period}</span>
              </div>
              <ul className="pricing-features">
                {tier.features.map((feature, index) => (
                  <li
                    key={index}
                    className={feature.included ? '' : 'disabled'}
                  >
                    {feature.included ? <CheckIcon /> : <XIcon />}
                    {feature.text}
                  </li>
                ))}
              </ul>
              <button
                className={`pricing-cta pricing-cta--${tier.ctaVariant}`}
                onClick={() => navigate('/login')}
              >
                {tier.ctaText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
