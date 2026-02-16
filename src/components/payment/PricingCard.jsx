import { useAuth } from '../../hooks/useAuth'
import { useSubscription } from '../../hooks/useSubscription'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'

export function PricingCard({ plan, highlighted = false }) {
  const { isAuthenticated, isPro } = useAuth()
  const { subscribe, loading } = useSubscription()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const planKey = plan.price > 0 ? 'pro' : 'free'
  const localizedFeatures = t(`pricing.plans.${planKey}.features`)
  const featureList = Array.isArray(localizedFeatures) ? localizedFeatures : plan.features
  const isCurrentPlan = (plan.price === 0 && !isPro) || (plan.price > 0 && isPro)

  const handleClick = () => {
    if (plan.price === 0) return
    
    if (!isAuthenticated) {
      navigate('/login?next=%2Fpricing', {
        state: { from: { pathname: '/pricing' } },
      })
    } else {
      subscribe()
    }
  }

  return (
    <div className={`pricing-card ${highlighted ? 'highlighted' : ''} ${isCurrentPlan ? 'current' : ''}`}>
      {highlighted && <div className="pricing-badge">{t('pricing.mostPopular')}</div>}
      
      <div className="pricing-header">
        <h3>{t(`pricing.plans.${planKey}.name`)}</h3>
        <div className="pricing-price">
          <span className="price-currency">$</span>
          <span className="price-amount">{plan.price}</span>
          {plan.price > 0 && (
            <span className="price-period">
              /{plan.introLabel ? t('pricing.firstMonthShort') : t('pricing.monthShort')}
            </span>
          )}
        </div>
        {plan.regularPrice && (
          <div className="pricing-regular-note">
            {t('pricing.thenRegular', { price: `$${plan.regularPrice}` })}
          </div>
        )}
      </div>

      <ul className="pricing-features">
        {featureList.map((feature, index) => (
          <li key={index}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            {feature}
          </li>
        ))}
      </ul>

      <button 
        className={`pricing-btn ${highlighted ? 'primary' : 'secondary'}`}
        onClick={handleClick}
        disabled={loading || isCurrentPlan}
      >
        {isCurrentPlan
          ? t('pricing.currentPlan')
          : loading
            ? t('pricing.processing')
            : plan.price === 0
              ? t('pricing.freeForever')
              : t('pricing.getStarted')}
      </button>
    </div>
  )
}

export function PricingSection() {
  const { pricing } = useSubscription()
  const { t } = useLanguage()

  return (
    <div className="pricing-section">
      <div className="pricing-header-section">
        <h2>{t('pricing.sectionTitle')}</h2>
        <p>{t('pricing.sectionSubtitle')}</p>
      </div>
      
      <div className="pricing-cards">
        <PricingCard plan={pricing.free} />
        <PricingCard plan={pricing.pro} highlighted />
      </div>
    </div>
  )
}





