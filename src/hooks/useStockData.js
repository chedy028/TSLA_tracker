import { useState, useEffect, useCallback } from 'react'

const SYMBOL = 'TSLA'

// Range configuration mapping
// Maps user-friendly range names to Yahoo Finance API parameters
const RANGE_CONFIG = {
  '1D': { range: '1d', interval: '5m' },
  '1M': { range: '1mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1d' },
}

// Convert Unix timestamp to appropriate format for TradingView charts
// lightweight-charts requires Unix timestamp (number) for all time values
function formatTime(unixTimestamp, isIntraday = false) {
  const date = new Date(unixTimestamp * 1000)
  // Always return Unix timestamp in seconds (not milliseconds)
  return Math.floor(date.getTime() / 1000)
}

// Yahoo Finance API via CORS proxy (no API key needed)
const CORS_PROXY = 'https://api.allorigins.win/raw?url='

function buildYahooUrl(range, interval) {
  return `${CORS_PROXY}${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}?interval=${interval}&range=${range}`)}`
}

export function useStockData(initialRange = '5Y') {
  const [quote, setQuote] = useState(null)
  const [candles, setCandles] = useState([])
  const [loading, setLoading] = useState(true)
  const [candlesLoading, setCandlesLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedRange, setSelectedRange] = useState(initialRange)

  // Fetch quote from Yahoo Finance (always uses 1d range)
  const fetchQuote = useCallback(async () => {
    try {
      const url = buildYahooUrl('1d', '1d')
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch quote')
      }
      
      const data = await response.json()
      const result = data.chart?.result?.[0]
      
      if (!result) {
        throw new Error('No data received')
      }
      
      const meta = result.meta
      const quoteData = result.indicators?.quote?.[0]
      
      if (meta?.regularMarketPrice) {
        const currentPrice = meta.regularMarketPrice
        const prevClose = meta.previousClose || meta.chartPreviousClose || currentPrice
        const change = currentPrice - prevClose
        const changePercent = prevClose ? (change / prevClose) * 100 : 0
        
        setQuote({
          current: currentPrice,
          change: change,
          changePercent: changePercent,
          high: meta.regularMarketDayHigh || quoteData?.high?.[0] || currentPrice,
          low: meta.regularMarketDayLow || quoteData?.low?.[0] || currentPrice,
          open: meta.regularMarketOpen || quoteData?.open?.[0] || currentPrice,
          previousClose: prevClose,
        })
        setLastUpdated(new Date())
        setError(null)
      } else {
        throw new Error('Invalid quote data')
      }
    } catch (err) {
      console.error('Quote fetch error:', err)
      setError(err.message)
    }
  }, [])

  // Fetch historical candles from Yahoo Finance
  const fetchCandles = useCallback(async (range = selectedRange) => {
    const config = RANGE_CONFIG[range]
    if (!config) {
      console.error('Invalid range:', range)
      return
    }

    setCandlesLoading(true)
    
    try {
      const url = buildYahooUrl(config.range, config.interval)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }
      
      const data = await response.json()
      const result = data.chart?.result?.[0]
      
      if (!result) {
        throw new Error('No history data')
      }
      
      const timestamps = result.timestamp
      const quoteData = result.indicators?.quote?.[0]
      const isIntraday = range === '1D'
      
      if (timestamps && quoteData) {
        const formattedCandles = timestamps.map((time, i) => ({
          time: formatTime(time, isIntraday),
          open: quoteData.open[i],
          high: quoteData.high[i],
          low: quoteData.low[i],
          close: quoteData.close[i],
        })).filter(c => c.open && c.close) // Filter out null values
        
        setCandles(formattedCandles)
      }
    } catch (err) {
      console.error('Candles fetch error:', err)
      // Set error so user knows chart data failed to load
      setError(err.message || 'Failed to load chart data')
    } finally {
      setCandlesLoading(false)
    }
  }, [selectedRange])

  // Change the selected range and fetch new data
  const changeRange = useCallback(async (newRange) => {
    if (!RANGE_CONFIG[newRange]) {
      console.error('Invalid range:', newRange)
      return
    }
    setSelectedRange(newRange)
    await fetchCandles(newRange)
  }, [fetchCandles])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([fetchQuote(), fetchCandles(selectedRange)])
    } catch (err) {
      console.error('Failed to fetch stock data:', err)
      // Error already handled in individual fetch functions
    } finally {
      setLoading(false)
    }
  }, [fetchQuote, fetchCandles, selectedRange])

  // Initial fetch only (no auto-refresh)
  useEffect(() => {
    fetchAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    quote,
    candles,
    loading,
    candlesLoading,
    error,
    lastUpdated,
    selectedRange,
    changeRange,
    refetch: fetchAll,
    availableRanges: Object.keys(RANGE_CONFIG),
  }
}
