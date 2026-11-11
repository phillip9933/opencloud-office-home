import { expect, test, type Page } from '@playwright/test'

const browse = (page: Page) => page.getByRole('region', { name: 'Browse folders' })
const recents = (page: Page) => page.getByRole('region', { name: 'Recent', exact: true })
const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Office applications' })
const toast = (page: Page) => page.locator('.office-toast')
const file = (name: string) => ({ name, exact: true })

test('create, conflict recovery, launch, folder history and settings history', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  await expect(page.getByText(/Interactive preview|Synthetic preview/)).toHaveCount(0)
  // Date groups depend on the wall clock; their boundaries are covered by unit tests.
  await expect(recents(page).getByRole('heading', { level: 3 }).first()).toBeVisible()
  await expect(recents(page).getByRole('button', file('Project Docs.odt'))).toBeVisible()

  await page.getByRole('button', { name: 'Blank document' }).click()
  const dialog = page.getByRole('dialog', { name: 'New blank document' })
  await expect(dialog).toContainText('Save in Personal files')
  await dialog.getByRole('textbox', file('Name')).fill('My report')
  await dialog.getByRole('button', file('Create')).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toContainText('Created My report.odt')
  await page.getByRole('button', { name: 'Open created file' }).click()
  await expect(toast(page)).toContainText('Simulated launch accepted')

  await page.getByRole('button', { name: 'Blank document' }).click()
  await dialog.getByRole('textbox', file('Name')).fill('My report')
  await dialog.getByRole('button', file('Create')).click()
  await expect(dialog.getByRole('status')).toContainText('already exists')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Browse folders' }).click()
  await browse(page).getByRole('button', file('Reports')).click()
  await expect(browse(page).getByRole('button', file('Shared Docs.docx'))).toBeVisible()
  await page.goBack()
  await expect(browse(page).getByRole('button', file('Reports'))).toBeVisible()
  await page.goForward()
  await expect(browse(page).getByRole('button', file('Shared Docs.docx'))).toBeVisible()

  // Clearing lives in Settings: opened-only entries go, OpenCloud changes stay.
  await expect(recents(page).getByRole('button', file('Shared Docs.docx'))).toBeVisible()
  const settingsButton = page.getByRole('button', { name: 'Settings' })
  await settingsButton.click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('button', { name: "Clear this browser's history" }).click()
  await expect(settings.getByRole('status')).toContainText('History cleared')
  await settings.getByRole('button', { name: 'Done' }).click()
  await expect(settingsButton).toBeFocused()
  await expect(recents(page).getByRole('button', file('Shared Docs.docx'))).toHaveCount(0)
  await expect(recents(page).getByRole('row', { name: /Team handbook\.docx/ })).toContainText(
    'Changed'
  )
  expect(errors).toEqual([])
})

