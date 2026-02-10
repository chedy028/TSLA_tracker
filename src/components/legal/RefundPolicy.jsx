import { useNavigate } from 'react-router-dom'

export default function RefundPolicy() {
  const navigate = useNavigate()

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
          <h1>Refund Policy</h1>
          <p className="policy-updated">Last updated: February 2026</p>

          <section className="policy-section">
            <h2>7-Day Money-Back Guarantee</h2>
            <p>
              We want you to feel confident trying TSLA Cheat Code. If you're not satisfied
              with your subscription for any reason, you can request a full refund within
              <strong> 7 days</strong> of your initial purchase — no questions asked.
            </p>
          </section>

          <section className="policy-section">
            <h2>How to Request a Refund</h2>
            <p>To request a refund, simply email us at:</p>
            <div className="policy-email-box">
              <a href="mailto:support@tslacheatcode.com?subject=Refund Request">
                support@tslacheatcode.com
              </a>
            </div>
            <p>Include your account email and we'll process your refund promptly.</p>
          </section>

          <section className="policy-section">
            <h2>After 7 Days</h2>
            <p>
              After the 7-day guarantee period, you can cancel your subscription at any time
              from your <strong>Account Settings</strong>. When you cancel:
            </p>
            <ul>
              <li>You won't be charged again</li>
              <li>You keep access until the end of your current billing period</li>
              <li>No partial refunds are issued for the remaining billing period</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Processing Time</h2>
            <p>
              Approved refunds are processed within <strong>5–10 business days</strong>.
              The refund will appear on the same payment method used for the original purchase.
            </p>
          </section>

          <section className="policy-section">
            <h2>Questions?</h2>
            <p>
              If you have any questions about our refund policy, reach out to us
              at <a href="mailto:support@tslacheatcode.com">support@tslacheatcode.com</a> or
              visit our <a href="/contact">Contact page</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
