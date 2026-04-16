/**
 * Smoke tests for the AI Communities Dashboard.
 *
 * Use cases modeled on an executive exploring sponsorship opportunities:
 *  1. Page loads with map and sidebar visible
 *  2. Map renders pins on the correct continents
 *  3. Sidebar lists communities sorted by priority
 *  4. Upcoming events section shows dated events
 *  5. Search filters both sidebar and map
 *  6. Region filter narrows results
 *  7. Priority filter shows only starred communities
 *  8. AI Tools filter works
 *  9. Clicking a sidebar community opens detail modal
 * 10. Detail modal shows correct community info and closes cleanly
 * 11. Clicking a map pin opens detail modal (the known bug)
 * 12. Clear filters restores full list
 */

import { test, expect } from '@playwright/test'

// Wait for the app to hydrate and Leaflet to render tiles
const ready = async (page) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-container', { timeout: 10000 })
  // Give Leaflet a beat to place markers
  await page.waitForTimeout(1500)
}

// ─── 1. Page loads with map and sidebar ─────────────────────────────────────

test('1 — page loads with map and sidebar visible', async ({ page }) => {
  await ready(page)

  // Map container exists and is visible
  const map = page.locator('.leaflet-container')
  await expect(map).toBeVisible()

  // Sidebar exists with "Communities" heading
  const sidebar = page.locator('aside')
  await expect(sidebar).toBeVisible()
  await expect(sidebar.locator('text=Communities')).toBeVisible()

  // Header is present
  await expect(page.locator('header')).toBeVisible()
  await expect(page.locator('text=AI Communities')).toBeVisible()

  // Footer stats shows community count
  const footer = page.locator('footer')
  await expect(footer).toContainText('communities')
  await expect(footer).toContainText('regions')
})

// ─── 2. Map renders pins ────────────────────────────────────────────────────

test('2 — map renders community pins', async ({ page }) => {
  await ready(page)

  // Leaflet circle markers should be rendered as SVG paths
  const pins = page.locator('.leaflet-interactive')
  const count = await pins.count()
  expect(count).toBeGreaterThan(50)
})

// ─── 3. Sidebar lists communities sorted by priority ────────────────────────

test('3 — sidebar lists communities with highest priority first', async ({ page }) => {
  await ready(page)

  // The communities section should list items
  const sidebar = page.locator('aside')
  const communityButtons = sidebar.locator('button').filter({ has: page.locator('.rounded-full') })
  const count = await communityButtons.count()
  expect(count).toBeGreaterThan(100)

  // First community in the communities section (not events) should be top-priority
  const commSection = sidebar.locator('.flex-1.overflow-auto')
  const firstDot = commSection.locator('button').first().locator('.rounded-full').first()
  const color = await firstDot.evaluate(el => {
    const s = getComputedStyle(el)
    return s.backgroundColor
  })
  // Red = top priority: rgb(239, 68, 68) is #ef4444
  expect(color).toBe('rgb(239, 68, 68)')
})

// ─── 4. Upcoming events section exists with dates ───────────────────────────

test('4 — upcoming events section shows dated events', async ({ page }) => {
  await ready(page)

  const sidebar = page.locator('aside')
  // Use the heading role to avoid matching community names containing "Events"
  await expect(sidebar.getByRole('heading', { name: 'Events' })).toBeVisible()

  // Event items have month abbreviations
  const eventItems = sidebar.locator('.border-b button')
  const count = await eventItems.count()
  expect(count).toBeGreaterThan(0)

  // First event should have a date with month text
  const firstEvent = eventItems.first()
  const text = await firstEvent.textContent()
  // Should contain a month abbreviation like "Apr", "May", "Jun", etc.
  expect(text).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
})

// ─── 5. Search filters sidebar and map ──────────────────────────────────────

