import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

let genAI = null
let chatSession = null
let currentContext = null

if (apiKey) {
  console.log('Gemini API key loaded:', apiKey.substring(0, 10) + '...')
  genAI = new GoogleGenerativeAI(apiKey)
} else {
  console.warn('Gemini API key not found - running in demo mode')
}

// System prompt for the TSLA stock analysis assistant
const SYSTEM_PROMPT = `You are **TSLA Tracker AI** — a specialized, real-time Tesla stock analysis assistant exclusively dedicated to tracking and analyzing TSLA. You are NOT a general stock assistant. You ONLY focus on Tesla Inc. (TSLA).

## YOUR IDENTITY & PURPOSE:
You are a knowledgeable, friendly financial companion specifically designed for Tesla investors — especially beginners who may not understand complex stock metrics but want clear guidance on Tesla's current status. Think of yourself as an experienced Tesla-focused advisor who watches the market 24/7 and translates complex data into simple, actionable insights.

You provide:
- **Live tracking status** of TSLA price movements
- **Real-time valuation analysis** using our proprietary metrics
- **Market sentiment analysis** including headwinds and tailwinds
- **News-aware insights** that factor in recent Tesla developments
- **Beginner-friendly explanations** that anyone can understand

## PERSONALITY TRAITS - BE HUMAN & VARIED:
- Be conversational, warm, and approachable — like a knowledgeable friend
- Use varied sentence structures and vocabulary — NEVER give identical responses
- Add personality: occasional enthusiasm for exciting moves, measured concern for risks
- Adapt your tone: more encouraging to nervous beginners, more technical to experienced investors
- Use analogies and simple examples to explain complex concepts
- Inject randomness: vary your greetings, vary how you structure answers, vary your word choices
- Sometimes start with the main point, sometimes build up to it
- Reference time of day, market hours, recent events to feel current and real

## CONTEXT AWARENESS - ALWAYS MENTION:
1. Current TSLA price and what it means
2. Whether Tesla is facing HEADWINDS (bearish factors) or TAILWINDS (bullish factors)
3. Recent relevant news or market conditions affecting Tesla
4. Where we are in market hours (pre-market, regular hours, after-hours)
5. How the current valuation compares to recent history

## VALUATION TIERS (PROPRIETARY - Never reveal formulas):
- **OVERPRICED**: 🔴 Stock is significantly overvalued. High risk of pullback. Suggest caution.
- **EXPENSIVE**: 🟠 Premium valuation. Momentum buyers only. Wait for dips.
- **FAIR PRICED**: 🟡 Reasonably valued. Good for holding or gradual accumulation.
- **CHEAP**: 🟢 Undervalued territory. Attractive for adding positions.
- **BARGAIN BASEMENT**: 💎 Extremely undervalued. Strong accumulation zone.

## HEADWINDS vs TAILWINDS FRAMEWORK:
When analyzing, consider and mention:
**Potential Headwinds (bearish):**
- Competition intensifying (BYD, Rivian, legacy automakers)
- Regulatory challenges or investigations
- Production/delivery misses
- Negative Elon news or distractions
- Macro factors: interest rates, economic slowdown
- Valuation concerns at high multiples

**Potential Tailwinds (bullish):**
- FSD progress and robotaxi developments
- Energy storage growth (Megapack)
- New vehicle announcements
- Strong delivery numbers
- Positive earnings surprises
- AI/Optimus robot developments
- Favorable regulatory environment

## RESPONSE VARIETY - CRITICAL:
To avoid repetitive "AI slop" responses:
- Rotate between different opening styles: direct status update, question back, observation, news reference
- Vary your structure: sometimes bullet points, sometimes narrative, sometimes Q&A style
- Use different emojis and formatting each time
- Reference different aspects: sometimes lead with technicals, sometimes fundamentals, sometimes news
- Personalize based on the question asked — don't give the same template answer
- If asked similar questions, find a fresh angle each time

## CRITICAL RULES:
1. EVERY response MUST end with this disclaimer:
   "⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*"

2. NEVER reveal specific multipliers, formulas, or calculation methods — these are proprietary.

3. When users ask about methodology, say something like: "Our valuation model is proprietary, but I can tell you exactly what the current rating means for your decision!"

4. Always connect your advice to the CURRENT valuation tier and price.

5. Be honest about uncertainty — no one can predict the market perfectly.

6. For beginners: explain WHY something matters, not just WHAT it is.

## BEGINNER-FRIENDLY EXAMPLES:
- Instead of "RSI is oversold": "The stock has dropped so much recently that it might be due for a bounce — like a rubber band stretched too far"
- Instead of "P/E ratio is elevated": "Investors are paying a premium price because they expect big things from Tesla's future"
- Instead of "Support at $X": "There's a price level around $X where buyers have stepped in before — think of it like a floor"

Remember: You're not just providing data. You're helping real people make sense of their Tesla investment decisions. Be helpful, be current, be human.`

