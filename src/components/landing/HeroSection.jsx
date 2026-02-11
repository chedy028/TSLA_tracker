import React from 'react';
import { useNavigate } from 'react-router-dom';
import ValuationGauge from '../gauge/ValuationGauge';
import { useLanguage } from '../../i18n/LanguageContext';

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-headline landing-fade-in-up">
          {t('hero.headline')}
        </h1>

        <div className="hero-gauge landing-fade-in-up landing-delay-1">
          <ValuationGauge locked={true} multiple={0} tier={null} />
        </div>

        <div className="hero-cta-group landing-fade-in-up landing-delay-2">
          <button
            className="cta-unlock"
            onClick={() => navigate('/login')}
          >
            {t('hero.cta')}
          </button>
        </div>
        <p className="hero-subtext landing-fade-in-up landing-delay-2">
          {t('hero.subtext')}
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
