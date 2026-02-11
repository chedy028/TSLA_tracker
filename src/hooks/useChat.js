import { useState, useCallback, useEffect } from 'react'
import {
  sendMessage,
  initializeChat,
  updateContext,
  getIntroMessage,
  isGeminiAvailable,
  getQuickPrompts,
  getQuickPromptsFree,
} from '../lib/gemini'
import { useAuth } from './useAuth'
import { useLanguage } from '../i18n/LanguageContext'

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
  const { lang, t } = useLanguage()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)

  const maxQuestions = isPro ? 10 : 3
  const remainingQuestions = maxQuestions - questionCount

  useEffect(() => {
    setMessages([])
    setInitialized(false)
    setError(null)
  }, [lang])

  // Initialize chat with current TSLA context
  useEffect(() => {
    if (currentPrice && !initialized) {
      initializeChat(currentPrice, valuationTier, revenueMultiple, lang)
      setInitialized(true)
      
      // Add introduction message - hide valuation tier for free users
      const introMsg = getIntroMessage(currentPrice, isPro ? valuationTier : null, isPro, lang)
      
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: introMsg,
        timestamp: new Date(),
      }])
    }
  }, [currentPrice, valuationTier, revenueMultiple, initialized, isPro, lang])

  // Update context when price changes
  useEffect(() => {
    if (currentPrice && initialized) {
      updateContext(currentPrice, valuationTier, revenueMultiple, lang)
    }
  }, [currentPrice, valuationTier, revenueMultiple, initialized, lang])

  const send = useCallback(async (userMessage) => {
    if (!userMessage.trim()) return

    // Check if user has reached question limit
    if (questionCount >= maxQuestions) {
      setError(isPro ? t('chat.limitErrorPro') : t('chat.limitErrorFree'))
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
        content: [
          t('chat.blockedTitle'),
          '',
          t('chat.blockedText'),
          '',
          t('chat.blockedAskTitle'),
          t('chat.blockedAskOne'),
          t('chat.blockedAskTwo'),
          t('chat.blockedAskThree'),
          '',
          t('chat.blockedUpgrade'),
          '',
          t('chat.blockedDisclaimer'),
        ].join('\n'),
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
      const response = await sendMessage(userMessage, isPro, lang)
      
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
      setError(t('chat.responseError'))
    } finally {
      setLoading(false)
    }
  }, [questionCount, maxQuestions, isPro, lang, t])

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
    quickPrompts: isPro ? getQuickPrompts(lang) : getQuickPromptsFree(lang),
    isAvailable: isGeminiAvailable(),
    questionCount,
    maxQuestions,
    remainingQuestions,
    isPro,
  }
}