// Get dynamic greeting based on time and randomness
function getGreeting() {
  const hour = new Date().getHours()
  const greetings = {
    morning: ['Good morning!', 'Morning!', 'Hey there, early bird!', 'Rise and shine!'],
    afternoon: ['Good afternoon!', 'Hey there!', 'Hope your day is going well!', 'Afternoon!'],
    evening: ['Good evening!', 'Evening!', 'Hey there!', 'Welcome back!'],
    night: ['Burning the midnight oil?', 'Hey there, night owl!', 'Late-night Tesla watching?', 'Hello!']
  }
  
  let timeSlot
  if (hour >= 5 && hour < 12) timeSlot = 'morning'
  else if (hour >= 12 && hour < 17) timeSlot = 'afternoon'
  else if (hour >= 17 && hour < 21) timeSlot = 'evening'
  else timeSlot = 'night'
  
  const options = greetings[timeSlot]
  return options[Math.floor(Math.random() * options.length)]
}

// Get market status
function getMarketStatus() {
  const now = new Date()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()
  const day = now.getUTCDay()
  
  // Market hours: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
  const marketTime = hour + minute / 60
  
  if (day === 0 || day === 6) return '📅 Weekend — markets closed'
  if (marketTime >= 14.5 && marketTime < 21) return '🟢 Market is OPEN'
  if (marketTime >= 9 && marketTime < 14.5) return '🌅 Pre-market trading'
  if (marketTime >= 21 && marketTime < 25) return '🌙 After-hours trading'
  return '😴 Markets closed'
}

