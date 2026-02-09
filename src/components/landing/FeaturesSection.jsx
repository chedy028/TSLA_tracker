import React from 'react';
import FeatureCard from './FeatureCard';

const FeaturesSection = () => {
  const features = [
    {
      title: 'Live Price Updates',
      description: 'See exactly what Tesla stock costs right now, updated every few minutes.',
      icon: '📈',
      tier: 'free'
    },
    {
      title: 'Visual Price History',
      description: "Easy-to-read charts show where Tesla's price has been and where it might be heading.",
      icon: '📊',
      tier: 'free'
    },
    {
      title: 'Your Personal Stock Guide',
      description: 'Not sure what a P/S ratio means? Ask our AI in plain English.',
      icon: '🤖',
      tier: 'premium'
    },
    {
      title: 'Never Miss a Price Target',
      description: 'Set your buy or sell price, we email you when Tesla hits it.',
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
