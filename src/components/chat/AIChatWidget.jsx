import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function AIChatWidget({ currentPrice, valuationTier, revenueMultiple }) {
  const { isPro } = useAuth()
  const {
    messages,
    loading,
    error,
    isOpen,
    send,
    toggleChat,
    quickPrompts,
    isAvailable,
  } = useChat(currentPrice, valuationTier, revenueMultiple)

  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isAvailable) {
    return null
  }

  return (
    <div className={`chat-widget ${isOpen ? 'open' : ''}`}>
      {/* Chat Toggle Button */}
      <button 
        className="chat-toggle-btn"
        onClick={toggleChat}
        aria-label={isOpen ? 'Close chat' : 'Open AI assistant'}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            <circle cx="12" cy="10" r="1.5"/>
            <circle cx="8" cy="10" r="1.5"/>
            <circle cx="16" cy="10" r="1.5"/>
          </svg>
        )}
        {!isOpen && <span className="chat-badge">AI</span>}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <div>
                <h4>TSLA Tracker AI</h4>
                <span className="chat-status">🟢 Live • Tesla-focused</span>
              </div>
            </div>
            <button className="chat-close-btn" onClick={toggleChat}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {!isPro ? (
            <div className="chat-upgrade-prompt">
              <div className="upgrade-icon">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <h4>AI Assistant - Pro Feature</h4>
              <p>Upgrade to Pro to chat with our AI assistant and get personalized insights about TSLA valuation.</p>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {loading && (
                  <div className="chat-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
                {error && (
                  <div className="chat-error">{error}</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messages.length <= 1 && (
                <div className="chat-quick-prompts">
                  <p>Quick questions:</p>
                  <div className="quick-prompt-btns">
                    {quickPrompts.map((item, index) => (
                      <button 
                        key={index}
                        onClick={() => send(item.prompt)}
                        disabled={loading}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ChatInput onSend={send} disabled={loading} />
            </>
          )}
        </div>
      )}
    </div>
  )
}



