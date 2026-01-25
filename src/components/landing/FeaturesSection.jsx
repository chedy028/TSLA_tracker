import React from 'react';
import FeatureCard from './FeatureCard';

const FeaturesSection = () => {
  const features = [
    {
      title: 'Real-Time Price',
      description: 'Get live TSLA stock price updates throughout the trading day. Stay informed with accurate, up-to-the-minute data.',
      icon: '📈',
      tier: 'free'
    },
    {
      title: 'Price Charts',
      description: 'Visualize Tesla stock performance with interactive charts. Track 7-day price history and identify trends.',
      icon: '📊',
      tier: 'free'
    },
    {
      title: 'AI Chat Assistant',
      description: 'Ask questions about Tesla stock and get AI-powered insights. Understand market movements and make informed decisions.',
      icon: '🤖',
      tier: 'premium'
    },
    {
      title: 'Price Alerts',
      description: 'Set custom price targets and get notified instantly when TSLA hits your target. Never miss an opportunity.',
      icon: '🔔',
      tier: 'premium'
    }
  ];

  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-header">
          <h2 className="features-title">
            Everything You Need to Track TSLA
          </h2>
          <p className="features-subtitle">
            Powerful tools for Tesla investors, from beginners to professionals
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              tier={feature.tier}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
