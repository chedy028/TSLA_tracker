import { useState } from 'react'
import { calculateFairValueGap, getNextBuyZone } from '../../config/constants'
import './DataCards.css'

function AccordionCard({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`data-card ${open ? 'data-card--open' : ''}`}>
      <button className="data-card-header" onClick={() => setOpen(!open)}>
        <span className="data-card-icon">{icon}</span>
        <span className="data-card-title">{title}</span>
        <span className="data-card-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="data-card-body">{children}</div>}
    </div>
  )
}

export default function DataCards({ quote, revenueMultiple, financials }) {
  const fairValueGap = revenueMultiple ? calculateFairValueGap(revenueMultiple) : null
  const nextBuyZone = revenueMultiple && financials ? getNextBuyZone(revenueMultiple, financials) : null

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)

  const isPositive = quote?.changePercent >= 0

  return (
    <div className="data-cards">
      <AccordionCard title="Hype Level" icon="📊" defaultOpen={true}>
        {quote ? (
          <div className="data-card-stats">
            <div className="data-stat">
              <span className="data-stat-label">Current Price</span>
              <span className="data-stat-value">{formatPrice(quote.current)}</span>
            </div>
            <div className="data-stat">
              <span className="data-stat-label">Daily Change</span>
              <span className={`data-stat-value ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{quote.changePercent?.toFixed(2)}%
              </span>
            </div>
            {revenueMultiple > 0 && (
              <div className="data-stat">
                <span className="data-stat-label">P/S Multiple</span>
                <span className="data-stat-value">{revenueMultiple.toFixed(1)}x</span>
              </div>
            )}
          </div>
        ) : (
          <p className="data-card-loading">Loading...</p>
        )}
      </AccordionCard>

      <AccordionCard title="Fair Value Gap" icon="📐">
        {fairValueGap !== null ? (
          <div className="data-card-stats">
            <div className="data-stat">
              <span className="data-stat-label">vs Fair Value (10x P/S)</span>
              <span className={`data-stat-value ${fairValueGap > 0 ? 'negative' : 'positive'}`}>
                {fairValueGap > 0 ? '+' : ''}{fairValueGap.toFixed(1)}%
                {fairValueGap > 0 ? ' above' : ' below'}
              </span>
            </div>
          </div>
        ) : (
          <p className="data-card-loading">Calculating...</p>
        )}
      </AccordionCard>

      <AccordionCard title="Next Buy Zone" icon="🎯">
        {nextBuyZone ? (
          <div className="data-card-stats">
            <div className="data-stat">
              <span className="data-stat-label">Target Price ({nextBuyZone.multiple}x P/S)</span>
              <span className="data-stat-value">{formatPrice(nextBuyZone.price)}</span>
            </div>
            <div className="data-stat">
              <span className="data-stat-label">Tier at Target</span>
              <span className="data-stat-value">{nextBuyZone.tierLabel}</span>
            </div>
          </div>
        ) : (
          <p className="data-card-loading">
            {revenueMultiple && revenueMultiple <= 5
              ? 'Already in the lowest tier!'
              : 'Calculating...'}
          </p>
        )}
      </AccordionCard>
    </div>
  )
}
