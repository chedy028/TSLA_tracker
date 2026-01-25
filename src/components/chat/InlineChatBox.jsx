import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../hooks/useChat'

export function InlineChatBox({ currentPrice, valuationTier, revenueMultiple }) {
  const {
    messages,
    loading,
    error,
    send,
    quickPrompts,
    isAvailable,
    remainingQuestions,
    maxQuestions,
    isPro,
  } = useChat(currentPrice, valuationTier, revenueMultiple)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !loading && remainingQuestions > 0) {
      send(input.trim())
      setInput('')
    }
  }

  if (!isAvailable) {
    return null
  }

  const isLimitReached = remainingQuestions <= 0

  return (
    <div className="inline-chat-box">
      <div className="inline-chat-header">
        <div className="chat-bot-avatar">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div className="chat-bot-info">
          <h3>TSLA Analysis Assistant</h3>
          <span className="chat-bot-status">
            {isPro ? '✨ Pro Analysis' : '🔓 Free Account'}
          </span>
        </div>
        <div className="chat-question-counter">
          <span className={`counter ${remainingQuestions <= 1 ? 'low' : ''}`}>
            {remainingQuestions}/{maxQuestions}
          </span>
          <span className="counter-label">questions left</span>
        </div>
      </div>

      <div className="inline-chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`inline-message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-bot-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
            )}
            <div className="message-bubble">
              <div className="message-text" dangerouslySetInnerHTML={{ 
                __html: formatMessage(msg.content) 
              }} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="inline-message assistant">
            <div className="message-bot-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="chat-error-inline">{error}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && !isLimitReached && (
        <div className="inline-quick-prompts">
          {quickPrompts.map((item, index) => (
            <button 
              key={index}
              onClick={() => send(item.prompt)}
              disabled={loading || isLimitReached}
              className="quick-prompt-btn"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {isLimitReached ? (
        <div className="chat-limit-reached">
          <span className="limit-icon">🔒</span>
          <span className="limit-text">
            {isPro 
              ? 'Daily limit reached. Try again tomorrow!'
              : 'Free limit reached. Upgrade to Pro for 10 questions/day!'
            }
          </span>
        </div>
      ) : (
        <form className="inline-chat-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isPro ? "Ask about TSLA valuation..." : "Ask a question..."}
            disabled={loading || isLimitReached}
          />
          <button type="submit" disabled={!input.trim() || loading || isLimitReached}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      )}
    </div>
  )
}

// Format message with markdown-like syntax
function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/•/g, '<span class="bullet">•</span>')
    .replace(/⚠️/g, '<span class="warning-icon">⚠️</span>')
    .replace(/📊/g, '<span class="chart-icon">📊</span>')
    .replace(/📈/g, '<span class="chart-icon">📈</span>')
    .replace(/🔒/g, '<span class="lock-icon">🔒</span>')
}
