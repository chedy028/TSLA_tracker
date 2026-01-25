// Valuation tiers based on Price-to-Sales (Revenue) ratio
export const VALUATION_TIERS = [
  {
    id: 'bargain',
    label: 'BARGAIN BASEMENT',
    description: 'Strong buy signal',
    minMultiple: 0,
    maxMultiple: 5,
    color: '#00ff88',
    bgColor: 'rgba(0, 255, 136, 0.15)',
  },
  {
    id: 'cheap',
    label: 'CHEAP',
    description: 'Consider accumulating',
    minMultiple: 5,
    maxMultiple: 7,
    color: '#00d4aa',
    bgColor: 'rgba(0, 212, 170, 0.15)',
  },
  {
    id: 'fair',
    label: 'FAIR PRICED',
    description: 'Hold position',
    minMultiple: 8,
    maxMultiple: 12,
    color: '#ffd000',
    bgColor: 'rgba(255, 208, 0, 0.15)',
  },
  {
    id: 'expensive',
    label: 'EXPENSIVE',
    description: 'Caution advised',
    minMultiple: 13,
    maxMultiple: 20,
    color: '#ff8c00',
    bgColor: 'rgba(255, 140, 0, 0.15)',
  },
  {
    id: 'overpriced',
    label: 'OVERPRICED',
    description: 'Consider taking profits',
    minMultiple: 20,
    maxMultiple: Infinity,
    color: '#ff4757',
    bgColor: 'rgba(255, 71, 87, 0.15)',
  },
]

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
