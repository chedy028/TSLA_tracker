import { createContext, useContext, useMemo, useState } from 'react'
import { translations } from './translations'

const LanguageContext = createContext()
const STORAGE_KEY = 'lang'

const LANGUAGE_OPTIONS = [
  { code: 'en', short: 'EN', nativeName: 'English' },
  { code: 'es', short: 'ES', nativeName: 'Español' },
  { code: 'ko', short: 'KO', nativeName: '한국어' },
  { code: 'ja', short: 'JA', nativeName: '日本語' },
]

function normalizeLang(lang) {
  return LANGUAGE_OPTIONS.some((item) => item.code === lang) ? lang : 'en'
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return normalizeLang(localStorage.getItem(STORAGE_KEY) || 'en')
    } catch {
      return 'en'
    }
  })

  const setLanguage = (nextLang) => {
    const next = normalizeLang(nextLang)
    setLang(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  const cycleLang = () => {
    const index = LANGUAGE_OPTIONS.findIndex((item) => item.code === lang)
    const next = LANGUAGE_OPTIONS[(index + 1) % LANGUAGE_OPTIONS.length]
    setLanguage(next.code)
  }

  const t = (key, vars) => {
    const keys = key.split('.')
    let value = translations[lang] ?? translations.en
    for (const k of keys) {
      value = value?.[k]
    }

    if (value === undefined) {
      value = translations.en
      for (const k of keys) {
        value = value?.[k]
      }
    }

    if (typeof value === 'string' && vars && typeof vars === 'object') {
      return Object.entries(vars).reduce(
        (result, [name, replacement]) => result.replaceAll(`{${name}}`, String(replacement)),
        value
      )
    }

    return value ?? key
  }

  const languageOptions = useMemo(() => LANGUAGE_OPTIONS, [])
  const currentLanguage = useMemo(
    () => LANGUAGE_OPTIONS.find((item) => item.code === lang) ?? LANGUAGE_OPTIONS[0],
    [lang]
  )

  return (
    <LanguageContext.Provider
      value={{
        lang,
        t,
        setLang: setLanguage,
        cycleLang,
        languageOptions,
        currentLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
