import { useSubscription } from '../../hooks/useSubscription'

export function SubscriptionStatus() {
  const { 
    isPro, 
    subscriptionStatus, 
    subscriptionEndDate, 
    manageSubscription, 
    loading 
  } = useSubscription()

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
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
      case 'active': return 'Active'
      case 'canceled': return 'Canceled'
      case 'past_due': return 'Past Due'
      default: return 'Free'
    }
  }

  return (
    <div className="subscription-status">
      <div className="subscription-header">
        <h3>Subscription</h3>
        <span 
          className="subscription-badge"
          style={{ '--badge-color': getStatusColor() }}
        >
          {getStatusLabel()}
        </span>
      </div>

      <div className="subscription-details">
        <div className="subscription-plan">
          <span className="label">Plan</span>
          <span className="value">{isPro ? 'Pro' : 'Free'}</span>
        </div>
        
        {isPro && subscriptionEndDate && (
          <div className="subscription-renewal">
            <span className="label">
              {subscriptionStatus === 'canceled' ? 'Access until' : 'Renews on'}
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
          {loading ? 'Loading...' : 'Manage Subscription'}
        </button>
      )}
    </div>
  )
}






