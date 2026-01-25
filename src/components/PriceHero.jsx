export function PriceHero({ quote, lastUpdated, loading }) {
  if (!quote && !loading) {
    return (
      <div className="price-hero">
        <div className="price-error">Unable to load price data</div>
      </div>
    )
  }

  const isPositive = quote?.change >= 0

  return (
    <div className="price-hero">
      <div className="price-header">
        <div className="stock-info">
          <span className="stock-symbol">TSLA</span>
          <span className="stock-name">Tesla, Inc.</span>
        </div>
        {lastUpdated && (
          <div className="last-updated">
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            <span className="refresh-info">Auto-refresh: 15 min</span>
          </div>
        )}
      </div>

      <div className="price-main">
        {loading && !quote ? (
          <div className="price-loading">
            <div className="loading-pulse" />
          </div>
        ) : (
          <>
            <span className="currency">$</span>
            <span className="price-value">
              {quote?.current?.toFixed(2) || '---'}
            </span>
          </>
        )}
      </div>

      <div className="price-change-container">
        {quote && quote.change != null && !isNaN(quote.change) && (
          <>
            <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{quote.change.toFixed(2)}
            </span>
            <span className={`price-percent ${isPositive ? 'positive' : 'negative'}`}>
              ({isPositive ? '+' : ''}{quote.changePercent?.toFixed(2) || '0.00'}%)
            </span>
          </>
        )}
      </div>

      <div className="price-stats">
        <div className="stat">
          <span className="stat-label">Open</span>
          <span className="stat-value">${quote?.open?.toFixed(2) || '---'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">High</span>
          <span className="stat-value">${quote?.high?.toFixed(2) || '---'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Low</span>
          <span className="stat-value">${quote?.low?.toFixed(2) || '---'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Prev Close</span>
          <span className="stat-value">${quote?.previousClose?.toFixed(2) || '---'}</span>
        </div>
      </div>
    </div>
  )
}
