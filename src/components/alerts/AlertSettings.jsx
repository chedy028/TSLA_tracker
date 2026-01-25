import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getAlertSettings, upsertAlertSettings } from '../../lib/supabase'

export function AlertSettings() {
  const { user, isPro } = useAuth()
  const [settings, setSettings] = useState({
    price_alert_enabled: false,
    price_threshold_high: '',
    price_threshold_low: '',
    valuation_alert_enabled: false,
    daily_digest_enabled: false,
    large_movement_alert_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await getAlertSettings(user.id)
      if (data) {
        setSettings({
          price_alert_enabled: data.price_alert_enabled || false,
          price_threshold_high: data.price_threshold_high || '',
          price_threshold_low: data.price_threshold_low || '',
          valuation_alert_enabled: data.valuation_alert_enabled || false,
          daily_digest_enabled: data.daily_digest_enabled || false,
          large_movement_alert_enabled: data.large_movement_alert_enabled || false,
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setMessage(null)
  }

  const handleSave = async () => {
    if (!isPro) {
      setMessage({ type: 'error', text: 'Upgrade to Pro to enable alerts' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      await upsertAlertSettings(user.id, {
        price_alert_enabled: settings.price_alert_enabled,
        price_threshold_high: settings.price_threshold_high ? parseFloat(settings.price_threshold_high) : null,
        price_threshold_low: settings.price_threshold_low ? parseFloat(settings.price_threshold_low) : null,
        valuation_alert_enabled: settings.valuation_alert_enabled,
        daily_digest_enabled: settings.daily_digest_enabled,
        large_movement_alert_enabled: settings.large_movement_alert_enabled,
      })
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (err) {
      console.error('Error saving settings:', err)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="alert-settings loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="alert-settings">
      <div className="alert-settings-header">
        <h3>Email Alert Settings</h3>
        <p>Configure when you want to receive email notifications</p>
      </div>

      {!isPro && (
        <div className="alert-upgrade-notice">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          <span>Upgrade to Pro to enable email alerts</span>
        </div>
      )}

      <div className="alert-option">
        <div className="alert-option-header">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.price_alert_enabled}
              onChange={(e) => handleChange('price_alert_enabled', e.target.checked)}
              disabled={!isPro}
            />
            <span className="toggle-slider"></span>
          </label>
          <div className="alert-option-info">
            <h4>Price Alerts</h4>
            <p>Get notified when TSLA crosses your price thresholds</p>
          </div>
        </div>
        
        {settings.price_alert_enabled && (
          <div className="alert-option-fields">
            <div className="field-group">
              <label>Alert when price goes above</label>
              <div className="price-input">
                <span>$</span>
                <input
                  type="number"
                  value={settings.price_threshold_high}
                  onChange={(e) => handleChange('price_threshold_high', e.target.value)}
                  placeholder="e.g. 500"
                  disabled={!isPro}
                />
              </div>
            </div>
            <div className="field-group">
              <label>Alert when price goes below</label>
              <div className="price-input">
                <span>$</span>
                <input
                  type="number"
                  value={settings.price_threshold_low}
                  onChange={(e) => handleChange('price_threshold_low', e.target.value)}
                  placeholder="e.g. 400"
                  disabled={!isPro}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="alert-option">
        <div className="alert-option-header">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.valuation_alert_enabled}
              onChange={(e) => handleChange('valuation_alert_enabled', e.target.checked)}
              disabled={!isPro}
            />
            <span className="toggle-slider"></span>
          </label>
          <div className="alert-option-info">
            <h4>Valuation Alerts</h4>
            <p>Get notified when TSLA's valuation tier changes (e.g., Fair → Expensive)</p>
          </div>
        </div>
      </div>

      <div className="alert-option">
        <div className="alert-option-header">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.daily_digest_enabled}
              onChange={(e) => handleChange('daily_digest_enabled', e.target.checked)}
              disabled={!isPro}
            />
            <span className="toggle-slider"></span>
          </label>
          <div className="alert-option-info">
            <h4>Daily Digest</h4>
            <p>Receive a daily summary email at 8 AM with price and valuation info</p>
          </div>
        </div>
      </div>

      <div className="alert-option">
        <div className="alert-option-header">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.large_movement_alert_enabled}
              onChange={(e) => handleChange('large_movement_alert_enabled', e.target.checked)}
              disabled={!isPro}
            />
            <span className="toggle-slider"></span>
          </label>
          <div className="alert-option-info">
            <h4>Large Movement Alerts</h4>
            <p>Get notified when TSLA moves more than 10% in a single day</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <button 
        className="alert-save-btn"
        onClick={handleSave}
        disabled={saving || !isPro}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}