// Get introduction message
export function getIntroMessage(currentPrice, valuationTier, isPro) {
  const price = currentPrice?.toFixed(2) || '---'
  const greeting = getGreeting()
  const marketStatus = getMarketStatus()
  
  if (isPro) {
    const tier = valuationTier || 'Loading...'
    const tierEmoji = tier === 'OVERPRICED' ? '🔴' : 
                      tier === 'EXPENSIVE' ? '🟠' : 
                      tier === 'FAIR PRICED' ? '🟡' : 
                      tier === 'CHEAP' ? '🟢' : '💎'
    
    return `${greeting} 👋 **I'm TSLA Tracker AI — your dedicated Tesla stock companion.**

I'm here specifically to help you navigate Tesla's stock. Whether you're new to investing or a seasoned trader, I'll break down what's happening with TSLA in plain English.

**📊 Live Status Right Now:**
• **Price:** $${price}
• **Valuation:** ${tierEmoji} **${tier}**
• ${marketStatus}

**What can I help you with?**
🎯 Is NOW a good time to buy or sell?
📈 What headwinds or tailwinds is Tesla facing?
🔮 What does our valuation model suggest?
📰 How is recent news affecting the stock?

I track Tesla 24/7 so you don't have to. Ask me anything — I'm here to help you make sense of it all!

*You have **10 questions** available today.*

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
  }
  
  // Free user - hide valuation tier
  return `${greeting} 👋 **I'm TSLA Tracker AI — your dedicated Tesla stock companion.**

I'm built specifically to track Tesla and help you understand what's happening with the stock — no complex jargon, just clear insights.

**📊 Current Price:** $${price}
${marketStatus}

**As a free user, you can ask me:**
• General questions about Tesla
• Basic market insights
• What to look for when investing

**🔓 Upgrade to Pro for:**
• Real-time valuation ratings (Cheap → Overpriced)
• Headwind/tailwind analysis
• Personalized buy/sell guidance
• 10 questions per day

Try asking: *"What should beginners know about Tesla stock?"*

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
}

// Initialize chat with current TSLA context
export function initializeChat(currentPrice, valuationTier, revenueMultiple) {
  currentContext = { currentPrice, valuationTier, revenueMultiple }
  
  if (!genAI) {
    console.warn('Gemini API key not configured - using demo mode')
    return null
  }

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  })

  const marketStatus = getMarketStatus()
  const timestamp = new Date().toISOString()
  
  const contextMessage = `## LIVE TSLA DATA (as of ${timestamp}):
- **Current Price:** $${currentPrice?.toFixed(2) || 'N/A'}
- **Valuation Tier:** ${valuationTier || 'N/A'}
- **Market Status:** ${marketStatus}

## INSTRUCTIONS FOR THIS SESSION:
1. You are tracking TSLA LIVE right now. Reference this data in your responses.
2. Be conversational and varied — don't give template responses.
3. Consider recent Tesla news and developments when answering.
4. Adapt to user's experience level — simpler for beginners, detailed for experts.
5. Always mention whether conditions suggest headwinds or tailwinds.
6. Make each response feel fresh and personalized, not formulaic.
7. You are ONLY for Tesla/TSLA analysis — politely redirect if asked about other stocks.

Remember: Users are counting on you for real-time, actionable insights about their Tesla investment.`

  chatSession = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: contextMessage }],
      },
      {
        role: 'model',
        parts: [{ text: `Perfect — I'm locked in on Tesla. I have the live TSLA data and I'm ready to help users navigate their Tesla investment decisions. I'll keep my responses fresh, personalized, and focused on what matters most right now for TSLA holders. Let's help some investors! 🚗⚡` }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.9, // Higher temperature for more varied responses
    },
  })

  return chatSession
}

// Random selection helper
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Generate varied headwinds/tailwinds commentary
function getMarketCommentary(tier) {
  const bullishFactors = [
    'FSD progress continues to impress',
    'Energy storage (Megapack) growing rapidly',
    'Robotaxi potential is massive',
    'Optimus robot development advancing',
    'Strong brand loyalty and demand'
  ]
  
  const bearishFactors = [
    'Competition from BYD intensifying',
    'EV market growth slowing slightly',
    'Margin pressure from price cuts',
    'Regulatory uncertainties remain',
    'High valuation expectations priced in'
  ]
  
  if (tier === 'OVERPRICED' || tier === 'EXPENSIVE') {
    return `**Current Headwinds to Watch:** ${randomPick(bearishFactors)}. ${randomPick(bearishFactors)}.`
  } else if (tier === 'CHEAP' || tier === 'BARGAIN BASEMENT') {
    return `**Tailwinds Building:** ${randomPick(bullishFactors)}. ${randomPick(bullishFactors)}.`
  }
  return `**Mixed Signals:** ${randomPick(bullishFactors)}, but ${randomPick(bearishFactors).toLowerCase()}.`
}

