#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const pkgPath = resolve(rootDir, 'package.json')
const versionPath = resolve(rootDir, 'public/version.json')
const appVersionPath = resolve(rootDir, 'src/lib/appVersion.ts')
const swPath = resolve(rootDir, 'public/sw.js')

if (!existsSync(pkgPath)) {
  console.error('❌ package.json not found')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
let version = pkg.version || '1.0.0'

const args = process.argv.slice(2)
const isBumpPatch = args.includes('--bump-patch') || args.includes('--patch')
const isBumpMinor = args.includes('--bump-minor') || args.includes('--minor')
const isBumpMajor = args.includes('--bump-major') || args.includes('--major')

if (isBumpPatch || isBumpMinor || isBumpMajor) {
  const parts = version.split('.').map((p) => parseInt(p, 10) || 0)
  while (parts.length < 3) parts.push(0)

  if (isBumpMajor) {
    parts[0] += 1
    parts[1] = 0
    parts[2] = 0
  } else if (isBumpMinor) {
    parts[1] += 1
    parts[2] = 0
  } else {
    parts[2] += 1
  }

  version = parts.join('.')
  pkg.version = version
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log(`🚀 Version auto-incremented in package.json to v${version}`)
}

const today = new Date().toISOString().split('T')[0]
const buildTimestamp = Date.now()

// 1. Update public/version.json
const versionJson = {
  version,
  buildDate: today,
  buildTimestamp,
}
writeFileSync(versionPath, JSON.stringify(versionJson, null, 2) + '\n', 'utf8')
console.log(`✓ Synchronized ${versionPath} (v${version})`)

// 2. Update src/lib/appVersion.ts
const appVersionContent = `/**
 * Single source of truth for the currently-running app version.
 * Synchronized automatically with package.json and public/version.json
 * by scripts/sync-version.mjs.
 */
export const APP_VERSION = '${version}'
export const BUILD_DATE = '${today}'
`
writeFileSync(appVersionPath, appVersionContent, 'utf8')
console.log(`✓ Synchronized ${appVersionPath} (v${version})`)

// 3. Update public/sw.js CACHE_NAME
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8')
  const expected = `const CACHE_NAME = 'minadent-v${version}'`
  const updated = sw.replace(/const CACHE_NAME = '[^']*'/, expected)
  if (updated !== sw) {
    writeFileSync(swPath, updated, 'utf8')
    console.log(`✓ Synchronized ${swPath} CACHE_NAME to minadent-v${version}`)
  } else {
    console.log(`✓ ${swPath} CACHE_NAME already at minadent-v${version}`)
  }
}

console.log(`✅ MinaDent version system 100% in sync: v${version} (${today})`)