test('5 — search filters both sidebar and map pins', async ({ page }) => {
  await ready(page)

  const pinsBefore = await page.locator('.leaflet-interactive').count()
  const sidebar = page.locator('aside')

  // Type a specific search
  await page.fill('input[placeholder="Search..."]', 'Geneva')
  await page.waitForTimeout(500)

  // Sidebar should now show fewer communities
  const communityButtons = sidebar.locator('button').filter({ hasText: 'Geneva' })
  const matchCount = await communityButtons.count()
  expect(matchCount).toBeGreaterThan(0)

  // Map should have fewer pins
  const pinsAfter = await page.locator('.leaflet-interactive').count()
  expect(pinsAfter).toBeLessThan(pinsBefore)

  // The filtered list should be substantially smaller than the full list
  const allButtons = sidebar.locator('.flex-1.overflow-auto button')
  const total = await allButtons.count()
  expect(total).toBeLessThan(20) // search "Geneva" matches a handful, not 189
  expect(total).toBeGreaterThan(0)
})

// ─── 6. Region filter narrows results ───────────────────────────────────────

test('6 — region filter narrows sidebar and map', async ({ page }) => {
  await ready(page)

  const pinsBefore = await page.locator('.leaflet-interactive').count()

  // Select London region
  await page.selectOption('select', { label: 'London' })
  await page.waitForTimeout(500)

  // A filter pill for "London" should appear (exact match in the filter bar)
  await expect(page.getByRole('button', { name: 'London', exact: true })).toBeVisible()

  // Fewer pins on map
  const pinsAfter = await page.locator('.leaflet-interactive').count()
  expect(pinsAfter).toBeLessThan(pinsBefore)
  expect(pinsAfter).toBeGreaterThan(0)

  // Sidebar communities should mostly be London-region
  const sidebar = page.locator('aside .flex-1.overflow-auto')
  const firstItem = sidebar.locator('button').first()
  const text = await firstItem.textContent()
  expect(text.toLowerCase()).toContain('london')
})

// ─── 7. Priority filter shows only starred communities ──────────────────────

test('7 — priority star filter works', async ({ page }) => {
  await ready(page)

  // Click the ★★★ filter button
  const starButton = page.locator('button', { hasText: '★★★' })
  await starButton.click()
  await page.waitForTimeout(500)

  // Should show only top-priority communities (8 in the data)
  const sidebar = page.locator('aside .flex-1.overflow-auto')
  const items = sidebar.locator('button')
  const count = await items.count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThanOrEqual(15)

  // All priority dots should be red (rgb(239, 68, 68) = #ef4444)
  const dots = sidebar.locator('.rounded-full[style*="background"]')
  const dotCount = await dots.count()
  for (let i = 0; i < dotCount; i++) {
    const color = await dots.nth(i).evaluate(el => getComputedStyle(el).backgroundColor)
    expect(color).toBe('rgb(239, 68, 68)')
  }
})

// ─── 8. AI Tools filter works ───────────────────────────────────────────────

test('8 — AI Tools filter shows only communities with coding tools', async ({ page }) => {
  await ready(page)

  const pinsBefore = await page.locator('.leaflet-interactive').count()

  // Click the AI coding tool sponsor filter
  const toolsButton = page.locator('button', { hasText: 'Has AI Coding Tool Sponsors' })
  await toolsButton.click()
  await page.waitForTimeout(500)

  const pinsAfter = await page.locator('.leaflet-interactive').count()
  expect(pinsAfter).toBeLessThan(pinsBefore)
  expect(pinsAfter).toBeGreaterThan(10)  // 38 communities have AI tools

  // Footer should show a smaller count
  const footer = page.locator('footer')
  const text = await footer.textContent()
  const match = text.match(/(\d+) communities/)
  expect(parseInt(match[1])).toBeLessThan(pinsBefore)
})

// ─── 9. Clicking sidebar community opens detail modal ───────────────────────