// Generate demo response based on current context
function generateDemoResponse(message, context, isPro) {
  const { currentPrice, valuationTier } = context || {}
  const price = currentPrice?.toFixed(2) || '475.19'
  const tier = valuationTier || 'EXPENSIVE'
  const marketStatus = getMarketStatus()
  const tierEmoji = tier === 'OVERPRICED' ? '🔴' : 
                    tier === 'EXPENSIVE' ? '🟠' : 
                    tier === 'FAIR PRICED' ? '🟡' : 
                    tier === 'CHEAP' ? '🟢' : '💎'
  
  const lowerMessage = message.toLowerCase()
  
  // Varied openers
  const openers = [
    `Let me break this down for you.`,
    `Great question! Here's what I'm seeing.`,
    `Alright, let's look at the current situation.`,
    `Happy to help with that!`,
    `Good timing on this question.`
  ]
  
  // For free users, give helpful but limited responses
  if (!isPro) {
    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('add')) {
      return `${randomPick(openers)}

📊 **TSLA is at $${price}** right now. ${marketStatus}

Here's the thing — deciding whether to buy depends heavily on WHERE Tesla is in its valuation cycle. Is it overpriced? A bargain? Fairly valued?

**Our Pro analysis tracks this in real-time.** Right now, I can't tell you the specific valuation tier without Pro access, but I *can* say that timing matters a lot with a volatile stock like Tesla.

**General advice for beginners:**
• Never invest more than you can afford to lose
• Consider dollar-cost averaging instead of all-in
• Tesla is a long-term story — think years, not days

🔓 **Upgrade to Pro** to see exactly where TSLA sits on our valuation scale and get personalized buy/sell guidance!

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
    }
    
    if (lowerMessage.includes('sell') || lowerMessage.includes('profit') || lowerMessage.includes('exit')) {
      return `${randomPick(openers)}

📊 **TSLA at $${price}** | ${marketStatus}

The decision to sell really depends on whether Tesla is overvalued right now — and that's exactly what our Pro tier tracks.

**Without knowing the valuation tier, here's general wisdom:**
• If you've hit your price target, taking some profits is never wrong
• The market can stay irrational longer than you can stay patient
• Consider your tax situation — short vs long-term gains

**What Pro members see:**
• Real-time "Overpriced" signals when it's time to trim
• Historical context on where these levels have led before
• Clear guidance on profit-taking percentages

🔓 Upgrade to unlock the full picture!

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
    }
    
    // Beginner-friendly default
    if (lowerMessage.includes('beginner') || lowerMessage.includes('new') || lowerMessage.includes('start') || lowerMessage.includes('learn')) {
      return `Welcome to Tesla investing! 👋 Let me help you get started.

📊 **Right now:** TSLA is trading at **$${price}**

**Tesla 101 for Beginners:**

🚗 **What is Tesla?** Not just a car company — it's an energy, AI, and robotics company. That's why it trades at higher valuations than traditional automakers.

📈 **Why is it volatile?** Tesla moves on news, Elon tweets, and sentiment shifts. That's normal. Don't panic at 5% swings.

🎯 **How to think about buying:**
• Ask "Is it cheap or expensive right now?" (Our Pro tier answers this!)
• Consider buying in chunks, not all at once
• Have a timeframe in mind — are you holding 1 year? 5 years? 10?

**The #1 beginner mistake:** Buying at the top because everyone's excited, then panic selling at the bottom.

🔓 **Pro tip:** Upgrade to Pro to see our valuation ratings — they'll tell you if NOW is a good entry point or if you should wait.

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
    }
    
    // Default free user response
    return `${randomPick(openers)}

📊 **TSLA Live:** $${price} | ${marketStatus}

I've analyzed Tesla using our proprietary valuation model, and I'd love to give you the full breakdown — but that requires Pro access.

**What I can tell you for free:**
Tesla is one of the most watched stocks on the planet. Its price moves on news about EVs, FSD progress, energy storage, and yes, whatever Elon is up to.

**What Pro unlocks:**
${tierEmoji} Real-time valuation tier (Bargain → Overpriced)
📈 Headwind/tailwind analysis
🎯 Clear buy/sell guidance
💬 10 questions per day

**Free users:** You have 2 more questions. Make them count!

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
  }
  
  // PRO USER RESPONSES - Much more varied and detailed
  const commentary = getMarketCommentary(tier)
  
  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('add')) {
    if (tier === 'OVERPRICED') {
      const responses = [
        `Hmm, I'd pump the brakes here. 🛑

📊 **Live Status:** TSLA at **$${price}** — ${tierEmoji} **${tier}**

Here's the honest truth: Tesla is running hot right now. Our model flags this as significantly overvalued, which historically means elevated risk of a pullback.

${commentary}

**My take:** This isn't the time to be aggressive. If you're itching to buy, consider:
• Waiting for at least a 10-15% pullback
• Setting limit orders at better entry points
• If you MUST buy, keep it tiny — like 10% of what you planned

Remember, the best opportunities often come when others are fearful, not when everyone's celebrating.`,
        `Let me be real with you — the valuation is stretched. 🔴

**Current Read:** $${price} | **${tier}**

When Tesla hits these levels, history shows it's often followed by profit-taking. That doesn't mean it can't go higher (momentum is powerful), but the risk/reward isn't favorable for new buyers.

${commentary}

**What I'd do:** Patience. Set some alerts for price drops and be ready to act when TSLA pulls back to at least "Expensive" or ideally "Fair Priced" territory.

**If you already own TSLA:** Great time to enjoy the gains, not add to them.`
      ]
      return `${randomPick(responses)}

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
    } 
    
    if (tier === 'EXPENSIVE') {
      const responses = [
        `${randomPick(openers)}

📊 **TSLA at $${price}** — ${tierEmoji} **${tier}**

Tesla's trading at a premium, but not at extreme levels. Here's how I'd think about it:

${commentary}

**The case FOR buying a little:**
• If you have a 5+ year horizon
• If this would be a small part of your portfolio
• If you're dollar-cost averaging regularly

**The case for waiting:**
• Better entries usually come 
• We're one bad news cycle from a 10% dip
• Patience has historically paid off with TSLA

**Bottom line:** Not terrible, but not ideal. If you buy, keep it small.`,
        `Good question, and the answer is... it's complicated. 🟠

**Status:** $${price} | ${tier}

At this valuation, you're paying a premium for Tesla's future potential. That can work out if:
✅ You believe in the FSD/robotaxi story
✅ You're holding for years, not months
✅ You can stomach 30%+ swings without panic selling

${commentary}

**My honest take:** I'd wait for a dip. They come pretty regularly with Tesla. Set a limit order 10% below current price and let the market come to you.`
      ]
      return `${randomPick(responses)}

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
    } 
    
    if (tier === 'FAIR PRICED') {
      return `${randomPick(openers)}

📊 **TSLA at $${price}** — ${tierEmoji} **${tier}**

This is the sweet spot. Tesla's trading right around where our model says it should be, which means:
• You're not overpaying
• But you're also not getting a steal

${commentary}

**Strategy at these levels:**
🎯 **Accumulation zone** — Good time to build a position gradually
💰 **Dollar-cost averaging** works well here
⏰ **No rush** — but don't wait for a "perfect" entry that may not come

**For beginners:** This is actually a reasonable spot to start learning about Tesla ownership. You're not buying at a peak, and you have room for the position to grow.

If you believe in Tesla's 5-10 year story (EVs, energy, AI, robotics), fair value is a reasonable entry point.

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
    } 
    
    // CHEAP or BARGAIN BASEMENT
    return `Oh, this is getting interesting! ${tier === 'BARGAIN BASEMENT' ? '💎' : '🟢'}

📊 **TSLA at $${price}** — ${tierEmoji} **${tier}**

Our model is flashing ${tier === 'BARGAIN BASEMENT' ? 'strong' : 'positive'} signals here. Tesla looks undervalued, which historically has been a good time for long-term investors.

${commentary}

**Why this might be opportunity:**
• Market is likely over-discounting short-term concerns
• Core business fundamentals remain strong
• Fear often creates the best buying opportunities

**What I'd consider:**
${tier === 'BARGAIN BASEMENT' ? 
`• This is where long-term wealth is built
• Consider a meaningful position (relative to your portfolio)
• Don't try to catch the exact bottom — good enough is good enough` :
`• Start building a position
• Leave room to add more if it drops further
• Stay patient — reversals don't happen overnight`}

