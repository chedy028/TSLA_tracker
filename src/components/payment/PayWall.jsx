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
  return (
    <div className="paywall-locked">
      <div className="paywall-overlay">
        <div className="lock-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3>Pro Feature</h3>
        <p>Unlock this with Cheat Code Pro</p>
        <button
          className="unlock-btn"
          onClick={() => navigate(isAuthenticated ? '/pricing' : '/login')}
        >
          {isAuthenticated ? 'UNLOCK — $1.99' : 'Sign In to Unlock'}
        </button>
      </div>
    </div>
  )
}
