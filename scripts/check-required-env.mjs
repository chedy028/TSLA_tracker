import fs from 'fs'
import path from 'path'

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_PRICE_ID',
]

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

  // Build/runtime env should take precedence.
  return {
    ...localEnv,
    ...process.env,
  }
}

function isMissing(value) {
  return value === undefined || value === null || String(value).trim() === ''
}

const env = loadEnv()
const missing = REQUIRED_VARS.filter((name) => isMissing(env[name]))

if (missing.length > 0) {
  console.error('Missing required environment variables for release checks:')
  for (const name of missing) {
    console.error(`- ${name}`)
  }
  process.exit(1)
}

console.log('Environment check passed for required release variables.')
