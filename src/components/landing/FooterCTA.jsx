import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const FooterCTA = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="footer-cta">
      <div className="footer-disclaimer">
        {t('footer.disclaimer')}
      </div>
      <div className="footer-links">
        <a href="/refund">{t('footer.refund')}</a>
        <a href="/privacy">{t('footer.privacy')}</a>
        <a href="/terms">{t('footer.terms')}</a>
        <a href="/contact">{t('footer.contact')}</a>
      </div>
      <p className="footer-copyright">
        &copy; {currentYear} {t('footer.copyright')}
      </p>
    </footer>
  );
};

export default FooterCTA;
