import { expect, test, type Page } from '@playwright/test'

const recents = (page: Page) => page.getByRole('region', { name: 'Recent', exact: true })
const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Office applications' })
const toast = (page: Page) => page.locator('.office-toast')
const file = (name: string) => ({ name, exact: true })

test('create, conflict recovery, launch, family history and full-page settings', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
  await expect(page.getByText(/Interactive preview|Synthetic preview/)).toHaveCount(0)
  // Date groups depend on the wall clock; their boundaries are covered by unit tests.
  await expect(recents(page).getByRole('heading', { level: 3 }).first()).toBeVisible()
  await expect(recents(page).getByRole('button', file('Project Docs.odt'))).toBeVisible()

  await page.getByRole('button', { name: 'Blank document' }).click()
  const dialog = page.getByRole('region', { name: 'New document', exact: true })
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

  await sidebar(page).getByRole('link', { name: 'Sheets' }).click()
  await expect(page.getByRole('heading', file('Sheets'))).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', file('Docs'))).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', file('Sheets'))).toBeVisible()
  await page.goBack()

  // Settings is a page, preserves navigation, and does not expose a history-clear action.
  await expect(recents(page).getByRole('button', file('Shared Docs.docx'))).toBeVisible()
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Clear.*history/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Columns', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to Docs' }).click()
  await page.getByRole('button', { name: 'Choose columns' }).click()
  const columns = page.getByRole('group', { name: 'Columns', exact: true })
  await columns.getByRole('checkbox', { name: 'Owner', exact: true }).check()
  await columns.getByRole('checkbox', { name: 'Date created', exact: true }).check()
  await columns.getByRole('checkbox', { name: 'Tags', exact: true }).check()
  await columns.getByRole('button', { name: 'Done' }).click()
  await expect(recents(page).getByRole('button', file('Shared Docs.docx'))).toBeVisible()
  await expect(
    recents(page).getByRole('columnheader', { name: 'Owner', exact: true }).first()
  ).toBeVisible()
  await expect(recents(page).getByRole('row', { name: /Team handbook\.docx/ })).toContainText(
    'Synthetic owner'
  )
  expect(errors).toEqual([])
})

