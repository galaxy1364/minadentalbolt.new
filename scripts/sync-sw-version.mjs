// Keeps the service worker's CACHE_NAME in lockstep with the app version.
//
// Why this exists: CACHE_NAME is supposed to change on every deploy so
// browsers drop the old cache and fetch fresh JS/CSS. In practice it sat
// at 'minadent-v3' across 61 released versions because bumping it was a
// manual step someone had to remember. A stale PWA cache doesn't just
// serve old code — it can serve an old index.html that references asset
// filenames which no longer exist, and the app fails to load at all.
//
// Runs as part of `npm run verify`, so the version can't drift again.
import { readFileSync, writeFileSync } from 'node:fs'

const versionFile = 'public/version.json'
const swFile = 'public/sw.js'

const { version } = JSON.parse(readFileSync(versionFile, 'utf8'))
const sw = readFileSync(swFile, 'utf8')

const expected = `const CACHE_NAME = 'minadent-v${version}'`
const updated = sw.replace(/const CACHE_NAME = '[^']*'/, expected)

if (updated === sw) {
  console.log(`✓ sw.js cache already at v${version}`)
} else {
  writeFileSync(swFile, updated)
  console.log(`✓ sw.js cache bumped to v${version}`)
}
