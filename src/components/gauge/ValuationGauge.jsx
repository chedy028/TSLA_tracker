import { useMemo } from 'react'
import { VALUATION_TIERS, GAUGE_CONFIG } from '../../config/constants'
import './ValuationGauge.css'

// Convert multiple to angle on the gauge (0-180 degrees mapped to SVG arc)
function multipleToAngle(multiple) {
  const clamped = Math.max(GAUGE_CONFIG.minMultiple, Math.min(GAUGE_CONFIG.maxMultiple, multiple))
  return (clamped / GAUGE_CONFIG.maxMultiple) * 180
}

// Convert angle (0-180) to SVG coordinates on a semicircular arc
function angleToPoint(angleDeg, radius, cx, cy) {
  // 0 degrees = left side, 180 degrees = right side
  const angleRad = ((180 - angleDeg) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy - radius * Math.sin(angleRad),
  }
}

// Build arc path for a segment
function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = angleToPoint(startAngle, radius, cx, cy)
  const end = angleToPoint(endAngle, radius, cx, cy)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

export default function ValuationGauge({ multiple, locked, tier }) {
  const cx = 200
  const cy = 180
  const radius = 150
  const strokeWidth = 24

  // Build segments proportional to their multiple range
  const segments = useMemo(() => {
    return VALUATION_TIERS.map((t) => {
      const max = Math.min(t.maxMultiple, GAUGE_CONFIG.maxMultiple)
      const startAngle = (t.minMultiple / GAUGE_CONFIG.maxMultiple) * 180
      const endAngle = (max / GAUGE_CONFIG.maxMultiple) * 180
      return {
        ...t,
        startAngle,
        endAngle,
        path: describeArc(cx, cy, radius, startAngle, endAngle),
      }
    })
  }, [])

  // Tick marks at tier boundaries
  const ticks = useMemo(() => {
    const boundaries = [5, 7, 12, 20]
    return boundaries.map((m) => {
      const angle = multipleToAngle(m)
      const outer = angleToPoint(angle, radius + strokeWidth / 2 + 6, cx, cy)
      const inner = angleToPoint(angle, radius - strokeWidth / 2 - 6, cx, cy)
      return { m, outer, inner, angle }
    })
  }, [])

  const needleAngle = multiple ? multipleToAngle(multiple) : 0
  const needleEnd = angleToPoint(needleAngle, radius - 10, cx, cy)
  const currentColor = tier?.color || '#00ff88'

  return (
    <div className={`gauge-wrapper ${locked ? 'gauge-locked' : ''}`}>
      <div className={`gauge-svg-container ${locked ? 'gauge-blurred' : ''}`}>
        <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" className="gauge-svg">
          <defs>
            <filter id="needleGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="segmentGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Arc segments */}
          {segments.map((seg) => (
            <path
              key={seg.id}
              d={seg.path}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              opacity={0.85}
            />
          ))}

          {/* Tick marks */}
          {ticks.map((tick) => (
            <g key={tick.m}>
              <line
                x1={tick.inner.x}
                y1={tick.inner.y}
                x2={tick.outer.x}
                y2={tick.outer.y}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              />
              <text
                x={angleToPoint(tick.angle, radius + strokeWidth / 2 + 18, cx, cy).x}
                y={angleToPoint(tick.angle, radius + strokeWidth / 2 + 18, cx, cy).y}
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="'JetBrains Mono', monospace"
              >
                {tick.m}x
              </text>
            </g>
          ))}

          {/* Needle */}
          {multiple > 0 && (
            <g filter="url(#needleGlow)">
              <line
                x1={cx}
                y1={cy}
                x2={needleEnd.x}
                y2={needleEnd.y}
                stroke={currentColor}
                strokeWidth="3"
                strokeLinecap="round"
                className="gauge-needle"
                style={{
                  '--needle-angle': `${needleAngle}deg`,
                  transformOrigin: `${cx}px ${cy}px`,
                }}
              />
              <circle cx={cx} cy={cy} r="8" fill={currentColor} />
              <circle cx={cx} cy={cy} r="4" fill="#0a0a0f" />
            </g>
          )}
        </svg>
      </div>

      {/* Locked overlay */}
      {locked && (
        <div className="gauge-lock-overlay">
          <div className="gauge-lock-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="gauge-lock-text">ALGO SIGNAL LOCKED</span>
        </div>
      )}

      {/* Tier label (unlocked only) */}
      {!locked && tier && (
        <div className="gauge-tier-label" style={{ color: tier.color }}>
          {tier.label}
        </div>
      )}
    </div>
  )
}
