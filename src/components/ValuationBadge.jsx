import { calculateRevenueMultiple, getValuationTier, calculateMarketCap } from '../config/constants'

export function ValuationBadge({ quote, financials }) {
  if (!quote || !financials) {
    return (
      <div className="valuation-badge loading">
        <div className="loading-pulse" />
      </div>
    )
  }

  const revenueMultiple = calculateRevenueMultiple(quote.current, financials)
  const tier = getValuationTier(revenueMultiple)
  const marketCap = calculateMarketCap(quote.current, financials.sharesOutstanding)

  return (
    <div 
      className="valuation-badge"
      style={{ 
        '--tier-color': tier.color,
        '--tier-bg': tier.bgColor,
      }}
    >
      <div className="badge-glow" />
      
      <div className="badge-header">
        <span className="badge-label">Current Valuation</span>
      </div>

      <div className="badge-status" style={{ color: tier.color }}>
        {tier.label}
      </div>

      <div className="badge-description">
        {tier.description}
      </div>

      <div className="badge-cta">
        💡 Ask the AI for detailed analysis
      </div>
    </div>
  )
}
