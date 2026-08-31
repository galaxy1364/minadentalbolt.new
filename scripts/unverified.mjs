#!/usr/bin/env node
/**
 * MOD-DOC-004 | فهرست چیزهایی که هرگز دیده نشده‌اند
 *
 * Every CHANGELOG record ends with a «ریسک باقی‌مانده» section, and by
 * v1.192 thirty of them say some form of "not visually verified". Spread
 * across fifty-four records, nobody ever collects them — so a fix that
 * shipped four versions ago and was never looked at is indistinguishable
 * from one confirmed on the phone the same day.
 *
 * Deliberately derived rather than hand-written: a maintained list of
 * unverified items would itself go stale, which is the exact failure it
 * is meant to prevent. The CHANGELOG is the single source; this only
 * reads it.
 *
 * اجرا: npm run unverified
 */
import { readFileSync } from 'node:fs'

const UNVERIFIED = /تأیید بصری انجام نشده|دیده نشده|هرگز اجرا نشده|تست نشده/

const text = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')

// Records start with "## MOD-…" and run until the next one.
const records = text.split(/\n## (?=MOD-)/).slice(1)

const pending = []
for (const record of records) {
  const title = record.split('\n')[0].trim()
  const riskIndex = record.indexOf('### ریسک باقی‌مانده')
  if (riskIndex === -1) continue

  const risk = record.slice(riskIndex)
  const lines = risk
    .split('\n')
    .filter((l) => l.trim().startsWith('-') && UNVERIFIED.test(l))
    .map((l) => l.replace(/^\s*-\s*/, '').trim())

  if (lines.length) pending.push({ title, lines })
}

if (!pending.length) {
  console.log('\n✅ هیچ موردِ دیده‌نشده‌ای در CHANGELOG ثبت نیست.\n')
  process.exit(0)
}

console.log(`\n🔍 ${pending.length} رکورد با موارد تأییدنشده — به ترتیب از تازه‌ترین:\n`)
for (const { title, lines } of pending) {
  console.log(`  ${title}`)
  for (const l of lines) console.log(`     • ${l}`)
  console.log('')
}
console.log(
  'اینها ادعای شکست نیستند — کارهایی‌اند که منطقشان تست شده ولی\n' +
  'هیچ‌کس نتیجه را روی دستگاه واقعی ندیده. هرکدام که دیده شد، خط\n' +
  'مربوطه‌اش را در CHANGELOG به‌روز کن تا از این فهرست خارج شود.\n',
)
