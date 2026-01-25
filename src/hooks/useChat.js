import { useState, useCallback, useEffect } from 'react'
import { sendMessage, initializeChat, updateContext, getIntroMessage, isGeminiAvailable, QUICK_PROMPTS, QUICK_PROMPTS_FREE } from '../lib/gemini'
import { useAuth } from './useAuth'

// Secret sauce keywords that free users shouldn't ask about
const SECRET_SAUCE_KEYWORDS = [
  'formula', 'calculate', 'calculation', 'methodology', 'method',
  'multiplier', 'multiple', 'ratio', 'p/s', 'ps ratio', 'price to sales',
  'revenue multiple', 'how do you', 'how does it work', 'algorithm',
  'metric', 'criteria', 'threshold', 'range', 'what is the formula',
  'ttm', 'trailing', '12 month', 'twelve month'
]

function containsSecretSauceQuestion(message) {
  const lower = message.toLowerCase()
  return SECRET_SAUCE_KEYWORDS.some(keyword => lower.includes(keyword))
}

export function useChat(currentPrice, valuationTier, revenueMultiple) {
  const { isPro } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)

  const maxQuestions = isPro ? 10 : 3
  const remainingQuestions = maxQuestions - questionCount

  // Initialize chat with current TSLA context
  useEffect(() => {
    if (currentPrice && !initialized) {
      initializeChat(currentPrice, valuationTier, revenueMultiple)
      setInitialized(true)
      
      // Add introduction message - hide valuation tier for free users
      const introMsg = getIntroMessage(currentPrice, isPro ? valuationTier : null, isPro)
      
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: introMsg,
        timestamp: new Date(),
      }])
    }
  }, [currentPrice, valuationTier, revenueMultiple, initialized, isPro])

  // Update context when price changes
  useEffect(() => {
    if (currentPrice && initialized) {
      updateContext(currentPrice, valuationTier, revenueMultiple)
    }
  }, [currentPrice, valuationTier, revenueMultiple, initialized])

  const send = useCallback(async (userMessage) => {
    if (!userMessage.trim()) return

    // Check if user has reached question limit
    if (questionCount >= maxQuestions) {
      setError(isPro 
        ? 'You have reached your daily limit of 10 questions. Please try again tomorrow.'
        : 'You have reached your limit of 3 questions. Upgrade to Pro for 10 questions per day!'
      )
      return
    }

    // Block secret sauce questions for free users
    if (!isPro && containsSecretSauceQuestion(userMessage)) {
      const blockedMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, blockedMsg])
      
      const responseMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `🔒 **Pro Feature Required**

Questions about our valuation methodology are available to Pro subscribers only.

As a free user, you can ask:
• "Should I buy TSLA now?"
• "Is it time to sell?"
• "What's the current outlook?"

Upgrade to Pro to unlock detailed methodology insights and 10 questions per day!

⚠️ DISCLAIMER: This is not financial advice. Always do your own research.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, responseMsg])
      setQuestionCount(prev => prev + 1)
      return
    }

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setError(null)
    setQuestionCount(prev => prev + 1)

    try {
      const response = await sendMessage(userMessage, isPro)
      
      if (response.error) {
        setError(response.message)
      } else {
        const assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMsg])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setError('Failed to get response. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [questionCount, maxQuestions, isPro])

  const clearChat = useCallback(() => {
    setMessages([])
    setInitialized(false)
    setError(null)
    // Don't reset question count on clear
  }, [])

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    messages,
    loading,
    error,
    isOpen,
    send,
    clearChat,
    toggleChat,
    quickPrompts: isPro ? QUICK_PROMPTS : QUICK_PROMPTS_FREE,
    isAvailable: isGeminiAvailable(),
    questionCount,
    maxQuestions,
    remainingQuestions,
    isPro,
  }
}
