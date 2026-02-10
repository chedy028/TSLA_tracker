// Supabase Edge Function: Send Email Alerts
// Deploy with: supabase functions deploy send-alerts
// Schedule with pg_cron to run every 15 minutes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = 'TSLA Cheat Code <alerts@tsla-cheatcode.com>'

// Large movement threshold (10%)
const LARGE_MOVEMENT_THRESHOLD = 10

// Fetch current TSLA price and previous close
async function fetchTSLAPrice(): Promise<{ price: number; previousClose: number } | null> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d'
    )
    const data = await response.json()
    const meta = data.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice
    const previousClose = meta?.previousClose || meta?.chartPreviousClose
    
    if (price && previousClose) {
      return { price, previousClose }
    }
    return null
  } catch (error) {
    console.error('Error fetching TSLA price:', error)
    return null
  }
}

// Calculate valuation tier
function getValuationTier(price: number, revenue = 97, shares = 3.19) {
  const marketCap = price * shares
  const multiple = marketCap / revenue

  if (multiple >= 20) return 'OVERPRICED'
  if (multiple >= 13) return 'EXPENSIVE'
  if (multiple >= 8) return 'FAIR PRICED'
  if (multiple >= 5) return 'CHEAP'
  return 'BARGAIN BASEMENT'
}

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${error}`)
  }

  return response.json()
}

// Email templates
function priceAlertEmail(price: number, threshold: number, direction: 'above' | 'below') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #00d4aa; }
        .price-box { background: #16161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
        .price { font-size: 48px; font-weight: bold; color: ${direction === 'above' ? '#00d4aa' : '#ff4757'}; }
        .alert-text { color: #8b8b9a; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #5a5a6a; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎮 TSLA Cheat Code</div>
        </div>
        <h2>Price Alert Triggered!</h2>
        <p>TSLA has crossed your ${direction === 'above' ? 'upper' : 'lower'} price threshold.</p>
        <div class="price-box">
          <div class="price">$${price.toFixed(2)}</div>
          <div class="alert-text">Your threshold: $${threshold.toFixed(2)}</div>
        </div>
        <p>This alert was triggered because TSLA is now trading ${direction} your set threshold.</p>
        <div class="footer">
          <p>You're receiving this because you enabled price alerts on TSLA Cheat Code.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function valuationAlertEmail(price: number, oldTier: string, newTier: string, multiple: number) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #00d4aa; }
        .tier-change { background: #16161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
        .tier { font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 8px; display: inline-block; }
        .arrow { font-size: 32px; margin: 0 20px; color: #5a5a6a; }
        .multiple { color: #8b8b9a; margin-top: 15px; }
        .footer { text-align: center; margin-top: 30px; color: #5a5a6a; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎮 TSLA Cheat Code</div>
        </div>
        <h2>Valuation Tier Changed!</h2>
        <p>TSLA's valuation tier has changed based on the Price-to-Sales ratio.</p>
        <div class="tier-change">
          <span class="tier" style="background: rgba(255,140,0,0.2); color: #ff8c00;">${oldTier}</span>
          <span class="arrow">→</span>
          <span class="tier" style="background: rgba(0,212,170,0.2); color: #00d4aa;">${newTier}</span>
          <div class="multiple">Current P/S Ratio: ${multiple.toFixed(1)}x</div>
        </div>
        <p>Current price: $${price.toFixed(2)}</p>
        <div class="footer">
          <p>You're receiving this because you enabled valuation alerts on TSLA Cheat Code.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function dailyDigestEmail(price: number, change: number, changePercent: number, tier: string, multiple: number) {
  const isPositive = change >= 0
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #00d4aa; }
        .summary-box { background: #16161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; margin: 20px 0; }
        .price { font-size: 48px; font-weight: bold; }
        .change { font-size: 18px; color: ${isPositive ? '#00d4aa' : '#ff4757'}; }
        .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .stat-label { color: #8b8b9a; }
        .stat-value { font-weight: 600; }
        .tier-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: 600; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #5a5a6a; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎮 TSLA Cheat Code</div>
          <p style="color: #8b8b9a;">Daily Digest - ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="summary-box">
          <div class="price">$${price.toFixed(2)}</div>
          <div class="change">${isPositive ? '+' : ''}${change.toFixed(2)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)</div>
          <div style="margin-top: 20px;">
            <div class="stat">
              <span class="stat-label">Valuation</span>
              <span class="stat-value">${tier}</span>
            </div>
            <div class="stat">
              <span class="stat-label">P/S Ratio</span>
              <span class="stat-value">${multiple.toFixed(1)}x</span>
            </div>
          </div>
        </div>
        <p style="text-align: center; color: #8b8b9a;">
          <a href="https://tsla-tracker.vercel.app" style="color: #00d4aa;">View full analysis →</a>
        </p>
        <div class="footer">
          <p>You're receiving this because you enabled daily digest on TSLA Cheat Code.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function largeMovementAlertEmail(price: number, previousClose: number, changePercent: number) {
  const isUp = changePercent > 0
  const direction = isUp ? 'UP' : 'DOWN'
  const emoji = isUp ? '🚀' : '📉'
  const color = isUp ? '#00d4aa' : '#ff4757'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #00d4aa; }
        .alert-box { background: #16161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
        .movement-badge { display: inline-block; padding: 12px 24px; border-radius: 8px; font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        .price { font-size: 48px; font-weight: bold; }
        .change { font-size: 24px; font-weight: 600; margin-top: 10px; }
        .details { color: #8b8b9a; margin-top: 15px; font-size: 14px; }
        .footer { text-align: center; margin-top: 30px; color: #5a5a6a; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎮 TSLA Cheat Code</div>
        </div>
        <h2>${emoji} Large Price Movement Alert!</h2>
        <p>TSLA has moved significantly today - more than 10% in a single day.</p>
        <div class="alert-box">
          <div class="movement-badge" style="background: ${color}20; color: ${color};">
            ${direction} ${Math.abs(changePercent).toFixed(2)}%
          </div>
          <div class="price" style="color: ${color};">$${price.toFixed(2)}</div>
          <div class="change" style="color: ${color};">
            ${isUp ? '+' : ''}$${(price - previousClose).toFixed(2)}
          </div>
          <div class="details">
            Previous Close: $${previousClose.toFixed(2)}
          </div>
        </div>
        <p style="text-align: center;">This is a significant market event. Consider reviewing your investment strategy.</p>
        <p style="text-align: center; color: #8b8b9a;">
          <a href="https://tsla-tracker.vercel.app" style="color: #00d4aa;">View live analysis →</a>
        </p>
        <div class="footer">
          <p>You're receiving this because you enabled large movement alerts on TSLA Cheat Code.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Fetch current TSLA price and previous close
    const priceData = await fetchTSLAPrice()
    if (!priceData) {
      return new Response(JSON.stringify({ error: 'Could not fetch price' }), { status: 500 })
    }

    const { price, previousClose } = priceData
    const tier = getValuationTier(price)
    const multiple = (price * 3.19) / 97
    
    // Calculate daily change percentage
    const dailyChange = price - previousClose
    const dailyChangePercent = (dailyChange / previousClose) * 100

    // Get all users with active alerts
    const { data: alertSettings, error } = await supabase
      .from('alert_settings')
      .select(`
        *,
        profiles!inner(id, email, subscription_status)
      `)
      .eq('profiles.subscription_status', 'active')

    if (error) throw error

    const alertsSent = []
    const now = new Date()

    for (const setting of alertSettings || []) {
      const userEmail = setting.profiles?.email
      if (!userEmail) continue

      // Check price alerts
      if (setting.price_alert_enabled) {
        if (setting.price_threshold_high && price >= setting.price_threshold_high) {
          await sendEmail(
            userEmail,
            `🚀 TSLA Price Alert: Above $${setting.price_threshold_high}`,
            priceAlertEmail(price, setting.price_threshold_high, 'above')
          )
          alertsSent.push({ type: 'price_high', user: setting.user_id })

          // Log alert
          await supabase.from('alert_history').insert({
            user_id: setting.user_id,
            alert_type: 'price_high',
            message: `Price crossed above $${setting.price_threshold_high}`,
            metadata: { price, threshold: setting.price_threshold_high },
          })
        }

        if (setting.price_threshold_low && price <= setting.price_threshold_low) {
          await sendEmail(
            userEmail,
            `📉 TSLA Price Alert: Below $${setting.price_threshold_low}`,
            priceAlertEmail(price, setting.price_threshold_low, 'below')
          )
          alertsSent.push({ type: 'price_low', user: setting.user_id })

          await supabase.from('alert_history').insert({
            user_id: setting.user_id,
            alert_type: 'price_low',
            message: `Price crossed below $${setting.price_threshold_low}`,
            metadata: { price, threshold: setting.price_threshold_low },
          })
        }
      }

      // Check valuation alerts
      if (setting.valuation_alert_enabled && setting.last_valuation_tier && setting.last_valuation_tier !== tier) {
        await sendEmail(
          userEmail,
          `📊 TSLA Valuation Changed: ${tier}`,
          valuationAlertEmail(price, setting.last_valuation_tier, tier, multiple)
        )
        alertsSent.push({ type: 'valuation', user: setting.user_id })

        await supabase.from('alert_history').insert({
          user_id: setting.user_id,
          alert_type: 'valuation_change',
          message: `Valuation changed from ${setting.last_valuation_tier} to ${tier}`,
          metadata: { price, oldTier: setting.last_valuation_tier, newTier: tier, multiple },
        })
      }

      // Check large movement alerts (10%+ move)
      if (setting.large_movement_alert_enabled && Math.abs(dailyChangePercent) >= LARGE_MOVEMENT_THRESHOLD) {
        // Check if we already sent a large movement alert today (prevent spam)
        const lastAlertDate = setting.last_large_movement_alert_at 
          ? new Date(setting.last_large_movement_alert_at).toDateString()
          : null
        const todayDate = now.toDateString()
        
        if (lastAlertDate !== todayDate) {
          const direction = dailyChangePercent > 0 ? 'up' : 'down'
          await sendEmail(
            userEmail,
            `🔔 TSLA Large Movement: ${direction === 'up' ? '🚀' : '📉'} ${Math.abs(dailyChangePercent).toFixed(1)}% ${direction}!`,
            largeMovementAlertEmail(price, previousClose, dailyChangePercent)
          )
          alertsSent.push({ type: 'large_movement', user: setting.user_id })

          await supabase.from('alert_history').insert({
            user_id: setting.user_id,
            alert_type: 'large_movement',
            message: `Large price movement: ${dailyChangePercent.toFixed(2)}%`,
            metadata: { price, previousClose, changePercent: dailyChangePercent },
          })

          // Update last large movement alert timestamp
          await supabase
            .from('alert_settings')
            .update({ last_large_movement_alert_at: now.toISOString() })
            .eq('user_id', setting.user_id)
        }
      }

      // Update last valuation tier and price checked
      await supabase
        .from('alert_settings')
        .update({ 
          last_valuation_tier: tier,
          last_price_checked: price,
        })
        .eq('user_id', setting.user_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        price, 
        previousClose,
        dailyChangePercent: dailyChangePercent.toFixed(2),
        tier, 
        alertsSent: alertsSent.length 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Alert function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
