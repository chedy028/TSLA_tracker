import { useSubscription } from '../../hooks/useSubscription'
import { useLanguage } from '../../i18n/LanguageContext'

export function SubscriptionStatus() {
  const { 
    isPro, 
    subscriptionStatus, 
    subscriptionEndDate, 
    manageSubscription, 
    loading 
  } = useSubscription()
  const { t, lang } = useLanguage()

  const localeByLanguage = {
    en: 'en-US',
    es: 'es-ES',
    ko: 'ko-KR',
    ja: 'ja-JP',
  }

  const formatDate = (dateString) => {
    if (!dateString) return t('subscription.na')
    return new Date(dateString).toLocaleDateString(localeByLanguage[lang] || 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = () => {
    switch (subscriptionStatus) {
      case 'active': return 'var(--accent-teal)'
      case 'canceled': return 'var(--accent-orange)'
      case 'past_due': return 'var(--accent-red)'
      default: return 'var(--text-muted)'
    }
  }

  const getStatusLabel = () => {
    switch (subscriptionStatus) {
      case 'active': return t('subscription.statusActive')
      case 'canceled': return t('subscription.statusCanceled')
      case 'past_due': return t('subscription.statusPastDue')
      default: return t('subscription.statusFree')
    }
  }

  return (
    <div className="subscription-status">
      <div className="subscription-header">
        <h3>{t('subscription.title')}</h3>
        <span 
          className="subscription-badge"
          style={{ '--badge-color': getStatusColor() }}
        >
          {getStatusLabel()}
        </span>
      </div>

      <div className="subscription-details">
        <div className="subscription-plan">
          <span className="label">{t('subscription.planLabel')}</span>
          <span className="value">{isPro ? t('subscription.planPro') : t('subscription.planFree')}</span>
        </div>
        
        {isPro && subscriptionEndDate && (
          <div className="subscription-renewal">
            <span className="label">
              {subscriptionStatus === 'canceled'
                ? t('subscription.accessUntil')
                : t('subscription.renewsOn')}
            </span>
            <span className="value">{formatDate(subscriptionEndDate)}</span>
          </div>
        )}
      </div>

      {isPro && (
        <button 
          className="subscription-manage-btn"
          onClick={manageSubscription}
          disabled={loading}
        >
          {loading ? t('subscription.loading') : t('subscription.manage')}
        </button>
      )}
    </div>
  )
}





