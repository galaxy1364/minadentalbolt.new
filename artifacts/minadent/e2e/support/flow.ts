import { Page, expect } from '@playwright/test'

/** Fill an Input/Textarea located by its placeholder. */
export async function fillByPlaceholder(page: Page, placeholder: string, value: string, exact = false) {
  await page.getByPlaceholder(placeholder, { exact }).first().fill(value)
}

/**
 * Select an option in one of the app's <Select> widgets. Labels are not
 * associated with their control (no htmlFor), so target the <select>
 * that sits under a <label> with this text.
 */
export async function selectByLabel(page: Page, label: string, optionSubstring: string) {
  const control = page.locator(`xpath=//label[normalize-space(text())=${xp(label)}]/following-sibling::select`).first()
  await control.waitFor({ state: 'visible' })
  // Match by substring: real option text carries suffixes like
  // «— این روز کار نمی‌کند» or «— ۰۹:۰۰ تا ۱۸:۰۰», so an exact label
  // rarely matches. Resolve the value from the option's text instead.
  const value = await control.evaluate((el, sub) => {
    const opt = [...(el as HTMLSelectElement).options].find((o) => o.textContent?.includes(sub))
    return opt ? opt.value : null
  }, optionSubstring)
  if (!value) throw new Error(`no option containing «${optionSubstring}» under label «${label}»`)
  await control.selectOption(value)
}

function xp(s: string) { return `'${s.replace(/'/g, "\\'")}'` }

/** Open the PersianDateInput under `label` and click a day cell (Persian digits). */
export async function pickPersianDate(page: Page, label: string, dayFa: string) {
  const trigger = page.locator(`xpath=//label[normalize-space(text())=${xp(label)}]/following-sibling::button`).first()
  await trigger.click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: dayFa, exact: true }).first().click()
  await page.waitForTimeout(200)
}

/** Fill an Input/CurrencyInput/Textarea located by its label text. */
export async function fillByLabel(page: Page, label: string, value: string) {
  const control = page.locator(`xpath=//label[normalize-space(text())=${xp(label)}]/following-sibling::input | //label[normalize-space(text())=${xp(label)}]/following-sibling::textarea`).first()
  await control.waitFor({ state: 'visible' })
  await control.fill(value)
}

/**
 * Drive the two-step ConfirmAction dialog: press «ادامه و تایید», then
 * press-and-hold the commit button (~550ms) until it fires onConfirm.
 */
export async function confirmHold(page: Page) {
  await page.getByRole('button', { name: 'ادامه و تایید' }).click()
  const commit = page.getByRole('button', { name: /نگه دارید/ })
  await commit.waitFor({ state: 'visible' })
  const box = (await commit.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
}

/** Select, in a given <select> locator, the option whose text contains `sub`. */
export async function selectOptionContaining(control: any, sub: string) {
  await control.waitFor({ state: 'visible' })
  const value = await control.evaluate((el: HTMLSelectElement, s: string) => {
    const opt = [...el.options].find((o) => o.textContent?.includes(s))
    return opt ? opt.value : null
  }, sub)
  if (!value) throw new Error(`no option containing «${sub}»`)
  await control.selectOption(value)
}

/** Advance a Wizard by pressing «بعدی». */
export async function wizardNext(page: Page) {
  await page.getByRole('button', { name: /^بعدی/ }).click()
  await page.waitForTimeout(300)
}

/**
 * Advance a Wizard to its final step and press the finish button.
 * Presses «بعدی» until it disappears (last step reached), then clicks the
 * finish button by its exact label.
 */
export async function wizardFinish(page: Page, finishLabel: string) {
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole('button', { name: /^بعدی/ })
    if (await next.count() === 0 || !(await next.first().isVisible())) break
    await next.first().click()
    await page.waitForTimeout(350)
  }
  await page.getByRole('button', { name: finishLabel, exact: true }).click()
}
