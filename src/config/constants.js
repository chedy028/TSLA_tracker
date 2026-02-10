// Valuation tiers based on Price-to-Sales (Revenue) ratio
export const VALUATION_TIERS = [
  {
    id: 'bargain',
    label: 'BARGAIN BASEMENT',
    description: 'Strong buy signal',
    signal: 'STRONG BUY',
    signalColor: '#00ff88',
    minMultiple: 0,
    maxMultiple: 5,
    color: '#00ff88',
    bgColor: 'rgba(0, 255, 136, 0.15)',
  },
  {
    id: 'cheap',
    label: 'CHEAP',
    description: 'Consider accumulating',
    signal: 'BUY',
    signalColor: '#00d4aa',
    minMultiple: 5,
    maxMultiple: 7,
    color: '#00d4aa',
    bgColor: 'rgba(0, 212, 170, 0.15)',
  },
  {
    id: 'fair',
    label: 'FAIR PRICED',
    description: 'Hold position',
    signal: 'HOLD',
    signalColor: '#ffd000',
    minMultiple: 7,
    maxMultiple: 12,
    color: '#ffd000',
    bgColor: 'rgba(255, 208, 0, 0.15)',
  },
  {
    id: 'expensive',
    label: 'EXPENSIVE',
    description: 'Caution advised',
    signal: 'WAIT',
    signalColor: '#ff8c00',
    minMultiple: 12,
    maxMultiple: 20,
    color: '#ff8c00',
    bgColor: 'rgba(255, 140, 0, 0.15)',
  },
  {
    id: 'overpriced',
    label: 'OVERPRICED',
    description: 'Consider taking profits',
    signal: 'SELL',
    signalColor: '#ff4757',
    minMultiple: 20,
    maxMultiple: Infinity,
    color: '#ff4757',
    bgColor: 'rgba(255, 71, 87, 0.15)',
  },
]

// Gauge configuration for SVG rendering
export const GAUGE_CONFIG = {
  minMultiple: 0,
  maxMultiple: 30,
  startAngle: -90,  // left side of semicircle (degrees)
  endAngle: 90,     // right side of semicircle (degrees)
}

// Calculate % above/below fair value midpoint (10x P/S)
export function calculateFairValueGap(currentMultiple) {
  const fairValueMidpoint = 10
  return ((currentMultiple - fairValueMidpoint) / fairValueMidpoint) * 100
}

// Calculate price at next lower tier boundary
export function getNextBuyZone(currentMultiple, financials) {
  if (!financials || !financials.ttmRevenue || !financials.sharesOutstanding) {
    return null
  }
  // Find the next lower tier boundary
  const boundaries = [20, 12, 7, 5]
  const target = boundaries.find(b => b < currentMultiple)
  if (!target) return null
  const price = (target * financials.ttmRevenue) / financials.sharesOutstanding
  const tier = getValuationTier(target)
  return { price, multiple: target, tierLabel: tier?.label }
}

// Get valuation tier based on revenue multiple
export function getValuationTier(multiple) {
  for (const tier of VALUATION_TIERS) {
    if (multiple >= tier.minMultiple && multiple < tier.maxMultiple) {
      return tier
    }
  }
  return VALUATION_TIERS[VALUATION_TIERS.length - 1]
}

// Calculate revenue multiple from stock price and financials
export function calculateRevenueMultiple(stockPrice, financials) {
  if (!financials || !financials.ttmRevenue || !financials.sharesOutstanding) {
    return 0
  }
  const marketCapBillions = stockPrice * financials.sharesOutstanding
  const multiple = marketCapBillions / financials.ttmRevenue
  return multiple
}

// Calculate market cap in billions
export function calculateMarketCap(stockPrice, sharesOutstanding) {
  return stockPrice * sharesOutstanding
}

// Calculate stock price from revenue multiple
export function calculatePriceFromMultiple(revenueMultiple, financials) {
  if (!financials || !financials.ttmRevenue || !financials.sharesOutstanding) {
    return null
  }
  // Price = (Multiple × TTM Revenue) / Shares Outstanding
  return (revenueMultiple * financials.ttmRevenue) / financials.sharesOutstanding
}

// Get all valuation tier price levels
export function getValuationPriceLevels(financials) {
  if (!financials || !financials.ttmRevenue || !financials.sharesOutstanding) {
    return []
  }
  
  const levels = []
  
  // Only show select tier boundaries - hide 13x (expensive) to protect proprietary algorithm
  const showTiers = ['cheap', 'fair', 'overpriced'] // 5x, 8x, 20x
  
  VALUATION_TIERS.forEach((tier) => {
    // Add min boundary (except for first tier which starts at 0)
    if (tier.minMultiple > 0 && showTiers.includes(tier.id)) {
      const price = calculatePriceFromMultiple(tier.minMultiple, financials)
      if (price !== null && price > 0) {
        levels.push({
          price,
          multiple: tier.minMultiple,
          label: tier.label,
          color: tier.color,
          tierId: tier.id
        })
      }
    }
  })
  
  return levels
}
