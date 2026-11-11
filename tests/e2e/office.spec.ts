import { expect, test, type Page } from '@playwright/test'

const browse = (page: Page) => page.getByRole('region', { name: 'Browse folders' })
const recents = (page: Page) =>
  page.getByRole('region', { name: 'Recently opened in this browser' })

test('create, conflict recovery, launch, recents and folder history', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  await expect(page.getByText('Synthetic files only.', { exact: false })).toBeVisible()
  // Date groups depend on the wall clock; their boundaries are covered by unit tests.
  await expect(recents(page).getByRole('heading', { level: 3 }).first()).toBeVisible()
  await expect(recents(page).getByRole('button', { name: 'Project Docs.odt' })).toBeVisible()
  await page.screenshot({ path: 'test-results/office-desktop.png', fullPage: true })

  await page.getByRole('button', { name: 'Blank document' }).click()
  const dialog = page.getByRole('dialog', { name: 'New blank document' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Save in Personal files')
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('My report')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('status')).toContainText('Created My report.odt')
  await page.getByRole('button', { name: 'Open created file' }).click()
  await expect(page.getByRole('status')).toContainText('Simulated launch accepted')

  await page.getByRole('button', { name: 'Blank document' }).click()
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('My report')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('already exists')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Browse folders' }).click()
  await browse(page).getByRole('button', { name: 'Reports', exact: true }).click()
  await expect(browse(page).getByRole('button', { name: 'Shared Docs.docx' })).toBeVisible()
  await page.goBack()
  await expect(browse(page).getByRole('button', { name: 'Reports', exact: true })).toBeVisible()
  await page.goForward()
  await expect(browse(page).getByRole('button', { name: 'Shared Docs.docx' })).toBeVisible()
  await recents(page).getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No recently opened files in this browser yet.')).toBeVisible()
  expect(errors).toEqual([])
})

test('template gallery categories, previews, grid layout and name sorting', async ({ page }) => {
  await page.goto('/#/office/sheets')
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  const gallery = page.getByRole('button', { name: 'Template gallery' })
  await expect(gallery).toBeEnabled()
  await gallery.click()
  await expect(gallery).toHaveAttribute('aria-expanded', 'true')
  for (const category of ['Business', 'Personal', 'Education'])
    await expect(page.getByRole('heading', { name: category, level: 3 })).toBeVisible()
  // Companion images become previews; a template without one falls back to its format card.
  const timeline = page.getByRole('button', { name: 'Project timeline' })
  await expect(timeline.locator('img')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Invoice' }).locator('img')).toHaveCount(1)

  await page.getByRole('button', { name: 'Household budget' }).click()
  const dialog = page.getByRole('dialog', { name: 'New from Household budget' })
  await expect(dialog).toContainText('Format: ODS')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Created Household budget.ods')

  await page.getByRole('button', { name: 'Grid view' }).click()
  await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  // Office documents have no server preview in OpenCloud 9.0.0, so recents show format cards.
  const card = recents(page).getByRole('button', { name: /Expense log\.ods/ })
  await expect(card).toContainText('ODS')
  await expect(card.locator('img')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('name')
  await expect(recents(page).getByRole('heading', { level: 3 })).toHaveCount(0)
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Docs', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})

test('cancel pending search during app changes and preserve search on Back', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  await page.getByRole('searchbox').fill('Project')
  await expect(page).toHaveURL(/view=v2/)
  await expect(browse(page).getByRole('button', { name: 'Project Docs.odt' })).toBeVisible()
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Sheets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await page.getByRole('searchbox').fill('obsolete search')
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Slides', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Slides', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Project Slides.odp' }).first()).toBeVisible()
  await expect(page.getByRole('searchbox')).toHaveValue('')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('Project')
})

test('keyboard disclosure, dialog focus, mobile width, and safe text rendering', async ({
  page
}) => {
  const alerts: string[] = []
  page.on('dialog', (alert) => {
    alerts.push(alert.message())
    void alert.dismiss()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const menu = page.getByRole('button', { name: 'Applications' })
  await menu.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('link', { name: 'Docs', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')

  const blank = page.getByRole('button', { name: 'Blank document' })
  await expect(blank).toBeEnabled()
  await blank.focus()
  await page.keyboard.press('Enter')
  const name = page.getByRole('textbox', { name: 'Name', exact: true })
  await expect(name).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(blank).toBeFocused()

  await blank.click()
  await name.fill('<img src=x onerror=alert(1)>')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('<img src=x onerror=alert(1)>.odt')
  expect(await page.locator('main img[src="x"]').count()).toBe(0)
  expect(alerts).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.screenshot({ path: 'test-results/office-mobile.png', fullPage: true })
})
