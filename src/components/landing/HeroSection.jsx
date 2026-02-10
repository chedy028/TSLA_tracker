import React from 'react';
import { useNavigate } from 'react-router-dom';
import ValuationGauge from '../gauge/ValuationGauge';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-headline landing-fade-in-up">
          Is TSLA Overpriced?
        </h1>

        <div className="hero-gauge landing-fade-in-up landing-delay-1">
          <ValuationGauge locked={true} multiple={0} tier={null} />
        </div>

        <div className="hero-cta-group landing-fade-in-up landing-delay-2">
          <button
            className="cta-unlock"
            onClick={() => navigate('/login')}
          >
            UNLOCK SIGNAL — $1.99
          </button>
        </div>
        <p className="hero-subtext landing-fade-in-up landing-delay-2">
          Less than a coffee. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
