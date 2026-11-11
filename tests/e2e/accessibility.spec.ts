import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const colorScheme of ['light', 'dark'] as const) {
  test(`accessible home, creation and folder chooser in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Project Docs.odt', exact: true })).toBeVisible()
    const scan = async () => {
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(result.violations).toEqual([])
    }
    await scan()
    await page.getByRole('button', { name: 'Blank document' }).click()
    await scan()
    await page.getByRole('button', { name: 'Choose another folder' }).click()
    await scan()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Choose another folder' })).toBeFocused()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await scan()
  })
}
