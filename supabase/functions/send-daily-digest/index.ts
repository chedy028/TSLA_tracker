// Supabase Edge Function: Send Daily Digest Emails
// Deploy with: supabase functions deploy send-daily-digest
// Schedule with pg_cron to run at 8 AM daily

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = 'TSLA Cheat Code <digest@tsla-cheatcode.com>'

async function fetchTSLAData() {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d'
    )
    const data = await response.json()
    const meta = data.chart?.result?.[0]?.meta
    
    return {
      price: meta?.regularMarketPrice || 0,
      change: (meta?.regularMarketPrice || 0) - (meta?.previousClose || 0),
      changePercent: (((meta?.regularMarketPrice || 0) - (meta?.previousClose || 0)) / (meta?.previousClose || 1)) * 100,
    }
  } catch (error) {
    console.error('Error fetching TSLA data:', error)
    return null
  }
}

function getValuationTier(price: number) {
  const revenue = 97
  const shares = 3.19
  const marketCap = price * shares
  const multiple = marketCap / revenue

  if (multiple >= 20) return { tier: 'OVERPRICED', multiple }
  if (multiple >= 13) return { tier: 'EXPENSIVE', multiple }
  if (multiple >= 8) return { tier: 'FAIR PRICED', multiple }
  if (multiple >= 5) return { tier: 'CHEAP', multiple }
  return { tier: 'BARGAIN BASEMENT', multiple }
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!response.ok) {
    throw new Error(`Failed to send email: ${await response.text()}`)
  }
  return response.json()
}

function digestEmailTemplate(price: number, change: number, changePercent: number, tier: string, multiple: number) {
  const isPositive = change >= 0
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff; padding: 40px; margin: 0; }
        .container { max-width: 500px; margin: 0 auto; background: #12121a; border-radius: 16px; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .logo { font-size: 32px; font-weight: bold; color: #00d4aa; }
        .date { color: #5a5a6a; font-size: 14px; margin-top: 8px; }
        .price-section { text-align: center; margin: 30px 0; }
        .price { font-size: 56px; font-weight: bold; font-family: 'JetBrains Mono', monospace; }
        .change { font-size: 20px; color: ${isPositive ? '#00d4aa' : '#ff4757'}; margin-top: 8px; }
        .stats { background: #16161f; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .stat-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .stat-row:last-child { border-bottom: none; }
        .stat-label { color: #8b8b9a; }
        .stat-value { font-weight: 600; font-family: 'JetBrains Mono', monospace; }
        .tier-section { text-align: center; margin: 30px 0; }
        .tier-label { color: #8b8b9a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .tier-value { font-size: 28px; font-weight: bold; color: #00d4aa; margin-top: 8px; }
        .cta { text-align: center; margin: 30px 0; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #00d4aa, #00a88a); color: #0a0a0f; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); color: #5a5a6a; font-size: 12px; }
        .disclaimer { color: #5a5a6a; font-size: 11px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎮 TSLA Cheat Code</div>
          <div class="date">${date}</div>
        </div>
        
        <div class="price-section">
          <div class="price">$${price.toFixed(2)}</div>
          <div class="change">${isPositive ? '↑' : '↓'} ${isPositive ? '+' : ''}$${change.toFixed(2)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)</div>
        </div>

        <div class="tier-section">
          <div class="tier-label">Current Valuation</div>
          <div class="tier-value">${tier}</div>
        </div>

        <div class="stats">
          <div class="stat-row">
            <span class="stat-label">P/S Ratio</span>
            <span class="stat-value">${multiple.toFixed(1)}x</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Market Cap</span>
            <span class="stat-value">$${(price * 3.19).toFixed(0)}B</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">TTM Revenue</span>
            <span class="stat-value">$97B</span>
          </div>
        </div>

        <div class="cta">
          <a href="https://tsla-tracker.vercel.app" class="cta-btn">View Full Analysis</a>
        </div>

        <div class="footer">
          <p>You're receiving this daily digest because you enabled it in your alert settings.</p>
          <p class="disclaimer">Not financial advice. Always do your own research.</p>
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

    // Fetch TSLA data
    const tslaData = await fetchTSLAData()
    if (!tslaData) {
      return new Response(JSON.stringify({ error: 'Could not fetch TSLA data' }), { status: 500 })
    }

    const { tier, multiple } = getValuationTier(tslaData.price)

    // Get all users with daily digest enabled
    const { data: settings, error } = await supabase
      .from('alert_settings')
      .select(`
        *,
        profiles!inner(id, email, subscription_status)
      `)
      .eq('daily_digest_enabled', true)
      .eq('profiles.subscription_status', 'active')

    if (error) throw error

    let emailsSent = 0

    for (const setting of settings || []) {
      const userEmail = setting.profiles?.email
      if (!userEmail) continue

      try {
        await sendEmail(
          userEmail,
          `📊 TSLA Daily Digest: $${tslaData.price.toFixed(2)} - ${tier}`,
          digestEmailTemplate(tslaData.price, tslaData.change, tslaData.changePercent, tier, multiple)
        )

        // Log the digest
        await supabase.from('alert_history').insert({
          user_id: setting.user_id,
          alert_type: 'daily_digest',
          message: `Daily digest sent`,
          metadata: { price: tslaData.price, tier, multiple },
        })

        emailsSent++
      } catch (err) {
        console.error(`Failed to send digest to ${userEmail}:`, err)
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent, price: tslaData.price, tier }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Daily digest error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})






