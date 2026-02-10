import React from 'react';

const features = [
  {
    icon: '🎯',
    title: 'Tired of Guessing?',
    description: 'Our algorithm reads the revenue multiple so you don\'t have to. One glance tells you if TSLA is cheap or overpriced.',
  },
  {
    icon: '📉',
    title: 'Bought the Top?',
    description: 'Real-time buy/sell signals based on valuation tiers. Know exactly when you\'re overpaying — before you click buy.',
  },
  {
    icon: '🔔',
    title: 'Always Late to Dips?',
    description: 'Get email alerts the instant the signal changes. Never miss a buy zone again.',
  },
];

const FeaturesSection = () => {
  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-grid">
          {features.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
