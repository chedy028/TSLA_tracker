import fs from 'fs'
import path from 'path'

const TIMEOUT_MS = 10000

function parseEnvFile(filePath) {
  const parsed = {}
  if (!fs.existsSync(filePath)) return parsed

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const equalIndex = line.indexOf('=')
    if (equalIndex < 1) continue

    const key = line.slice(0, equalIndex).trim()
    const value = line.slice(equalIndex + 1).trim()
    if (!key) continue

    parsed[key] = value.replace(/^['"]|['"]$/g, '')
  }

  return parsed
}

function loadEnv() {
  const cwd = process.cwd()
  const localEnv = {
    ...parseEnvFile(path.join(cwd, '.env')),
    ...parseEnvFile(path.join(cwd, '.env.local')),
  }

  return {
    ...localEnv,
    ...process.env,
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const env = loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

assert(supabaseUrl, 'Missing VITE_SUPABASE_URL for edge contract check')
assert(anonKey, 'Missing VITE_SUPABASE_ANON_KEY for edge contract check')

const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-checkout`
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      priceId: 'price_contract_smoke',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    }),
    signal: controller.signal,
  })

  const bodyText = await response.text()
  let payload = null

  try {
    payload = JSON.parse(bodyText)
  } catch {
    // Keep text-only payload handling below.
  }

  assert(response.status === 401, `Expected 401 from create-checkout without auth header, got ${response.status}`)

  const errorMessage = payload?.error || payload?.message || bodyText || ''
  assert(errorMessage.trim().length > 0, 'Expected error payload from unauthorized create-checkout call')

  console.log('Edge contract check passed (401 unauthorized response is enforced).')
} finally {
  clearTimeout(timeoutId)
}
