import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import FooterCTA from './FooterCTA';
import { useLanguage } from '../../i18n/LanguageContext';
import './LandingPage.css';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const LandingPage = () => {
  const [livePrice, setLivePrice] = useState(null);
  const navigate = useNavigate();
  const { lang, setLang, t, languageOptions } = useLanguage();

  // Fetch live TSLA price for potential banner use
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d';
        const response = await fetch(
          CORS_PROXY + encodeURIComponent(url)
        );
        const data = await response.json();
        if (data.chart?.result?.[0]) {
          setLivePrice(data.chart.result[0].meta.regularMarketPrice);
        }
      } catch (error) {
        console.log('Could not fetch live price:', error);
      }
    };
    fetchPrice();
  }, []);

  return (
    <div className="landing-page">
      {/* Sticky promo banner */}
      <div className="landing-promo-banner">
        {t('nav.bannerPrefix')}<strong>{t('nav.bannerPrice')}</strong>{t('nav.bannerSuffix')}
      </div>

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-logo">
            <span className="landing-logo-emoji">🎮</span>
            <span className="landing-logo-text">TSLA CHEAT CODE</span>
          </div>
          <div className="landing-nav-actions">
            <select
              className="lang-toggle"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Language"
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.short}
                </option>
              ))}
            </select>
            <button className="landing-nav-signin" onClick={() => navigate('/login')}>
              {t('nav.signIn')}
            </button>
          </div>
        </div>
      </nav>

      <HeroSection />
      <FeaturesSection />
      <FooterCTA />
    </div>
  );
};

export default LandingPage;
