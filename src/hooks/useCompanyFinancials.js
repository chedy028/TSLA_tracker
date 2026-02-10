import { useState, useEffect, useCallback } from 'react'

const SYMBOL = 'TSLA'

// CORS proxy for Yahoo Finance
const CORS_PROXY = 'https://api.allorigins.win/raw?url='

// Yahoo Finance for shares outstanding and financial data
const YAHOO_QUOTE_URL = `${CORS_PROXY}${encodeURIComponent(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${SYMBOL}?modules=defaultKeyStatistics,financialData`)}`

// Fallback values (updated as of Q4 2024) - used immediately, then updated from API
const FALLBACK_FINANCIALS = {
  ttmRevenue: 97.0,           // in billions
  sharesOutstanding: 3.19,    // in billions
  lastUpdated: '2024-Q4',
}

export function useCompanyFinancials() {
  // Start with fallback data immediately so UI is never in loading state
  const [financials, setFinancials] = useState(FALLBACK_FINANCIALS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch from Yahoo Finance with timeout
  const fetchFromYahoo = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch(YAHOO_QUOTE_URL, { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (!response.ok) return null
      
      const data = await response.json()
      const stats = data.quoteSummary?.result?.[0]?.defaultKeyStatistics
      const financial = data.quoteSummary?.result?.[0]?.financialData
      
      if (!stats) return null

      // Get shares outstanding (Yahoo provides in raw number)
      const sharesOutstanding = stats.sharesOutstanding?.raw || 0
      const sharesOutstandingBillions = sharesOutstanding / 1e9

      // Get total revenue (TTM)
      const totalRevenue = financial?.totalRevenue?.raw || 0
      const ttmRevenueBillions = totalRevenue / 1e9

      // Validate - ensure values are in reasonable range for Tesla
      if (ttmRevenueBillions >= 50 && ttmRevenueBillions <= 200 &&
          sharesOutstandingBillions >= 2 && sharesOutstandingBillions <= 5) {
        return {
          ttmRevenue: parseFloat(ttmRevenueBillions.toFixed(2)),
          sharesOutstanding: parseFloat(sharesOutstandingBillions.toFixed(2)),
        }
      }
    } catch (err) {
      console.error('Yahoo financials error:', err)
    }
    return null
  }, [])

  const fetchFinancials = useCallback(async () => {
    const data = await fetchFromYahoo()

    const now = new Date()
    const quarter = Math.ceil((now.getMonth() + 1) / 3)
    const year = now.getFullYear()

    if (data) {
      setFinancials({
        ...data,
        lastUpdated: `${year}-Q${quarter} (live)`,
      })
      setError(null)
    }
    // If API fails, we already have fallback data - no need to update
  }, [fetchFromYahoo])

  // Fetch on mount only (no auto-refresh)
  useEffect(() => {
    fetchFinancials()
  }, [fetchFinancials])

  return {
    financials,
    loading,
    error,
    refetch: fetchFinancials,
  }
}