test('sidebar navigation, version, info tip, OpenCloud icons and Back', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/^Office \d+\.\d+\.\d+$/)).toBeVisible()
  await expect(sidebar(page).getByRole('link', { name: 'Docs' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  await sidebar(page).getByRole('link', { name: 'Sheets' }).click()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await sidebar(page).getByRole('link', { name: 'Slides' }).click()
  await expect(page.getByRole('heading', { name: 'Slides', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()

  const about = page.getByRole('button', { name: 'About Recent' })
  await about.focus()
  await expect(page.getByRole('tooltip')).toContainText('changed in OpenCloud in the last 30 days')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  // Icons are OpenCloud's own design-system SVGs, loaded from its /icons path.
  await expect(page.locator('.office-icon svg').first()).toBeAttached()
  const icons = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => new URL(entry.name).pathname)
      .filter((path) => path.startsWith('/icons/'))
  )
  expect(icons).toEqual(
    expect.arrayContaining(['/icons/list-unordered.svg', '/icons/settings-4-line.svg'])
  )
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
  await expect(page.getByRole('button', file('Project timeline')).locator('img')).toHaveCount(0)
  await expect(page.getByRole('button', file('Invoice')).locator('img')).toHaveCount(1)

  await page.getByRole('button', file('Household budget')).click()
  const dialog = page.getByRole('dialog', { name: 'New from Household budget' })
  await expect(dialog).toContainText('Format: ODS')
  await dialog.getByRole('button', file('Create')).click()
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
  await sidebar(page).getByRole('link', { name: 'Docs' }).click()
  await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})

test('dialog focus, mobile width, and safe text rendering', async ({ page }) => {
  const alerts: string[] = []
  page.on('dialog', (alert) => {
    alerts.push(alert.message())
    void alert.dismiss()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(sidebar(page).getByRole('link', { name: 'Sheets' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
  const blank = page.getByRole('button', { name: 'Blank document' })
  await expect(blank).toBeEnabled()
  await blank.focus()
  await page.keyboard.press('Enter')
  const name = page.getByRole('textbox', file('Name'))
  await expect(name).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(blank).toBeFocused()

  await blank.click()
  await name.fill('<img src=x onerror=alert(1)>')
  await page.getByRole('button', file('Create')).click()
  await expect(toast(page)).toContainText('<img src=x onerror=alert(1)>.odt')
  expect(await page.locator('main img[src="x"]').count()).toBe(0)
  expect(alerts).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
})

test('recent filters, template pinning and order, and the compact band', async ({ page }) => {
  await page.goto('/#/office/sheets')
  await expect(recents(page).getByRole('button', file('Project Sheets.ods'))).toBeVisible()
  const favorites = page.getByRole('button', { name: 'Favorites' })
  await favorites.click()
  await expect(favorites).toHaveAttribute('aria-pressed', 'true')
  await expect(recents(page).getByRole('button', file('Expense log.ods'))).toBeVisible()
  await expect(recents(page).getByRole('button', file('Project Sheets.ods'))).toHaveCount(0)
  await page.getByRole('button', { name: 'Tags' }).click()
  await page.getByRole('checkbox', { name: 'Q4' }).check()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Tags (1)' })).toBeFocused()
  await expect(page.getByText('No recent files match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(recents(page).getByRole('button', file('Project Sheets.ods'))).toBeVisible()

  await page.getByRole('button', { name: 'Template gallery' }).click()
  await page.getByRole('button', { name: 'Pin Invoice to the top' }).first().click()
  await page.getByRole('button', { name: 'Pin Gradebook to the top' }).first().click()
  await page.getByRole('button', { name: 'Move Gradebook earlier' }).click()
  await page.getByRole('button', { name: 'Template gallery' }).click()
  const row = await page.locator('.office-cards-row .office-card-name').allTextContents()
  expect(row.slice(0, 3)).toEqual(['Blank spreadsheet', 'Gradebook', 'Invoice'])

  await page.getByRole('button', { name: 'Compact' }).click()
  await expect(page.getByRole('button', file('Blank spreadsheet'))).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ Blank spreadsheet' })).toBeEnabled()
  await sidebar(page).getByRole('link', { name: 'Docs' }).click()
  await expect(page.getByRole('button', { name: '+ Blank document' })).toBeVisible()
  await page.getByRole('button', { name: 'Compact' }).click()
  await expect(page.getByRole('button', file('Blank document'))).toBeVisible()
})

test('file menu, status marks, latest activity and native actions', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/#/office/slides')
  const kickoff = recents(page).getByRole('row', { name: /Kickoff deck\.odp/ })
  await expect(kickoff).toContainText('Locked by Synthetic colleague')
  await expect(kickoff).toContainText('Shared')
  const more = page.getByRole('button', { name: 'More actions for Kickoff deck.odp' })
  await more.click()
  await expect(page.getByRole('button', file('Open'))).toBeFocused()
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

test('remembers the save folder across reloads and compacts the band after a few files', async ({
  page
}) => {
  await page.goto('/#/office/sheets')
  await page.getByRole('button', { name: 'Browse folders' }).click()
  await browse(page).getByRole('button', file('Reports')).click()
  await expect(browse(page).getByRole('button', file('Shared Sheets.xlsx'))).toBeVisible()
  const dialog = page.getByRole('dialog')
  for (const name of ['Plan A', 'Plan B', 'Plan C']) {
    await page.getByRole('button', file('Blank spreadsheet')).click()
    await expect(dialog).toContainText('Save in Personal files / Reports')
    await dialog.getByRole('textbox', file('Name')).fill(name)
    await dialog.getByRole('button', file('Create')).click()
    await expect(toast(page)).toContainText(`Created ${name}.ods`)
  }
  // Automatic mode: after three created files the band becomes a single line.
  await expect(page.getByRole('button', { name: '+ Blank spreadsheet' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '+ Blank spreadsheet' }).click()
  await expect(dialog).toContainText('Save in Personal files / Reports')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'Always show template cards' }).check()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', file('Blank spreadsheet'))).toBeVisible()
})

test('dark theme tokens and right-to-left layout', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  const colors = await page.evaluate(() => {
    const shell = getComputedStyle(document.querySelector('.office')!)
    return { background: shell.backgroundColor, color: shell.color }
  })
  expect(colors).toEqual({ background: 'rgb(25, 28, 29)', color: 'rgb(225, 227, 228)' })
  await page.evaluate(() => (document.documentElement.dir = 'rtl'))
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
})
