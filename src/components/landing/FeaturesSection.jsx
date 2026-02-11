import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const FeaturesSection = () => {
  const { t } = useLanguage();
  const features = t('features');

  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-grid">
          {features.map((feature, i) => (
            <div className="feature-card" key={i}>
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
