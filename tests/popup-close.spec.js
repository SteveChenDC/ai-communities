/**
 * Test: The map popup and detail modal must NEVER be visible at the same time.
 * Tests all paths that open the detail modal while a popup might be open.
 */
import { test, expect } from '@playwright/test'

const ready = async (page) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-container', { timeout: 10000 })
  await page.waitForTimeout(1500)
}

const openPopupOnGeneva = async (page) => {
  await page.fill('input[placeholder="Search..."]', 'AI Tinkerers Geneva')
  await page.waitForTimeout(800)
  const pins = page.locator('.leaflet-interactive')
  await pins.first().click()
  await page.waitForTimeout(500)
  await expect(page.locator('.leaflet-popup')).toBeVisible({ timeout: 3000 })
}

test('A — clicking "Details" in popup closes popup before opening modal', async ({ page }) => {
  await ready(page)
  await openPopupOnGeneva(page)

  await page.screenshot({ path: 'tests/screenshots/A1-popup-open.png' })

  await page.locator('.leaflet-popup-content a[data-detail-id]').click()
  await page.waitForTimeout(800)

  await page.screenshot({ path: 'tests/screenshots/A2-after-details.png' })

  await expect(page.locator('.rounded-2xl.shadow-2xl')).toBeVisible()
  await expect(page.locator('.leaflet-popup')).toHaveCount(0)
})

test('B — clicking sidebar community while popup is open closes popup', async ({ page }) => {
  await ready(page)
  await openPopupOnGeneva(page)

  await page.screenshot({ path: 'tests/screenshots/B1-popup-before-sidebar.png' })

  // Click a community in the sidebar
  const sidebar = page.locator('aside .flex-1.overflow-auto')
  await sidebar.locator('button').first().click()
  await page.waitForTimeout(800)

  await page.screenshot({ path: 'tests/screenshots/B2-after-sidebar-click.png' })

  await expect(page.locator('.rounded-2xl.shadow-2xl')).toBeVisible()
  const popupCount = await page.locator('.leaflet-popup').count()
  expect(popupCount, 'Popup should close when modal opens from sidebar').toBe(0)
})

test('C — clicking sidebar event while popup is open closes popup', async ({ page }) => {
  await ready(page)

  // First open a popup on Geneva
  await openPopupOnGeneva(page)

  // Clear search to see all events in sidebar
  await page.fill('input[placeholder="Search..."]', '')
  await page.waitForTimeout(500)

  // Re-open popup (clearing search re-renders pins)
  await page.fill('input[placeholder="Search..."]', 'AI Tinkerers Geneva')
  await page.waitForTimeout(800)
  const pins = page.locator('.leaflet-interactive')
  await pins.first().click()
  await page.waitForTimeout(500)

  await page.screenshot({ path: 'tests/screenshots/C1-popup-before-event.png' })

  // Clear search again so events section is visible
  await page.fill('input[placeholder="Search..."]', '')
  await page.waitForTimeout(500)

  // Click an event in the sidebar
  const eventSection = page.locator('aside .border-b')
  const eventButtons = eventSection.locator('button')
  const eventCount = await eventButtons.count()
  expect(eventCount).toBeGreaterThan(0)

  await eventButtons.first().click()
  await page.waitForTimeout(800)

  await page.screenshot({ path: 'tests/screenshots/C2-after-event-click.png' })

  await expect(page.locator('.rounded-2xl.shadow-2xl')).toBeVisible()
  const popupCount = await page.locator('.leaflet-popup').count()
  expect(popupCount, 'Popup should close when modal opens from event click').toBe(0)
})
