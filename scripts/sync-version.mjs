#!/usr/bin/env node
/**
 * Auto-increments the Minadent app build number on every production build.
 *
 * Runs automatically as the `prebuild` step (see package.json), so every
 * `pnpm build` (used by deployments) bumps the patch/build number, updates
 * the build date, and keeps these three files in sync:
 *   - src/lib/appVersion.ts   (APP_VERSION constant baked into the bundle)
 *   - public/version.json     (fetched at runtime by updateCheck.ts to
 *                              detect "a newer version exists on the server")
 *   - package.json            ("version" field, cosmetic/metadata only)
 *
 * Does NOT run on `pnpm dev` — only on `build`, so local iteration doesn't
 * spam version bumps; only real releases increment the build number.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const appVersionPath = join(root, 'src/lib/appVersion.ts')
const versionJsonPath = join(root, 'public/version.json')
const packageJsonPath = join(root, 'package.json')

function bump(version) {
  const parts = version.split('.').map((n) => parseInt(n, 10) || 0)
  while (parts.length < 3) parts.push(0)
  parts[2] += 1 // patch/build number
  return parts.join('.')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// 1. Read current version from appVersion.ts
const appVersionSrc = readFileSync(appVersionPath, 'utf8')
const currentVersionMatch = appVersionSrc.match(/APP_VERSION = '([^']+)'/)
if (!currentVersionMatch) {
  console.error('[sync-version] Could not find APP_VERSION in src/lib/appVersion.ts — aborting.')
  process.exit(1)
}
const currentVersion = currentVersionMatch[1]
const newVersion = bump(currentVersion)
const buildDate = todayISO()
const buildTimestamp = Date.now()

// Keep the existing release notes (not auto-authored) unless overridden via env.
const releaseNotesMatch = appVersionSrc.match(/RELEASE_NOTES = '([^]*?)'\n/)
const releaseNotes = process.env.MINADENT_RELEASE_NOTES || releaseNotesMatch?.[1] || ''

// 2. Write src/lib/appVersion.ts
const newAppVersionSrc = appVersionSrc
  .replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${newVersion}'`)
  .replace(/BUILD_DATE = '[^']+'/, `BUILD_DATE = '${buildDate}'`)
writeFileSync(appVersionPath, newAppVersionSrc)

// 3. Write public/version.json
let versionJson = {}
try {
  versionJson = JSON.parse(readFileSync(versionJsonPath, 'utf8'))
} catch {
  // start fresh if missing/corrupt
}
versionJson.version = newVersion
versionJson.buildDate = buildDate
versionJson.buildTimestamp = buildTimestamp
versionJson.description = releaseNotes
versionJson.releaseNotes = releaseNotes
versionJson.apkUrl = versionJson.apkUrl || '/downloads/minadent.apk'
versionJson.ipaUrl = versionJson.ipaUrl || '/downloads/minadent.ipa'
writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n')

// 4. Write package.json "version" (cosmetic, keeps npm tooling consistent)
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
packageJson.version = newVersion
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

console.log(`[sync-version] ${currentVersion} -> ${newVersion} (build ${buildDate})`)
