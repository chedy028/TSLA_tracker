import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

const SRC_DIR = path.join(process.cwd(), 'src')
const TRANSLATIONS_FILE = path.join(SRC_DIR, 'i18n', 'translations.js')

function walkFiles(dir, collected = []) {
  if (!fs.existsSync(dir)) return collected

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, collected)
      continue
    }

    if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue
    collected.push(fullPath)
  }

  return collected
}

function collectTranslationShape(value, prefix = '', shape = new Set()) {
  if (Array.isArray(value)) {
    if (prefix) shape.add(`${prefix}[]`)
    for (const item of value) {
      collectTranslationShape(item, `${prefix}[]`, shape)
    }
    return shape
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key
      collectTranslationShape(nested, nextPrefix, shape)
    }
    return shape
  }

  if (prefix) {
    shape.add(prefix)
  }

  return shape
}

function hasPath(target, dottedPath) {
  let current = target
  for (const part of dottedPath.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return false
    }
    current = current[part]
  }
  return true
}

function extractStaticTKeys(content) {
  const keys = new Set()
  const quotedRegex = /\bt\(\s*(['"])([A-Za-z0-9_.-]+)\1\s*(?:,|\))/g
  const templateRegex = /\bt\(\s*`([A-Za-z0-9_.-]+)`\s*(?:,|\))/g

  for (const match of content.matchAll(quotedRegex)) {
    keys.add(match[2])
  }
  for (const match of content.matchAll(templateRegex)) {
    keys.add(match[1])
  }

  return keys
}

const translationModule = await import(pathToFileURL(TRANSLATIONS_FILE).href)
const { translations } = translationModule
const languages = Object.keys(translations)

if (!languages.includes('en')) {
  throw new Error('translations.en is required as the base language')
}

const baseShape = collectTranslationShape(translations.en)
const shapeIssues = []

for (const lang of languages) {
  if (lang === 'en') continue

  const langShape = collectTranslationShape(translations[lang])
  const missing = [...baseShape].filter((item) => !langShape.has(item))
  const extra = [...langShape].filter((item) => !baseShape.has(item))

  if (missing.length > 0 || extra.length > 0) {
    shapeIssues.push({ lang, missing, extra })
  }
}

const sourceFiles = walkFiles(SRC_DIR)
const referencedKeys = new Set()
for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, 'utf8')
  for (const key of extractStaticTKeys(content)) {
    referencedKeys.add(key)
  }
}

const referenceIssues = []
for (const key of [...referencedKeys].sort()) {
  for (const lang of languages) {
    if (!hasPath(translations[lang], key)) {
      referenceIssues.push({ key, lang })
    }
  }
}

if (shapeIssues.length > 0 || referenceIssues.length > 0) {
  if (shapeIssues.length > 0) {
    console.error('Translation shape mismatch detected:')
    for (const issue of shapeIssues) {
      console.error(`- ${issue.lang}`)
      if (issue.missing.length > 0) {
        console.error(`  missing (${issue.missing.length}): ${issue.missing.slice(0, 12).join(', ')}`)
      }
      if (issue.extra.length > 0) {
        console.error(`  extra (${issue.extra.length}): ${issue.extra.slice(0, 12).join(', ')}`)
      }
    }
  }

  if (referenceIssues.length > 0) {
    console.error('Missing translation keys referenced in source:')
    for (const issue of referenceIssues.slice(0, 40)) {
      console.error(`- ${issue.key} (${issue.lang})`)
    }
    if (referenceIssues.length > 40) {
      console.error(`... and ${referenceIssues.length - 40} more`)
    }
  }

  process.exit(1)
}

console.log(`i18n coverage check passed for languages: ${languages.join(', ')}`)
