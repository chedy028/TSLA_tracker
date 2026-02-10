import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ContactPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const subject = encodeURIComponent(`Support Request from ${name}`)
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
    window.location.href = `mailto:support@tslacheatcode.com?subject=${subject}&body=${body}`
  }

  return (
    <div className="app">
      <div className="background-grid" />

      <header className="header">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="logo-emoji">🎮</span>
          <span className="logo-text">TSLA CHEAT CODE</span>
        </div>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </header>

      <main className="main policy-main">
        <div className="policy-content">
          <h1>Contact Us</h1>
          <p className="policy-updated">We typically respond within 24 hours</p>

          <section className="policy-section">
            <h2>Email Support</h2>
            <p>The fastest way to reach us:</p>
            <div className="policy-email-box">
              <a href="mailto:support@tslacheatcode.com">support@tslacheatcode.com</a>
            </div>
          </section>

          <section className="policy-section">
            <h2>Send a Message</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  rows={5}
                  required
                />
              </div>
              <button type="submit" className="contact-submit-btn">Send Message</button>
            </form>
          </section>

          <section className="policy-section">
            <h2>Common Questions</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h3>How do I cancel my subscription?</h3>
                <p>Go to Settings → Subscription Status → Manage Subscription. You can cancel anytime.</p>
              </div>
              <div className="faq-item">
                <h3>Can I get a refund?</h3>
                <p>Yes — we offer a 7-day money-back guarantee. See our <a href="/refund">Refund Policy</a> for details.</p>
              </div>
              <div className="faq-item">
                <h3>How do I change my email alerts?</h3>
                <p>Go to Settings → Alert Settings to configure price alerts, valuation alerts, and daily digest.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
