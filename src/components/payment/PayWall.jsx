import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

// Features that are gated behind Pro
const PRO_FEATURES = ['Pro Features', 'Valuation Status', 'Price Chart']

export function PayWall({ children, feature }) {
  const { isPro, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // If feature is not gated, show it freely
  if (!PRO_FEATURES.includes(feature)) {
    return children
  }

  // If user is Pro, show the content
  if (isPro) {
    return children
  }

  // Show locked state for non-Pro users
  const displayText = feature === 'Pro Features' 
    ? 'Valuation Analysis & Price Charts' 
    : feature

  return (
    <div className="paywall-locked">
      <div className="paywall-overlay">
        <div className="lock-icon">🔒</div>
        <h3>Pro Feature</h3>
        <p>Unlock {displayText} with Pro</p>
        <button 
          className="unlock-btn"
          onClick={() => navigate(isAuthenticated ? '/pricing' : '/login')}
        >
          {isAuthenticated ? 'Upgrade to Pro' : 'Sign In to Unlock'}
        </button>
      </div>
    </div>
  )
}




