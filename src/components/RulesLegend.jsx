import { VALUATION_TIERS, calculateRevenueMultiple } from '../config/constants'

export function RulesLegend({ currentPrice, financials }) {
  const currentMultiple = currentPrice && financials 
    ? calculateRevenueMultiple(currentPrice, financials) 
    : null

  return (
    <div className="rules-legend">
      <div className="rules-header">
        <h3>Valuation Status</h3>
        <span className="rules-subtitle">Price-to-Revenue Multiple Assessment</span>
      </div>

      <div className="rules-list">
        {VALUATION_TIERS.map((tier) => {
          const isActive = currentMultiple !== null && 
            currentMultiple >= tier.minMultiple && 
            currentMultiple < tier.maxMultiple

          return (
            <div 
              key={tier.id}
              className={`rule-item ${isActive ? 'active' : ''}`}
              style={{ '--rule-color': tier.color }}
            >
              <div 
                className="rule-indicator"
                style={{ backgroundColor: tier.color }}
              />
              <div className="rule-content">
                <div className="rule-tier-name">{tier.label}</div>
                <div className="rule-description">{tier.description}</div>
              </div>
              {isActive && (
                <div className="rule-current-badge">
                  NOW
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