test('9 — clicking a sidebar community opens detail modal', async ({ page }) => {
  await ready(page)

  const sidebar = page.locator('aside .flex-1.overflow-auto')
  const firstItem = sidebar.locator('button').first()
  const communityName = await firstItem.locator('.text-sm').first().textContent()

  await firstItem.click()
  await page.waitForTimeout(500)

  // Modal should be visible
  const modal = page.locator('.rounded-2xl.shadow-2xl')
  await expect(modal).toBeVisible()

  // Modal should contain the community name
  await expect(modal).toContainText(communityName.trim())

  // Modal should have description text
  const description = modal.locator('p.text-sm.text-gray-600')
  await expect(description).toBeVisible()
  const descText = await description.textContent()
  expect(descText.length).toBeGreaterThan(20)
})

// ─── 10. Detail modal closes cleanly ────────────────────────────────────────

test('10 — detail modal closes via X button and backdrop click', async ({ page }) => {
  await ready(page)

  // Open modal via sidebar click
  const sidebar = page.locator('aside .flex-1.overflow-auto')
  await sidebar.locator('button').first().click()
  await page.waitForTimeout(500)

  const modal = page.locator('.rounded-2xl.shadow-2xl')
  await expect(modal).toBeVisible()

  // Close via X button
  await modal.locator('button').filter({ has: page.locator('svg') }).first().click()
  await page.waitForTimeout(300)
  await expect(modal).not.toBeVisible()

  // Re-open
  await sidebar.locator('button').first().click()
  await page.waitForTimeout(500)
  await expect(modal).toBeVisible()

  // Close via backdrop click
  const backdrop = page.locator('.fixed.inset-0.bg-black\\/30')
  await backdrop.click({ position: { x: 50, y: 50 } })
  await page.waitForTimeout(300)
  await expect(modal).not.toBeVisible()
})

// ─── 11. Clicking a map pin opens detail modal ──────────────────────────────

test('11 — clicking a map pin shows popup, Details link opens modal', async ({ page }) => {
  await ready(page)

  // Filter to a small set so pins are easy to target
  await page.fill('input[placeholder="Search..."]', 'AI Tinkerers Geneva')
  await page.waitForTimeout(800)

  // There should be a pin on the map
  const pins = page.locator('.leaflet-interactive')
  const pinCount = await pins.count()
  expect(pinCount).toBeGreaterThan(0)

  // Click the pin — should open popup, NOT modal
  await pins.first().click()
  await page.waitForTimeout(500)

  // Popup should be visible with community name
  const popup = page.locator('.leaflet-popup-content')
  await expect(popup).toBeVisible({ timeout: 3000 })
  await expect(popup).toContainText('Geneva')

  // Modal should NOT be open yet
  const modal = page.locator('.rounded-2xl.shadow-2xl')
  await expect(modal).not.toBeVisible()

  // Click "Details" link inside popup to open modal
  await popup.locator('a[data-detail-id]').click()
  await page.waitForTimeout(500)

  await expect(modal).toBeVisible({ timeout: 3000 })
  await expect(modal).toContainText('Geneva')
})

// ─── 12. Clear filters restores full list ───────────────────────────────────

test('12 — clear filters restores all communities', async ({ page }) => {
  await ready(page)

  // Apply search filter
  await page.fill('input[placeholder="Search..."]', 'London')
  await page.waitForTimeout(500)

  const filteredCount = await page.locator('.leaflet-interactive').count()

  // Click clear button
  const clearButton = page.locator('button', { hasText: 'Clear' })
  await expect(clearButton).toBeVisible()
  await clearButton.click()
  await page.waitForTimeout(500)

  // Pins should be back to full count
  const fullCount = await page.locator('.leaflet-interactive').count()
  expect(fullCount).toBeGreaterThan(filteredCount)

  // Search input should be empty
  const searchValue = await page.inputValue('input[placeholder="Search..."]')
  expect(searchValue).toBe('')
})
