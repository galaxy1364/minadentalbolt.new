import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

/**
 * MOD-TEST-A11Y | جایگزین سبک `@axe-core/playwright`
 *
 * به‌جای اضافه‌کردن یک پکیج جدید، همان `axe-core`ای که قبلاً به عنوان
 * وابستگی نصب شده مستقیماً در صفحه تزریق می‌شود. کوچک‌تر از نصب یک
 * پکیج wrapper کامل، و همان API استاندارد axe (`axe.run`) را می‌دهد.
 */

const AXE_SCRIPT = fs.readFileSync(
  path.resolve(import.meta.dirname, '../../node_modules/axe-core/axe.min.js'),
  'utf-8',
)

export interface AxeResults {
  violations: Array<{
    id: string
    help: string
    nodes: Array<{ target: string[]; failureSummary?: string }>
  }>
}

export default class AxeBuilder {
  private page: Page
  private rules?: string[]

  constructor({ page }: { page: Page }) {
    this.page = page
  }

  /** محدود می‌کند که فقط این قوانین اجرا شوند (سایر قوانین axe نادیده گرفته می‌شوند). */
  withRules(rules: string[]): this {
    this.rules = rules
    return this
  }

  async analyze(): Promise<AxeResults> {
    await this.page.evaluate(AXE_SCRIPT)
    const rules = this.rules
    return this.page.evaluate(async (ruleIds) => {
      const options = ruleIds
        ? { runOnly: { type: 'rule' as const, values: ruleIds } }
        : undefined
      // @ts-expect-error axe is injected globally by AXE_SCRIPT above
      const results = await window.axe.run(document, options)
      return { violations: results.violations }
    }, rules)
  }
}
