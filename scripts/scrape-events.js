#!/usr/bin/env node
import {
  createContext,
  formatEvent,
  launchBrowser,
  loadCommunities,
  normalizeDate,
  saveCommunities,
  sleep,
  withRetry,
} from './scraper-utils.js'

function absoluteUrl(base, maybeRelative) {
  if (!maybeRelative) return null
  try {
    return new URL(maybeRelative, base).toString()
  } catch {
    return maybeRelative
  }
}

function parseArgs(argv) {
  const args = { network: null, region: null, id: null, dryRun: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--network') args.network = argv[++i]
    else if (token === '--region') args.region = argv[++i]
    else if (token === '--id') args.id = argv[++i]
    else if (token === '--dry-run') args.dryRun = true
  }
  return args
}

function communityMatches(community, filters) {
  if (filters.id && community.id !== filters.id) return false
  if (filters.region && community.regionId !== filters.region) return false
  if (filters.network) {
    const network = filters.network.toLowerCase()
    if (!(community.name || '').toLowerCase().includes(network)) return false
  }
  return true
}

function getUrls(community) {
  const urls = []
  if (typeof community.url === 'string' && /^https?:\/\//i.test(community.url)) urls.push(community.url)
  if (Array.isArray(community.urls)) {
    for (const url of community.urls) {
      if (typeof url === 'string' && /^https?:\/\//i.test(url) && !urls.includes(url)) urls.push(url)
    }
  }
  return urls
}

function isFutureDate(yyyyMmDd) {
  return yyyyMmDd >= new Date().toISOString().slice(0, 10)
}

function dedupeSortEvents(events) {
  const byKey = new Map()
  for (const ev of events) {
    if (!ev?.date) continue
    if (!isFutureDate(ev.date)) continue
    const key = `${ev.date}|${ev.url || ''}`
    if (!byKey.has(key)) byKey.set(key, ev)
  }
  return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function flattenEventNode(node, out = []) {
  if (!node) return out
  if (Array.isArray(node)) {
    for (const item of node) flattenEventNode(item, out)
    return out
  }
  if (typeof node !== 'object') return out

  const type = node['@type']
  const isEvent =
    type === 'Event' ||
    (Array.isArray(type) && type.includes('Event')) ||
    node.startDate ||
    node.eventStatus

  if (isEvent) out.push(node)
  for (const value of Object.values(node)) flattenEventNode(value, out)
  return out
}

async function extractEventsFromJsonLd(page, pageUrl) {
  const jsonPayloads = await page.$$eval('script[type="application/ld+json"]', (scripts) =>
    scripts.map((s) => s.textContent || '').filter(Boolean)
  )
  const out = []
  for (const payload of jsonPayloads) {
    try {
      const parsed = JSON.parse(payload)
      const events = flattenEventNode(parsed)
      for (const eventObj of events) {
        const dateRaw = eventObj.startDate || eventObj.doorTime || eventObj.endDate || ''
        const normalized = normalizeDate(dateRaw)
        if (!normalized) continue
        const url = absoluteUrl(pageUrl, eventObj.url || eventObj.offers?.url || eventObj.mainEntityOfPage)
        const displayRaw = typeof dateRaw === 'string' ? dateRaw : normalized
        const ev = formatEvent(normalized, displayRaw, url || undefined)
        if (ev) out.push(ev)
      }
    } catch {
      // Ignore non-JSON or invalid JSON-LD blocks.
    }
  }
  return dedupeSortEvents(out)
}

async function dismissOverlays(page) {
  const candidates = ['button:has-text("Accept")', 'button:has-text("Accept all")', 'button:has-text("I agree")']
  for (const selector of candidates) {
    const button = page.locator(selector).first()
    if (await button.count()) {
      await button.click({ timeout: 1000 }).catch(() => {})
    }
  }
  await page.keyboard.press('Escape').catch(() => {})
}

function parseDateFromText(text) {
  const direct = normalizeDate(text)
  if (direct) return direct

  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (isoMatch) return normalizeDate(isoMatch[1])

  const lineMatch = text.match(
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\,?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i
  )
  if (lineMatch) return normalizeDate(lineMatch[0])

  return null
}

async function scrapeMeetupEvents(page, url) {
  await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
  await dismissOverlays(page)
  const fromJsonLd = await extractEventsFromJsonLd(page, url)
  if (fromJsonLd.length) return fromJsonLd
  await page.waitForSelector('a[href*="/events/"], [data-event-label], time', { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const cards = await page.$$eval('a[href*="/events/"], [data-event-label], article, li, time', (nodes) =>
    nodes.slice(0, 80).map((n) => ({
      text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
      href:
        n.tagName.toLowerCase() === 'a'
          ? n.href
          : n.querySelector('a[href*="/events/"]')?.href || '',
    }))
  )
  const out = []
  for (const card of cards) {
    if (!card.text) continue
    const date = parseDateFromText(card.text)
    if (!date) continue
    const event = formatEvent(date, card.text, absoluteUrl(url, card.href) || undefined)
    if (event) out.push(event)
  }
  return dedupeSortEvents(out)
}

async function scrapeLumaEvents(page, url) {
  await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
  const fromJsonLd = await extractEventsFromJsonLd(page, url)
  if (fromJsonLd.length) return fromJsonLd
  await page.waitForSelector('a[href*="/event"], [class*="event"], [class*="calendar"], article', { timeout: 12000 })
  await page.waitForTimeout(1200)
  const cards = await page.$$eval('a[href*="/event"], article, [class*="event"], [class*="calendar"]', (nodes) =>
    nodes.slice(0, 120).map((n) => ({
      text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
      href: n instanceof HTMLAnchorElement ? n.href : n.querySelector('a')?.href || '',
    }))
  )
  const out = []
  for (const card of cards) {
    const date = parseDateFromText(card.text)
    if (!date) continue
    const event = formatEvent(date, card.text, absoluteUrl(url, card.href) || undefined)
    if (event) out.push(event)
  }
  return dedupeSortEvents(out)
}

async function scrapeAicampEvents(page, url) {
  if (url.includes('meetup.com')) return scrapeMeetupEvents(page, url)
  await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
  const fromJsonLd = await extractEventsFromJsonLd(page, url)
  if (fromJsonLd.length) return fromJsonLd
  await page.waitForTimeout(2000)
  const rows = await page.$$eval('a[href], article, li, div', (nodes) =>
    nodes.slice(0, 200).map((n) => ({
      text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
      href: n.querySelector('a')?.href || '',
    }))
  )
  const out = []
  for (const row of rows) {
    const date = parseDateFromText(row.text)
    if (!date) continue
    const event = formatEvent(date, row.text, absoluteUrl(url, row.href) || undefined)
    if (event) out.push(event)
  }
  return dedupeSortEvents(out)
}

async function scrapeAiTinkerersEvents(page, url) {
  await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const lumaUrl = await page.$eval('a[href*="lu.ma"]', (a) => a.href).catch(() => null)
  if (lumaUrl) return scrapeLumaEvents(page, lumaUrl)
  const meetupUrl = await page.$eval('a[href*="meetup.com"]', (a) => a.href).catch(() => null)
  if (meetupUrl) return scrapeMeetupEvents(page, meetupUrl)
  return scrapeGenericEvents(page, url)
}

async function scrapeGenericEvents(page, url) {
  await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
  const fromJsonLd = await extractEventsFromJsonLd(page, url)
  if (fromJsonLd.length) return fromJsonLd
  await page.waitForTimeout(1500)
  const chunks = await page.$$eval('a, article, li, section, div', (nodes) =>
    nodes.slice(0, 200).map((n) => ({
      text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
      href: n.querySelector('a')?.href || '',
    }))
  )
  const out = []
  for (const chunk of chunks) {
    if (!/(event|register|rsvp|meetup|talk|workshop)/i.test(chunk.text)) continue
    const date = parseDateFromText(chunk.text)
    if (!date) continue
    const event = formatEvent(date, chunk.text, absoluteUrl(url, chunk.href) || undefined)
    if (event) out.push(event)
  }
  return dedupeSortEvents(out)
}

function pickScraper(url) {
  const u = (url || '').toLowerCase()
  if (u.includes('meetup.com')) return scrapeMeetupEvents
  if (u.includes('lu.ma') || u.includes('luma.com')) return scrapeLumaEvents
  if (u.includes('aicamp.ai')) return scrapeAicampEvents
  if (u.includes('aitinkerers.org')) return scrapeAiTinkerersEvents
  return scrapeGenericEvents
}

async function main() {
  const filters = parseArgs(process.argv.slice(2))
  const data = loadCommunities()
  const targets = data.communities.filter((c) => communityMatches(c, filters))

  const browser = await launchBrowser({ headless: true, slowMo: 100 })
  const context = await createContext(browser)
  context.setDefaultNavigationTimeout(15000)
  const page = await context.newPage()

  try {
    for (let i = 0; i < targets.length; i += 1) {
      const community = targets[i]
      const urls = getUrls(community)
      let events = []

      for (const url of urls) {
        const scraper = pickScraper(url)
        let platform = url
        try {
          platform = url.includes('://') ? new URL(url).hostname : url
        } catch {
          console.warn(`[${i + 1}/${targets.length}] ${community.name}... skipped invalid URL: ${url}`)
          continue
        }
        const result = await withRetry(
          () => scraper(page, url),
          { maxRetries: 2, delayMs: 2000, label: `scrape-${community.id}` }
        )
        if (result?.length) {
          events = result
          console.log(`[${i + 1}/${targets.length}] ${community.name} (${platform})... ${events.length} events`)
          break
        }
        await sleep(500)
      }

      if (!events.length) {
        console.warn(`[${i + 1}/${targets.length}] ${community.name}... 0 events`)
      }
      const previousEvents = Array.isArray(community.events) ? community.events : []
      const freshEvents = dedupeSortEvents(events)
      if (freshEvents.length > 0) {
        community.events = freshEvents
      } else if (previousEvents.length > 0) {
        // Preserve previously known events when scraping fails or returns nothing.
        community.events = previousEvents
      } else {
        community.events = []
      }
      await sleep(150 + Math.floor(Math.random() * 350))
    }
  } finally {
    await context.close()
    await browser.close()
  }

  if (filters.dryRun) {
    console.log('\nDry run complete; no file written.')
    return
  }

  saveCommunities(data)
  console.log('\nEvent scraping complete; communities.json updated.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
