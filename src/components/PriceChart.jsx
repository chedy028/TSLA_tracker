import { useEffect, useRef, useMemo } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { VALUATION_TIERS, calculatePriceFromMultiple } from '../config/constants'

// Human-readable labels for each range
const RANGE_LABELS = {
  '1D': '1 Day',
  '1M': '1 Month',
  '1Y': '1 Year',
  '5Y': '5 Years',
}

export function PriceChart({ 
  candles, 
  loading, 
  candlesLoading,
  financials, 
  currentPrice,
  selectedRange,
  onRangeChange,
  availableRanges = ['1D', '1M', '1Y', '5Y'],
}) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const priceLinesRef = useRef([])
  const currentPriceLineRef = useRef(null)

  // Calculate all valuation tier price boundaries for colored bands
  // Each line marks the START of a tier zone and uses that tier's color
  const tierBoundaries = useMemo(() => {
    if (!financials?.ttmRevenue || !financials?.sharesOutstanding) return []
    
    const boundaries = []
    
    // Create lines at the START of each tier (minMultiple) with that tier's color
    // Skip BARGAIN since it starts at 0
    VALUATION_TIERS.forEach(tier => {
      if (tier.minMultiple > 0) {
        const price = calculatePriceFromMultiple(tier.minMultiple, financials)
        if (price !== null && price > 0) {
          boundaries.push({
            price,
            color: tier.color,
            tierId: tier.id,
            label: tier.label,
          })
        }
      }
    })
    
    return boundaries
  }, [financials])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b8b8b',
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: {
          top: 0.05,
          bottom: 0.05,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0a0a0f',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0a0a0f',
        },
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00d4aa',
      downColor: '#ff4757',
      borderUpColor: '#00d4aa',
      borderDownColor: '#ff4757',
      wickUpColor: '#00d4aa',
      wickDownColor: '#ff4757',
      // Disable the default last price line (we show our own "Current" line)
      lastValueVisible: false,
      priceLineVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  // Update chart data when candles change
  useEffect(() => {
    if (seriesRef.current && candles.length > 0) {
      seriesRef.current.setData(candles)
      chartRef.current?.timeScale().fitContent()
    }
  }, [candles])

  // Adjust price scale to show all valuation lines including OVERPRICED
  useEffect(() => {
    if (!chartRef.current || tierBoundaries.length === 0 || candles.length === 0) return

    // Find the highest valuation line price
    const maxValuationPrice = Math.max(...tierBoundaries.map(b => b.price))
    
    // Find the price range from candles
    const candlePrices = candles.flatMap(c => [c.high, c.low]).filter(Boolean)
    const maxCandlePrice = Math.max(...candlePrices)
    const minCandlePrice = Math.min(...candlePrices)
    
    // If OVERPRICED line is above chart, extend the visible range
    if (maxValuationPrice > maxCandlePrice) {
      const padding = (maxValuationPrice - minCandlePrice) * 0.05
      chartRef.current.priceScale('right').applyOptions({
        autoScale: false,
        scaleMargins: { top: 0.02, bottom: 0.02 },
      })
      // Set visible range to include OVERPRICED line
      seriesRef.current.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: minCandlePrice - padding,
            maxValue: maxValuationPrice + padding,
          },
        }),
      })
    }
  }, [tierBoundaries, candles])

  // Update price lines when tier boundaries change
  // Each line is colored to match the valuation status zone below it
  useEffect(() => {
    if (!seriesRef.current) return

    // Remove existing price lines
    priceLinesRef.current.forEach(line => {
      seriesRef.current.removePriceLine(line)
    })
    priceLinesRef.current = []

    // Add boundary lines - each line marks the TOP of a zone with that zone's color
    tierBoundaries.forEach(boundary => {
      const priceLine = seriesRef.current.createPriceLine({
        price: boundary.price,
        color: boundary.color,
        lineWidth: 2,
        lineStyle: 0, // Solid line
        axisLabelVisible: true,
        title: '', // No label to hide the multiplier
      })
      priceLinesRef.current.push(priceLine)
    })
  }, [tierBoundaries])

  // Add current price line with label
  useEffect(() => {
    if (!seriesRef.current || !currentPrice) return

    // Remove existing current price line
    if (currentPriceLineRef.current) {
      seriesRef.current.removePriceLine(currentPriceLineRef.current)
    }

    // Add current price line - white dashed line with "Current" label
    currentPriceLineRef.current = seriesRef.current.createPriceLine({
      price: currentPrice,
      color: '#ffffff',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'Current',
    })
  }, [currentPrice])

  const isLoading = loading || candlesLoading

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-header-left">
          <span className="chart-title">TSLA</span>
          <span className="chart-subtitle">{RANGE_LABELS[selectedRange] || selectedRange} Price History</span>
        </div>
        <div className="chart-range-selector">
          {availableRanges.map((range) => (
            <button
              key={range}
              className={`range-btn ${selectedRange === range ? 'active' : ''}`}
              onClick={() => onRangeChange?.(range)}
              disabled={isLoading}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div 
        ref={chartContainerRef} 
        className="chart-wrapper"
        style={{ opacity: isLoading ? 0.5 : 1 }}
      />
      {isLoading && (
        <div className="chart-loading">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  )
}
