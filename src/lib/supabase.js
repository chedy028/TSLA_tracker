import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Auth features will be disabled.')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Auth helper functions
export async function signInWithProvider(provider) {
  if (!supabase) {
    throw new Error('Supabase not configured. Please check your environment variables.')
  }
  
  // Build the redirect URL - ensure it's the production URL when deployed
  const origin = window.location.origin
  const redirectTo = `${origin}/auth/callback`
  
  console.log(`Initiating ${provider} OAuth`)
  console.log('Origin:', origin)
  console.log('Redirect URL:', redirectTo)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  })
  
  if (error) {
    console.error(`OAuth error for ${provider}:`, error)
    // Provide more helpful error messages
    if (error.message.includes('not enabled')) {
      throw new Error(`${provider} sign-in is not enabled. Please contact support.`)
    }
    if (error.message.includes('certificate') || error.message.includes('ERR_CERT')) {
      throw new Error('Connection security error. Please check your system date/time settings.')
    }
    throw error
  }
  
  return data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Profile functions
export async function getProfile(userId) {
  if (!supabase) return null
  if (!userId) return null
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      // PGRST116 = no rows returned (new user without profile)
      if (error.code === 'PGRST116') {
        console.log('No profile found for user (new user)')
        return null
      }
      console.error('Error fetching profile:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('Profile fetch exception:', err)
    return null
  }
}

export async function updateProfile(userId, updates) {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Alert settings functions
export async function getAlertSettings(userId) {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching alert settings:', error)
    return null
  }
  return data
}

export async function upsertAlertSettings(userId, settings) {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('alert_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}



