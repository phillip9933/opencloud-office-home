import { expect, test, type Page } from '@playwright/test'

const browse = (page: Page) => page.getByRole('region', { name: 'Browse folders' })
const recents = (page: Page) => page.getByRole('region', { name: 'Recent', exact: true })
const toast = (page: Page) => page.locator('.office-toast')
const results = (page: Page) => page.getByRole('region', { name: /^Search results/ })

test('create, conflict recovery, launch, recents and folder history', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  await expect(page.getByText('Synthetic files only.', { exact: false })).toBeVisible()
  // Date groups depend on the wall clock; their boundaries are covered by unit tests.
  await expect(recents(page).getByRole('heading', { level: 3 }).first()).toBeVisible()
  await expect(
    recents(page).getByRole('button', { name: 'Project Docs.odt', exact: true })
  ).toBeVisible()
  await page.screenshot({ path: 'test-results/office-desktop.png', fullPage: true })

  await page.getByRole('button', { name: 'Blank document' }).click()
  const dialog = page.getByRole('dialog', { name: 'New blank document' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Save in Personal files')
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('My report')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toContainText('Created My report.odt')
  await page.getByRole('button', { name: 'Open created file' }).click()
  await expect(toast(page)).toContainText('Simulated launch accepted')

  await page.getByRole('button', { name: 'Blank document' }).click()
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('My report')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('already exists')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Browse folders' }).click()
  await browse(page).getByRole('button', { name: 'Reports', exact: true }).click()
  await expect(
    browse(page).getByRole('button', { name: 'Shared Docs.docx', exact: true })
  ).toBeVisible()
  await page.goBack()
  await expect(browse(page).getByRole('button', { name: 'Reports', exact: true })).toBeVisible()
  await page.goForward()
  await expect(
    browse(page).getByRole('button', { name: 'Shared Docs.docx', exact: true })
  ).toBeVisible()
  // Opened-only history disappears; files changed in OpenCloud stay listed as changes.
  await expect(
    recents(page).getByRole('button', { name: 'Shared Docs.docx', exact: true })
  ).toBeVisible()
  await recents(page).getByRole('button', { name: "Clear this browser's history" }).click()
  await expect(
    recents(page).getByRole('button', { name: 'Shared Docs.docx', exact: true })
  ).toHaveCount(0)
  await expect(recents(page).getByRole('row', { name: /Team handbook\.docx/ })).toContainText(
    'Changed'
  )
  await expect(recents(page).getByText(/^Opened /)).toHaveCount(0)
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
  const timeline = page.getByRole('button', { name: 'Project timeline', exact: true })
  await expect(timeline.locator('img')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Invoice', exact: true }).locator('img')
  ).toHaveCount(1)

  await page.getByRole('button', { name: 'Household budget', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New from Household budget' })
  await expect(dialog).toContainText('Format: ODS')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(toast(page)).toContainText('Created Household budget.ods')

  await page.getByRole('button', { name: 'Grid view' }).click()
  await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  // Office documents have no server preview in OpenCloud 9.0.0, so recents show format cards.
  const card = recents(page).getByRole('button', { name: /^Expense log\.ods/ })
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
  const firstView = page.url()
  await page.getByRole('searchbox').fill('Project')
  await expect(page).not.toHaveURL(firstView)
  // Header search covers all spaces by default and replaces Recent with results.
  await expect(
    results(page).getByRole('button', { name: 'Project Docs.odt', exact: true })
  ).toBeVisible()
  await expect(recents(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Sheets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await page.getByRole('searchbox').fill('obsolete search')
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Slides', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Slides', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Project Slides.odp', exact: true }).first()
  ).toBeVisible()
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
  await expect(toast(page)).toContainText('<img src=x onerror=alert(1)>.odt')
  expect(await page.locator('main img[src="x"]').count()).toBe(0)
  expect(alerts).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.screenshot({ path: 'test-results/office-mobile.png', fullPage: true })
})

test('recent filters, template pinning and order, and the compact band', async ({ page }) => {
  await page.goto('/#/office/sheets')
  await expect(
    recents(page).getByRole('button', { name: 'Project Sheets.ods', exact: true })
  ).toBeVisible()
  const favorites = page.getByRole('button', { name: 'Favorites' })
  await favorites.click()
  await expect(favorites).toHaveAttribute('aria-pressed', 'true')
  await expect(
    recents(page).getByRole('button', { name: 'Expense log.ods', exact: true })
  ).toBeVisible()
  await expect(
    recents(page).getByRole('button', { name: 'Project Sheets.ods', exact: true })
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Tags' }).click()
  await page.getByRole('checkbox', { name: 'Q4' }).check()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Tags (1)' })).toBeFocused()
  await expect(page.getByText('No recent files match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(
    recents(page).getByRole('button', { name: 'Project Sheets.ods', exact: true })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Template gallery' }).click()
  await page.getByRole('button', { name: 'Pin Invoice to the top' }).click()
  await page.getByRole('button', { name: 'Pin Gradebook to the top' }).first().click()
  await expect(
    page.getByRole('button', { name: 'Pin Invoice to the top' }).first()
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Move Gradebook earlier' }).click()
  await page.getByRole('button', { name: 'Template gallery' }).click()
  const row = await page.locator('.office-cards-row .office-card-name').allTextContents()
  expect(row.slice(0, 3)).toEqual(['Blank spreadsheet', 'Gradebook', 'Invoice'])

  await page.getByRole('button', { name: 'Compact' }).click()
  await expect(page.getByRole('button', { name: 'Blank spreadsheet', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ Blank spreadsheet' })).toBeEnabled()
  await page.getByRole('button', { name: 'Applications' }).click()
  await page.getByRole('link', { name: 'Docs', exact: true }).click()
  await expect(page.getByRole('button', { name: '+ Blank document' })).toBeVisible()
  await page.getByRole('button', { name: 'Compact' }).click()
  await expect(page.getByRole('button', { name: 'Blank document', exact: true })).toBeVisible()
})

test('file menu, status marks, latest activity and native actions', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/#/office/slides')
  const kickoff = recents(page).getByRole('row', { name: /Kickoff deck\.odp/ })
  await expect(kickoff).toContainText('Locked by Synthetic colleague')
  await expect(kickoff).toContainText('Shared')
  const more = page.getByRole('button', { name: 'More actions for Kickoff deck.odp', exact: true })
  await more.click()
  await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Open read-only' })).toBeVisible()
  await expect(page.getByText('Synthetic colleague updated Kickoff deck.odp')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
  await more.click()
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(toast(page)).toContainText('Link copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'https://cloud.example/f/kickoff'
  )
  await more.click()
  await page.getByRole('button', { name: 'Show in Files' }).click()
  await expect(toast(page)).toContainText('Simulated: OpenCloud Files would open')
  await page.getByRole('button', { name: 'Dismiss message' }).click()
  await expect(toast(page)).toHaveCount(0)
})

test('remembers the last save folder, and keyboard shortcuts can be switched off', async ({
  page
}) => {
  await page.goto('/#/office/sheets')
  await page.getByRole('button', { name: 'Browse folders' }).click()
  await browse(page).getByRole('button', { name: 'Reports', exact: true }).click()
  await expect(
    browse(page).getByRole('button', { name: 'Shared Sheets.xlsx', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Blank spreadsheet', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Save in Personal files / Reports')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(toast(page)).toContainText('Created Untitled spreadsheet.ods')
  await page.goto('about:blank')
  await page.goBack()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Blank spreadsheet', exact: true }).click()
  await expect(dialog).toContainText('Save in Personal files / Reports')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('/')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await page.getByRole('heading', { name: 'Sheets', exact: true }).focus()
  await page.keyboard.press('n')
  await expect(page.getByRole('dialog', { name: 'New blank spreadsheet' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  await page.getByRole('checkbox', { name: 'Use single-key shortcuts' }).uncheck()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('heading', { name: 'Sheets', exact: true }).focus()
  await page.keyboard.press('n')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('dark theme tokens and right-to-left layout', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  const colors = await page.evaluate(() => {
    const main = getComputedStyle(document.querySelector('main')!)
    return { background: main.backgroundColor, color: main.color }
  })
  expect(colors).toEqual({ background: 'rgb(25, 28, 29)', color: 'rgb(225, 227, 228)' })
  await page.screenshot({ path: 'test-results/office-dark.png' })
  await page.evaluate(() => (document.documentElement.dir = 'rtl'))
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.screenshot({ path: 'test-results/office-rtl.png' })
})
