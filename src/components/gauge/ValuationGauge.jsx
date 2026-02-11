import { useEffect, useMemo, useState } from 'react'
import { VALUATION_TIERS, GAUGE_CONFIG, getValuationTier } from '../../config/constants'
import { useLanguage } from '../../i18n/LanguageContext'
import './ValuationGauge.css'

const DIAL_START_ANGLE = 225
const DIAL_SWEEP_ANGLE = 270
const DIAL_END_ANGLE = DIAL_START_ANGLE + DIAL_SWEEP_ANGLE
const SEGMENT_GAP_DEG = 2.2
const MULTIPLE_CACHE_KEY = 'tsla:last_revenue_multiple'

const VALUE_MIN = GAUGE_CONFIG.minMultiple
const VALUE_MAX = GAUGE_CONFIG.maxMultiple

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function valueToAngle(value) {
  const clamped = clamp(value, VALUE_MIN, VALUE_MAX)
  const fraction = (clamped - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)
  return DIAL_START_ANGLE + fraction * DIAL_SWEEP_ANGLE
}

function polarToCartesian(cx, cy, radius, angleDeg) {
  // SVG-friendly dial system: 0deg is top, 90deg is right, 180deg is bottom.
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

export default function ValuationGauge({ multiple, locked, tier }) {
  const { t } = useLanguage()
  const cx = 250
  const cy = 190
  const radius = 140
  const segmentStroke = 34
  const trackStroke = 42
  const bezelStroke = 8
  const [cachedMultiple, setCachedMultiple] = useState(() => {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(MULTIPLE_CACHE_KEY)
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  })

  useEffect(() => {
    if (typeof multiple !== 'number' || !Number.isFinite(multiple) || multiple <= 0) return
    setCachedMultiple(multiple)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MULTIPLE_CACHE_KEY, String(multiple))
    }
  }, [multiple])

  const liveMultiple = typeof multiple === 'number' && Number.isFinite(multiple) && multiple > 0 ? multiple : null
  const effectiveMultiple = liveMultiple ?? cachedMultiple
  const effectiveTier = tier ?? (effectiveMultiple ? getValuationTier(effectiveMultiple) : null)
  const tierKey = effectiveTier?.id
  const localizedTierLabel = tierKey ? t(`tiers.${tierKey}.label`) : t('gauge.priceFeed')
  const localizedSignal = tierKey ? t(`tiers.${tierKey}.signal`) : 'WAIT'
  const localizedTierDescription = tierKey ? t(`tiers.${tierKey}.description`) : null

  const segments = useMemo(
    () =>
      VALUATION_TIERS.map((tierConfig, index) => {
        const startValue = clamp(tierConfig.minMultiple, VALUE_MIN, VALUE_MAX)
        const endValue = clamp(tierConfig.maxMultiple, VALUE_MIN, VALUE_MAX)
        if (endValue <= startValue) return null

        const rawStartAngle = valueToAngle(startValue)
        const rawEndAngle = valueToAngle(endValue)
        const gapLeft = index > 0 ? SEGMENT_GAP_DEG / 2 : 0
        const gapRight = index < VALUATION_TIERS.length - 1 ? SEGMENT_GAP_DEG / 2 : 0
        const startAngle = rawStartAngle + gapLeft
        const endAngle = rawEndAngle - gapRight
        if (endAngle <= startAngle) return null

        return {
          ...tierConfig,
          startAngle,
          endAngle,
          path: describeArc(cx, cy, radius, startAngle, endAngle),
        }
      }).filter(Boolean),
    [cx, cy, radius]
  )

  const trackPath = useMemo(
    () => describeArc(cx, cy, radius, DIAL_START_ANGLE, DIAL_END_ANGLE),
    [cx, cy, radius]
  )

  const needleAngle = valueToAngle(effectiveMultiple ?? VALUE_MIN)
  const needleLength = radius - 18
  const needleStartRotation = DIAL_START_ANGLE
  const needleTargetRotation = needleAngle
  const currentColor = effectiveTier?.signalColor || effectiveTier?.color || '#8fa0b7'

  const actionText = localizedSignal
  const tierLabel = localizedTierLabel
  const statusText = effectiveMultiple
    ? `${effectiveMultiple.toFixed(1)}x P/S${liveMultiple ? '' : ` (${t('gauge.cachedTag')})`}`
    : t('gauge.waitingForLiveData')

  return (
    <div className={`gauge-wrapper ${locked ? 'gauge-locked' : ''}`}>
      <div className="gauge-card">
        <div className={`gauge-svg-container ${locked ? 'gauge-blurred' : ''}`}>
          <svg viewBox="0 0 500 360" xmlns="http://www.w3.org/2000/svg" className="gauge-svg">
            <path
              d={describeArc(cx, cy, radius + 22, DIAL_START_ANGLE, DIAL_END_ANGLE)}
              fill="none"
              stroke="rgba(130, 138, 152, 0.65)"
              strokeWidth={bezelStroke}
              strokeLinecap="round"
            />

            <path
              d={trackPath}
              fill="none"
              stroke="#2a2a32"
              strokeWidth={trackStroke}
              strokeLinecap="round"
            />

            <path
              d={describeArc(cx, cy, radius - 24, DIAL_START_ANGLE, DIAL_END_ANGLE)}
              fill="none"
              stroke="rgba(10, 12, 21, 0.92)"
              strokeWidth={10}
              strokeLinecap="round"
            />

            {segments.map((seg) => (
              <path
                key={seg.id}
                d={seg.path}
                fill="none"
                stroke={seg.color}
                strokeWidth={segmentStroke}
                strokeLinecap="round"
                opacity={0.95}
              />
            ))}

            <text
              x={cx}
              y={cy - 38}
              fill="rgba(255,255,255,0.85)"
              fontSize="18"
              fontWeight="700"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.1em"
            >
              {t('gauge.currentValuation')}
            </text>

            <text
              x={cx}
              y={cy - 2}
              fill={effectiveTier ? effectiveTier.color : 'rgba(214, 220, 232, 0.9)'}
              fontSize="42"
              fontWeight="700"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.05em"
            >
              {tierLabel}
            </text>

            <text
              x={cx}
              y={cy + 20}
              fill="rgba(200, 206, 218, 0.68)"
              fontSize="13"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.04em"
            >
              {statusText.toUpperCase()}
            </text>

            {effectiveMultiple && (
              <g
              className="gauge-needle"
              style={{
                '--needle-start-rotation': `${needleStartRotation}deg`,
                '--needle-target-rotation': `${needleTargetRotation}deg`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            >
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - needleLength}
                stroke="#d4d9e1"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - needleLength + 8}
                stroke="rgba(87, 92, 102, 0.95)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="16" fill="#9aa0aa" />
              <circle cx={cx} cy={cy} r="7" fill="#1a1a22" />
              </g>
            )}

            <text
              x={cx}
              y={cy + 74}
              fill="rgba(255,255,255,0.85)"
              fontSize="21"
              fontWeight="700"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.08em"
            >
              {`${t('gauge.action')}: `}
              <tspan fill={currentColor}>{actionText}</tspan>
            </text>

            {localizedTierDescription && (
              <text
                x={cx}
                y={cy + 96}
                fill="rgba(200, 206, 218, 0.68)"
                fontSize="13"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                letterSpacing="0.04em"
              >
                {localizedTierDescription.toUpperCase()}
              </text>
            )}
          </svg>
        </div>

        {locked && (
          <div className="gauge-lock-overlay">
            <div className="gauge-lock-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="gauge-lock-text">{t('gauge.lock')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