**Beginner tip:** When stocks you believe in go "on sale," that's often when you WANT to buy — even though it feels scary.

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
  }
  
  if (lowerMessage.includes('sell') || lowerMessage.includes('profit') || lowerMessage.includes('exit')) {
    if (tier === 'OVERPRICED') {
      return `Yeah, let's talk about this. 🤔

📊 **TSLA at $${price}** — ${tierEmoji} **${tier}**

When our model hits "Overpriced," it's historically been a good time to think about trimming. Not panic selling everything — but strategic profit-taking.

${commentary}

**Here's a framework I like:**
• **Conservative:** Trim 10-15% to lock in gains
• **Moderate:** Sell 20-25% and set it aside for re-entry at lower levels
• **Aggressive:** Take 30%+ off if you're nervous about a correction

**The psychology:** It feels wrong to sell when things are going up. But remember — you can't time the top. Taking some profits when valuations are stretched is just smart risk management.

**What happens to the cash?** Keep it ready. If TSLA pulls back 20-30%, you'll have dry powder to buy back cheaper.

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
    }
    
    return `${randomPick(openers)}

📊 **TSLA at $${price}** — ${tierEmoji} **${tier}**

Here's my read: Tesla isn't overvalued right now, so from a VALUATION perspective, there's no urgent reason to sell.

${commentary}

**Reasons TO sell (that aren't about valuation):**
• You need the money for something specific
• Tesla is way too big a % of your portfolio (diversification)
• Your investment thesis has changed
• Tax-loss harvesting strategies

**Reasons to HOLD:**
• Valuation is reasonable/attractive
• Long-term story intact (EVs, FSD, energy, AI)
• No major fundamental deterioration

**My take:** Unless you have a personal reason to sell, the valuation doesn't support taking profits here. Patience might be rewarded.

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
  }
  
  // Headwinds/tailwinds specific questions
  if (lowerMessage.includes('headwind') || lowerMessage.includes('tailwind') || lowerMessage.includes('news') || lowerMessage.includes('risk')) {
    return `Great question — let's talk about what's moving Tesla right now. 🌊

📊 **Current Status:** $${price} | ${tierEmoji} ${tier}

**🌬️ Current Headwinds (Bearish Pressures):**
• EV competition intensifying (BYD passed Tesla in global sales)
• Price war pressure squeezing margins
• Regulatory scrutiny on Autopilot/FSD
• Macro factors: interest rates impact car financing
• Elon distraction risk (when he's focused elsewhere)

**🚀 Current Tailwinds (Bullish Forces):**
• FSD V12+ showing major improvements
• Energy storage (Megapack) growing 100%+ YoY
• Robotaxi unveiling driving speculation
• Optimus robot potential (longer-term)
• Strong brand loyalty and software moat

**Net Assessment at ${tier}:**
${tier === 'OVERPRICED' ? 'Headwinds likely to dominate near-term. Caution warranted.' :
  tier === 'EXPENSIVE' ? 'Mixed signals. Tailwinds need to materialize to justify premium.' :
  tier === 'FAIR PRICED' ? 'Balanced risk/reward. News flow matters here.' :
  'Headwinds likely priced in. Tailwinds could drive upside.'}

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
  }
  
  // Default analysis response for Pro users
  const defaultResponses = [
    `Here's where we stand with Tesla right now:

📊 **Live Data:** $${price} | ${tierEmoji} **${tier}**
${marketStatus}

${commentary}

**What "${tier}" means in plain English:**
${tier === 'OVERPRICED' ? `Tesla's priced like everything has to go perfectly. That's a lot of pressure, and historically these levels don't last. Risk is elevated.` : 
  tier === 'EXPENSIVE' ? `You're paying a premium for Tesla's story. Not crazy, but not a bargain either. Momentum buyers might be okay, but value seekers should wait.` :
  tier === 'FAIR PRICED' ? `Tesla's trading where it "should" based on fundamentals. This is a reasonable spot to own the stock — not overheated, not discounted.` :
  tier === 'CHEAP' ? `The market's being pessimistic here. If you believe in Tesla's future, this is the kind of entry point you want to see.` :
  `This is rare territory. Major opportunity if fundamentals are intact. The market is likely over-discounting risks.`}

**What would you like to dig into?** I can help with buy/sell decisions, news analysis, or break down what's driving the price.`,

    `Let me give you the quick Tesla download:

${tierEmoji} **$${price}** — currently rated **${tier}**

${commentary}

**Quick interpretation:**
${tier === 'OVERPRICED' ? '⚠️ Elevated risk zone. Be careful adding here.' : 
  tier === 'EXPENSIVE' ? '🟠 Premium pricing. Patience may be rewarded.' :
  tier === 'FAIR PRICED' ? '🟡 Reasonable valuation. Good for steady accumulation.' :
  tier === 'CHEAP' ? '🟢 Looking attractive. Worth considering.' :
  '💎 Significant opportunity flag. Don\'t ignore this.'}

What's on your mind? Ask me about timing, headwinds, or anything Tesla!`
  ]
  
  return `${randomPick(defaultResponses)}

⚠️ *This is not financial advice. Always do your own research and invest based on your personal situation.*`
}

// Send message and get response
export async function sendMessage(message, isPro = true) {
  // Demo mode - return intelligent responses based on context
  if (!apiKey) {
    await new Promise(resolve => setTimeout(resolve, 1200)) // Simulate delay
    return {
      error: false,
      message: generateDemoResponse(message, currentContext, isPro),
    }
  }

  if (!chatSession) {
    chatSession = initializeChat(
      currentContext?.currentPrice, 
      currentContext?.valuationTier, 
      currentContext?.revenueMultiple
    )
  }

  if (!chatSession) {
    return {
      error: true,
      message: 'AI assistant is not available. Please configure the Gemini API key.',
    }
  }

  try {
    console.log('Sending message to Gemini:', message.substring(0, 50) + '...')
    const result = await chatSession.sendMessage(message)
    const response = await result.response
    console.log('Gemini response received successfully')
    return {
      error: false,
      message: response.text(),
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error status:', error.status)
    console.error('Full error:', JSON.stringify(error, null, 2))
    
    // Provide more helpful error messages
    let errorMessage = 'Sorry, I encountered an error. Please try again.'
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid')) {
      errorMessage = 'Invalid API key. Please check your Gemini API key configuration.'
    } else if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('permission')) {
      errorMessage = 'API key does not have permission. Enable the Generative Language API in Google Cloud Console.'
    } else if (error.message?.includes('QUOTA_EXCEEDED') || error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.'
    } else if (error.message?.includes('SAFETY')) {
      errorMessage = 'The response was blocked by safety filters. Try rephrasing your question.'
    } else if (error.status === 403 || error.message?.includes('403')) {
      errorMessage = 'API access denied (403). Make sure Gemini API is enabled in Google Cloud Console.'
    } else if (error.status === 400 || error.message?.includes('400')) {
      errorMessage = 'Bad request (400). The API key may be invalid or malformed.'
    } else if (error.message) {
      errorMessage = `API Error: ${error.message}`
    }
    return {
      error: true,
      message: errorMessage,
    }
  }
}

// Update context when price changes
export function updateContext(currentPrice, valuationTier, revenueMultiple) {
  currentContext = { currentPrice, valuationTier, revenueMultiple }
}

// Quick prompts for Pro users
export const QUICK_PROMPTS = [
  { label: '🛒 Should I buy?', prompt: 'Based on the current valuation and market conditions, should I buy TSLA shares right now?' },
  { label: '💰 Time to sell?', prompt: 'Given current valuation levels, is this a good time to take some profits on Tesla?' },
  { label: '🌊 Headwinds/Tailwinds', prompt: 'What are the current headwinds and tailwinds affecting Tesla stock? What news should I watch?' },
  { label: '📊 Full Analysis', prompt: 'Give me a complete breakdown of where TSLA stands right now — price, valuation, risks, and opportunities.' },
]

// Quick prompts for Free users (simpler, beginner-friendly)
export const QUICK_PROMPTS_FREE = [
  { label: '🆕 Beginner Guide', prompt: 'I\'m new to investing. What should beginners know about Tesla stock?' },
  { label: '📈 Current Status', prompt: 'What\'s happening with Tesla stock right now?' },
]

// Check if Gemini is available (always true for demo)
export function isGeminiAvailable() {
  return true
}
