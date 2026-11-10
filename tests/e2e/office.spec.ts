import { expect, test } from '@playwright/test'

test('create, conflict recovery, launch, recents and folder history', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  await expect(page.getByText('Synthetic files only.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Project Docs.odt', exact: true })).toBeVisible()
  await page.screenshot({
    path: 'test-results/office-desktop.png',
    fullPage: true
  })
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('My report')
  await page.getByRole('button', { name: 'Create file', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Created My report.odt')
  await page.getByRole('button', { name: 'Open created file' }).click()
  await expect(page.getByRole('status')).toContainText('Simulated launch accepted')
  await page.getByRole('button', { name: 'Create file', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('already exists')
  await page.getByRole('button', { name: 'Reports', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Shared Docs.docx', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Reports', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('button', { name: 'Shared Docs.docx', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recently opened in this browser' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No verified recent files to show.')).toBeVisible()
  expect(errors).toEqual([])
})

test('cancel pending search during app changes and preserve search on Back', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Project Docs.odt', exact: true })).toBeVisible()
  await page.getByRole('searchbox').fill('Project')
  await expect(page).toHaveURL(/view=v2/)
  await expect(page.getByRole('button', { name: 'Project Docs.odt', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Sheets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await page.getByRole('searchbox').fill('obsolete search')
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Slides', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Project Slides.odp', exact: true })).toBeVisible()
  await expect(page.getByRole('searchbox')).toHaveValue('')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('Project')
})

test('keyboard disclosure, Escape focus recovery, mobile width, and safe text rendering', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const menu = page.getByRole('button', { name: 'Applications' })
  await menu.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('link', { name: 'Docs', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('<img src=x onerror=alert(1)>')
  await page.getByRole('button', { name: 'Create file', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('<img src=x onerror=alert(1)>.odt')
  expect(await page.locator('main img').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.screenshot({
    path: 'test-results/office-mobile.png',
    fullPage: true
  })
})