test('sidebar navigation, version, info tip, OpenCloud icons and Back', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/^Office \d+\.\d+\.\d+$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Browse folders' })).toHaveCount(0)
  await expect(sidebar(page).getByRole('link', { name: 'Docs' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  await sidebar(page).getByRole('link', { name: 'Sheets' }).click()
  await expect(page.getByRole('heading', { name: 'Sheets', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Browse folders' })).toHaveCount(0)
  await sidebar(page).getByRole('link', { name: 'Slides' }).click()
  await expect(page.getByRole('heading', { name: 'Slides', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Browse folders' })).toHaveCount(0)
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
  const dialog = page.getByRole('region', { name: 'New from Household budget', exact: true })
  await expect(dialog).toContainText('ODS file')
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

test('inline creation focus, cancellation, mobile width, and safe text rendering', async ({
  page
}) => {
  const alerts: string[] = []
  page.on('dialog', (alert) => {
    alerts.push(alert.message())
    void alert.dismiss()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(sidebar(page).getByRole('link', { name: 'Sheets' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  const blank = page.getByRole('button', { name: 'Blank document' })
  await expect(blank).toBeEnabled()
  await blank.focus()
  await page.keyboard.press('Enter')
  const name = page.getByRole('textbox', file('Name'))
  await expect(name).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(blank).toBeFocused()
  await expect(toast(page)).toHaveCount(0)

  await blank.click()
  await name.fill('<img src=x onerror=alert(1)>')
  await page.getByRole('button', file('Create')).click()
  await expect(toast(page)).toContainText('<img src=x onerror=alert(1)>.odt')
  expect(await page.locator('main img[src="x"]').count()).toBe(0)
  expect(alerts).toEqual([])
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [
      ...document.querySelectorAll(
        '.office, .office-main, .office-inner, .office-sidebar, .office-file-toolbar, .office-table-scroll, .office-toast-region, .office-start'
      )
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.right > innerWidth && !el.closest('.office-cards, table')
      })
      .map((el) => ({
        tag: el.tagName,
        cls: el.className,
        right: el.getBoundingClientRect().right
      }))
      .slice(0, 15)
  }))
  expect(overflow.scroll <= overflow.width, JSON.stringify(overflow)).toBe(true)
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

  await page.getByRole('button', { name: 'Collapse new document section' }).click()
  await expect(page.getByRole('button', file('Blank spreadsheet'))).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ Blank spreadsheet' })).toBeEnabled()
  await sidebar(page).getByRole('link', { name: 'Docs' }).click()
  await expect(page.getByRole('button', { name: '+ Blank document' })).toBeVisible()
  await page.getByRole('button', { name: 'Expand new document section' }).click()
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
  const dialog = page.getByRole('region', { name: 'New spreadsheet', exact: true })
  for (const name of ['Plan A', 'Plan B', 'Plan C']) {
    if (name !== 'Plan A') await page.reload()
    await page.getByRole('button', file('Blank spreadsheet')).click()
    if (name === 'Plan A') {
      await dialog.getByRole('button', { name: 'Choose another folder' }).click()
      const picker = page.getByRole('region', { name: 'Choose save folder', exact: true })
      await picker.getByRole('button', file('Reports')).click()
      await picker.getByRole('button', { name: 'Use this folder' }).click()
    }
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

  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'Always show template cards' }).check()
  await page.getByRole('link', { name: 'Back to Sheets' }).click()
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
  await page.screenshot({
    path: test.info().outputPath('mobile-before-reflow.png'),
    fullPage: true
  })
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [
      ...document.querySelectorAll(
        '.office, .office-main, .office-inner, .office-sidebar, .office-file-toolbar, .office-table-scroll, .office-toast-region, .office-start'
      )
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.right > innerWidth && !el.closest('.office-cards, table')
      })
      .map((el) => ({
        tag: el.tagName,
        cls: el.className,
        right: el.getBoundingClientRect().right
      }))
      .slice(0, 15)
  }))
  expect(overflow.scroll <= overflow.width, JSON.stringify(overflow)).toBe(true)
})

// Native OpenCloud owns search; column changes remain local to the current page.
test('column dropdown stays on the home, closes with Escape/outside click, and uses available width', async ({
  page
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/')
  await expect(recents(page).getByRole('button', file('Project Docs.odt'))).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Search files' })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Search scope' })).toHaveCount(0)
  const widths = await page
    .locator('.office-table-scroll')
    .evaluateAll((els) => els.map((el) => ({ visible: el.clientWidth, scroll: el.scrollWidth })))
  expect(
    widths.every((value) => value.scroll <= value.visible),
    JSON.stringify(widths)
  ).toBe(true)
  const table = await page.locator('.office-table').first().boundingBox()
  const main = await page.locator('main').boundingBox()
  expect(table!.width).toBeGreaterThan(main!.width * 0.9)
  const before = page.url()
  const trigger = page.getByRole('button', { name: 'Choose columns' })
  await trigger.click()
  const columns = page.getByRole('group', { name: 'Columns', exact: true })
  await expect(columns).toBeVisible()
  await columns.getByRole('checkbox', { name: 'Owner', exact: true }).check()
  await page.keyboard.press('Escape')
  await expect(columns).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(page.url()).toBe(before)
  await expect(
    recents(page).getByRole('columnheader', { name: 'Owner', exact: true }).first()
  ).toBeVisible()
  await trigger.click()
  await page.getByRole('heading', { name: 'Recent', exact: true }).click()
  await expect(columns).toBeHidden()
  await page.reload()
  await expect(
    recents(page).getByRole('columnheader', { name: 'Owner', exact: true }).first()
  ).toBeVisible()
  await sidebar(page).getByRole('link', { name: 'Sheets' }).click()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Docs', exact: true })).toBeVisible()
})

test('visual inspection artifacts for desktop light and mobile dark', async ({ page }) => {
  await page.goto('/')
  await expect(recents(page).getByRole('button', file('Project Docs.odt'))).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('desktop-light.png'), fullPage: true })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: test.info().outputPath('mobile-before-reflow.png'),
    fullPage: true
  })
  await page.screenshot({
    path: test.info().outputPath('mobile-before-reflow.png'),
    fullPage: true
  })
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [
      ...document.querySelectorAll(
        '.office, .office-main, .office-inner, .office-sidebar, .office-file-toolbar, .office-table-scroll, .office-toast-region, .office-start'
      )
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.right > innerWidth && !el.closest('.office-cards, table')
      })
      .map((el) => ({
        tag: el.tagName,
        cls: el.className,
        right: el.getBoundingClientRect().right
      }))
      .slice(0, 15)
  }))
  expect(overflow.scroll <= overflow.width, JSON.stringify(overflow)).toBe(true)
  await expect(page.getByRole('link', { name: 'Settings' }).locator('svg')).toBeVisible()
  const settings = await page.getByRole('link', { name: 'Settings' }).boundingBox()
  expect(settings).not.toBeNull()
  expect(settings!.x).toBeGreaterThanOrEqual(0)
  expect(settings!.x + settings!.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: test.info().outputPath('mobile-dark.png'), fullPage: true })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', file('Blank document')).click()
  const panel = page.getByRole('region', { name: 'New document', exact: true })
  await expect(panel.getByRole('textbox', file('Name'))).toBeFocused()
  await page.screenshot({
    path: test.info().outputPath('creation-desktop-light.png'),
    fullPage: true
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(panel.getByRole('button', file('Create'))).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: test.info().outputPath('creation-mobile-dark.png'),
    fullPage: true
  })
  await panel.getByRole('button', file('Cancel')).click()
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.getByRole('button', { name: 'Choose columns' }).click()
  await expect(page.getByRole('group', { name: 'Columns', exact: true })).toBeVisible()
  const menuBox = await page.getByRole('group', { name: 'Columns', exact: true }).boundingBox()
  expect(menuBox!.x).toBeGreaterThanOrEqual(0)
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(1000)
  await page.screenshot({
    path: test.info().outputPath('columns-desktop-dark.png'),
    fullPage: true
  })
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: test.info().outputPath('settings-mobile-dark.png'),
    fullPage: true
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({
    path: test.info().outputPath('settings-desktop-light.png'),
    fullPage: true
  })
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('choose a save folder inline, cancel safely, and configure a personal template folder', async ({
  page
}) => {
  await page.goto('/')
  await page.getByRole('button', file('Blank document')).click()
  const panel = page.getByRole('region', { name: 'New document', exact: true })
  await expect(panel.getByRole('combobox', { name: 'Format' })).toHaveCount(0)
  await panel.getByRole('textbox', file('Name')).fill('Chosen destination')
  await panel.getByRole('button', { name: 'Choose another folder' }).click()
  const picker = page.getByRole('region', { name: 'Choose save folder', exact: true })
  await picker.getByRole('button', file('Reports')).click()
  await picker.getByRole('button', { name: 'Use this folder' }).click()
  await expect(panel).toContainText('Save in Personal files / Reports')
  await expect(panel.getByRole('textbox', file('Name'))).toHaveValue('Chosen destination')
  await panel.getByRole('button', file('Cancel')).click()
  await expect(page.getByRole('button', file('Chosen destination.odt'))).toHaveCount(0)
  await expect(toast(page)).toHaveCount(0)
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Choose template folder' }).click()
  const templates = page.getByRole('region', { name: 'Choose template folder', exact: true })
  await templates.getByRole('combobox', { name: 'Space' }).selectOption('fixture-templates')
  await templates.getByRole('button', { name: 'Use this folder' }).click()
  await expect(page.getByText('Your template folder:', { exact: false })).toBeVisible()
  await page.getByRole('link', { name: 'Back to Docs' }).click()
  await expect(page.getByRole('button', file('Letterhead'))).toBeVisible()
})
