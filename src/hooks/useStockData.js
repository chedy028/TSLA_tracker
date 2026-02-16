import { useState, useEffect, useCallback } from 'react'

const SYMBOL = 'TSLA'
const QUOTE_CACHE_KEY = 'tsla:quote_cache_v1'
const REQUEST_TIMEOUT_MS = 7000
const FETCH_ROUNDS = 2

// Range configuration mapping
// Maps user-friendly range names to Yahoo Finance API parameters
const RANGE_CONFIG = {
  '1D': { range: '1d', interval: '5m' },
  '1M': { range: '1mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1d' },
}

const YAHOO_CHART_URL = `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}`

const PROXY_BUILDERS = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://cors.isomorphic-git.org/${url}`,
]

// Convert Unix timestamp to appropriate format for TradingView charts
// lightweight-charts requires Unix timestamp (number) for all time values
function formatTime(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000)
  // Always return Unix timestamp in seconds (not milliseconds)
  return Math.floor(date.getTime() / 1000)
}

function readCachedQuote() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(QUOTE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.quote || !parsed?.cachedAt) return null
    return parsed
  } catch (error) {
    console.warn('Invalid quote cache payload:', error)
    return null
  }
}

function writeCachedQuote(quote) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      QUOTE_CACHE_KEY,
      JSON.stringify({
        quote,
        cachedAt: Date.now(),
      })
    )
  } catch (error) {
    console.warn('Failed to write quote cache:', error)
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchYahooChart(range, interval) {
  const upstreamUrl = `${YAHOO_CHART_URL}?interval=${interval}&range=${range}`
  let lastError = null

  for (let round = 0; round < FETCH_ROUNDS; round += 1) {
    for (const buildProxyUrl of PROXY_BUILDERS) {
      const proxiedUrl = buildProxyUrl(upstreamUrl)
      try {
        return await fetchJsonWithTimeout(proxiedUrl)
      } catch (error) {
        lastError = error
      }
    }
  }

  throw lastError || new Error('Failed to fetch Yahoo Finance data')
}

export function useStockData(initialRange = '5Y') {
  const initialCache = readCachedQuote()

  const [quote, setQuote] = useState(initialCache?.quote || null)
  const [candles, setCandles] = useState([])
  const [loading, setLoading] = useState(true)
  const [candlesLoading, setCandlesLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(
    initialCache?.cachedAt ? new Date(initialCache.cachedAt) : null
  )
  const [selectedRange, setSelectedRange] = useState(initialRange)
  const [isQuoteCached, setIsQuoteCached] = useState(Boolean(initialCache?.quote))
  const [quoteCachedAt, setQuoteCachedAt] = useState(initialCache?.cachedAt || null)

  // Fetch quote from Yahoo Finance (always uses 1d range)
  const fetchQuote = useCallback(async () => {
    try {
      const data = await fetchYahooChart('1d', '1d')
      const result = data.chart?.result?.[0]

      if (!result) {
        throw new Error('No quote data received')
      }

      const meta = result.meta
      const quoteData = result.indicators?.quote?.[0]

      if (!meta?.regularMarketPrice) {
        throw new Error('Invalid quote data')
      }

      const currentPrice = meta.regularMarketPrice
      const prevClose = meta.previousClose || meta.chartPreviousClose || currentPrice
      const change = currentPrice - prevClose
      const changePercent = prevClose ? (change / prevClose) * 100 : 0

      const liveQuote = {
        current: currentPrice,
        change,
        changePercent,
        high: meta.regularMarketDayHigh || quoteData?.high?.[0] || currentPrice,
        low: meta.regularMarketDayLow || quoteData?.low?.[0] || currentPrice,
        open: meta.regularMarketOpen || quoteData?.open?.[0] || currentPrice,
        previousClose: prevClose,
      }

      setQuote(liveQuote)
      setIsQuoteCached(false)
      setQuoteCachedAt(null)
      setLastUpdated(new Date())
      setError(null)
      writeCachedQuote(liveQuote)
      return
    } catch (err) {
      console.error('Quote fetch error:', err)
    }

    const cached = readCachedQuote()
    if (cached?.quote) {
      setQuote(cached.quote)
      setIsQuoteCached(true)
      setQuoteCachedAt(cached.cachedAt)
      setLastUpdated(new Date(cached.cachedAt))
      setError(null)
      return
    }

    setQuote(null)
    setIsQuoteCached(false)
    setQuoteCachedAt(null)
    setError('Failed to fetch live quote data')
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
      const data = await fetchYahooChart(config.range, config.interval)
      const result = data.chart?.result?.[0]

      if (!result) {
        throw new Error('No history data')
      }

      const timestamps = result.timestamp
      const quoteData = result.indicators?.quote?.[0]

      if (timestamps && quoteData) {
        const formattedCandles = timestamps.map((time, i) => ({
          time: formatTime(time),
          open: quoteData.open[i],
          high: quoteData.high[i],
          low: quoteData.low[i],
          close: quoteData.close[i],
        })).filter((c) => c.open && c.close) // Filter out null values

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
    isQuoteCached,
    quoteCachedAt,
  }
}
