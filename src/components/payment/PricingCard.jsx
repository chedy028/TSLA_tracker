import { useAuth } from '../../hooks/useAuth'
import { useSubscription } from '../../hooks/useSubscription'
import { useNavigate } from 'react-router-dom'

export function PricingCard({ plan, highlighted = false }) {
  const { isAuthenticated, isPro } = useAuth()
  const { subscribe, loading } = useSubscription()
  const navigate = useNavigate()

  const isCurrentPlan = (plan.price === 0 && !isPro) || (plan.price > 0 && isPro)

  const handleClick = () => {
    if (plan.price === 0) return
    
    if (!isAuthenticated) {
      navigate('/login')
    } else {
      subscribe()
    }
  }

  return (
    <div className={`pricing-card ${highlighted ? 'highlighted' : ''} ${isCurrentPlan ? 'current' : ''}`}>
      {highlighted && <div className="pricing-badge">Most Popular</div>}
      
      <div className="pricing-header">
        <h3>{plan.name}</h3>
        <div className="pricing-price">
          <span className="price-currency">$</span>
          <span className="price-amount">{plan.price}</span>
          {plan.price > 0 && <span className="price-period">/{plan.introLabel ? 'first mo' : 'mo'}</span>}
        </div>
        {plan.regularPrice && (
          <div className="pricing-regular-note">then ${plan.regularPrice}/mo after</div>
        )}
      </div>

      <ul className="pricing-features">
        {plan.features.map((feature, index) => (
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
        {isCurrentPlan ? 'Current Plan' : 
         loading ? 'Processing...' : 
         plan.price === 0 ? 'Free Forever' : 'Get Started'}
      </button>
    </div>
  )
}

export function PricingSection() {
  const { pricing } = useSubscription()

  return (
    <div className="pricing-section">
      <div className="pricing-header-section">
        <h2>Simple, Transparent Pricing</h2>
        <p>Choose the plan that works for you</p>
      </div>
      
      <div className="pricing-cards">
        <PricingCard plan={pricing.free} />
        <PricingCard plan={pricing.pro} highlighted />
      </div>
    </div>
  )
}






