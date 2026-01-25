import React from 'react';

const FeatureCard = ({ title, description, icon, tier }) => {
  return (
    <div className={`feature-card feature-card--${tier}`}>
      <span className={`feature-badge feature-badge--${tier}`}>
        {tier === 'free' ? 'Free' : 'Premium'}
      </span>
      <div className="feature-icon">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

export default FeatureCard;
