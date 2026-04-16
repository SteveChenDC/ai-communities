#!/usr/bin/env node
import {
  createContext,
  formatEvent,
  isValidEvent,
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
  const args = { network: null, region: null, id: null, dryRun: false, includePast: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--network') args.network = argv[++i]
    else if (token === '--region') args.region = argv[++i]
    else if (token === '--id') args.id = argv[++i]
    else if (token === '--dry-run') args.dryRun = true
    else if (token === '--include-past') args.includePast = true
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

function getCutoffDate(includePast) {
  if (!includePast) return new Date().toISOString().slice(0, 10)
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

let CUTOFF_DATE = new Date().toISOString().slice(0, 10)

function isAfterCutoff(yyyyMmDd) {
  return yyyyMmDd >= CUTOFF_DATE
}

function dedupeSortEvents(events) {
  const byKey = new Map()
  for (const ev of events) {
    if (!ev?.date) continue
    if (!isAfterCutoff(ev.date)) continue
    if (!isValidEvent(ev)) continue
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

async function scrapeMeetupPage(page, url) {
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
  return out
}

async function scrapeMeetupEvents(page, url) {
  // Scrape upcoming events
  const upcoming = await scrapeMeetupPage(page, url)

  // If --include-past, also scrape the past events page
  if (CUTOFF_DATE < new Date().toISOString().slice(0, 10)) {
    try {
      const pastUrl = url.replace(/\/$/, '') + '/events/past/'
      const past = await scrapeMeetupPage(page, pastUrl)
      upcoming.push(...past)
    } catch { /* past page may not exist */ }
  }

  return dedupeSortEvents(upcoming)
}

async function scrapeLumaPage(page, url) {
  await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
  const fromJsonLd = await extractEventsFromJsonLd(page, url)
  if (fromJsonLd.length) return fromJsonLd
  await page.waitForSelector('a[href*="/event"], [class*="event"], [class*="calendar"], article', { timeout: 12000 }).catch(() => {})
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
  return out
}

async function scrapeLumaEvents(page, url) {
  const upcoming = await scrapeLumaPage(page, url)

  // If --include-past, also try the past events tab
  if (CUTOFF_DATE < new Date().toISOString().slice(0, 10)) {
    try {
      // Luma past events are often at /past or by clicking a "Past" tab
      const pastTab = page.locator('button:has-text("Past"), a:has-text("Past events"), [data-tab="past"]').first()
      if (await pastTab.count()) {
        await pastTab.click({ timeout: 3000 })
        await page.waitForTimeout(1500)
        const pastCards = await page.$$eval('a[href*="/event"], article, [class*="event"]', (nodes) =>
          nodes.slice(0, 120).map((n) => ({
            text: (n.textContent || '').replace(/\s+/g, ' ').trim(),
            href: n instanceof HTMLAnchorElement ? n.href : n.querySelector('a')?.href || '',
          }))
        )
        for (const card of pastCards) {
          const date = parseDateFromText(card.text)
          if (!date) continue
          const event = formatEvent(date, card.text, absoluteUrl(url, card.href) || undefined)
          if (event) upcoming.push(event)
        }
      }
    } catch { /* past tab may not exist */ }
  }

  return dedupeSortEvents(upcoming)
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

  // Set global cutoff date
  CUTOFF_DATE = getCutoffDate(filters.includePast)
  const today = new Date().toISOString().slice(0, 10)

  if (filters.includePast) {
    console.log(`Including past events back to ${CUTOFF_DATE}\n`)
  }

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
          const futureCount = events.filter(e => e.date >= today).length
          const pastCount = events.length - futureCount
          const label = pastCount > 0 ? `${futureCount} upcoming, ${pastCount} past` : `${events.length} events`
          console.log(`[${i + 1}/${targets.length}] ${community.name} (${platform})... ${label}`)
          break
        }
        await sleep(500)
      }

      if (!events.length) {
        console.warn(`[${i + 1}/${targets.length}] ${community.name}... 0 events`)
      }
      const previousEvents = Array.isArray(community.events) ? community.events : []
      const previousPastEvents = Array.isArray(community.pastEvents) ? community.pastEvents : []
      const freshEvents = dedupeSortEvents(events)

      if (freshEvents.length > 0) {
        // Split into upcoming and past
        community.events = freshEvents.filter(e => e.date >= today)
        if (filters.includePast) {
          const newPast = freshEvents.filter(e => e.date < today)
          // Merge with existing past events, dedup by date+url
          const pastMap = new Map()
          for (const ev of previousPastEvents) pastMap.set(`${ev.date}|${ev.url || ''}`, ev)
          for (const ev of newPast) pastMap.set(`${ev.date}|${ev.url || ''}`, ev)
          community.pastEvents = [...pastMap.values()].sort((a, b) => b.date.localeCompare(a.date))
        }
      } else if (previousEvents.length > 0) {
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

  // --- Bond AI aggregator pass ---
  // Bond AI curates lu.ma city calendars that aggregate events from many communities.
  // Scrape each calendar and attribute events to communities in the matching region.
  if (!filters.id && !filters.network) {
    const BOND_CALENDARS = [
      { url: 'https://luma.com/genai-sf', regionId: 'sf-bay-area' },
      { url: 'https://luma.com/genai-ny', regionId: 'nyc' },
      { url: 'https://luma.com/bond-seattle', regionId: 'seattle' },
      { url: 'https://luma.com/bond-paris', regionId: 'paris' },
      { url: 'https://luma.com/bond-london', regionId: 'london' },
      { url: 'https://luma.com/bond-berlin', regionId: 'berlin' },
    ]

    const aggBrowser = await launchBrowser({ headless: true, slowMo: 100 })
    const aggContext = await createContext(aggBrowser)
    const aggPage = await aggContext.newPage()

    console.log('\n--- Bond AI aggregator pass ---')
    for (const cal of BOND_CALENDARS) {
      try {
        const events = await withRetry(
          () => scrapeLumaEvents(aggPage, cal.url),
          { maxRetries: 2, delayMs: 2000, label: `bond-${cal.regionId}` }
        )
        if (!events?.length) {
          console.log(`[Bond ${cal.regionId}] 0 events`)
          continue
        }
        // Log regional calendar events for reference but do NOT blindly assign
        // them to communities that have 0 events. The previous approach incorrectly
        // gave every community in a region the same generic calendar events.
        console.log(`[Bond ${cal.regionId}] ${events.length} events found (logged only, not assigned)`)
      } catch (err) {
        console.warn(`[Bond ${cal.regionId}] error: ${err.message}`)
      }
      await sleep(500)
    }

    await aggContext.close()
    await aggBrowser.close()
  }

  // --- Data integrity pass ---
  // Final validation before saving. Catches issues that slip through individual scrapers.
  //
  // ROOT CAUSE of bogus dates: scrapers find dates on pages that aren't actual events:
  //   - Meetup shows today's date as a "suggest new event" placeholder (<time> element)
  //   - Aggregator calendars (lu.ma, aitinkerers.org) list other communities' events
  //   - Page text mentions dates in descriptions, headers, or footers
  //
  // RULE: An event MUST have an event-specific URL to be trusted. A date without a
  // clickable link to that specific event is unverifiable and must be dropped.
  console.log('\n--- Data integrity pass ---')
  let integrityRemoved = 0
  let integrityFlagged = 0

  for (const community of data.communities) {
    const before = community.events.length

    // 1. Remove events that fail validation
    community.events = community.events.filter(ev => isValidEvent(ev))

    // 2. Remove events with dateRaw that's clearly page text (>80 chars)
    community.events = community.events.filter(ev => (ev.dateRaw || '').length <= 80)

    // 3. CRITICAL: Remove ALL events without event-specific URLs.
    //    A date without a URL is unverifiable -- it could be a Meetup placeholder,
    //    an aggregator showing other communities' events, or scraped page chrome.
    //    If a user clicks an event, it MUST link to a real event page.
    community.events = community.events.filter(ev => ev.url)

    const removed = before - community.events.length
    integrityRemoved += removed

    // Same for pastEvents
    if (Array.isArray(community.pastEvents)) {
      const pastBefore = community.pastEvents.length
      community.pastEvents = community.pastEvents.filter(ev => isValidEvent(ev))
      community.pastEvents = community.pastEvents.filter(ev => (ev.dateRaw || '').length <= 80)
      community.pastEvents = community.pastEvents.filter(ev => ev.url)
      integrityRemoved += pastBefore - community.pastEvents.length
    }
  }

  // 4. Detect events whose URL is just the community's homepage (not event-specific).
  //    e.g. url=https://aitinkerers.org/ is the homepage, not an event page.
  for (const community of data.communities) {
    const homeUrls = new Set()
    if (community.url) homeUrls.add(community.url.replace(/\/$/, ''))
    for (const u of community.urls || []) homeUrls.add(u.replace(/\/$/, ''))

    const beforeHome = community.events.length
    community.events = community.events.filter(ev => {
      const evUrl = (ev.url || '').replace(/\/$/, '')
      const evUrlNoQuery = evUrl.split('?')[0]
      const evUrlBase = evUrlNoQuery.replace(/\/$/, '')
      // Must have an event-specific path like /events/123 or /p/event-slug
      if (/\/(events?|p)\/[^/]/.test(evUrl)) return true
      // Reject if the URL (ignoring query params) matches any community home URL
      if (homeUrls.has(evUrlBase)) return false
      // Reject if the URL is a subpage of the homepage that isn't event-specific
      // (e.g. /all_cities, /about, /contact)
      for (const home of homeUrls) {
        if (evUrlBase.startsWith(home) && !/\/(events?|p)\//.test(evUrlBase)) return false
      }
      return true
    })
    integrityRemoved += beforeHome - community.events.length

    if (Array.isArray(community.pastEvents)) {
      const pastBefore = community.pastEvents.length
      community.pastEvents = community.pastEvents.filter(ev => {
        const evUrl = (ev.url || '').replace(/\/$/, '')
        const evUrlNoQuery = evUrl.split('?')[0]
        const evUrlBase = evUrlNoQuery.replace(/\/$/, '')
        if (/\/(events?|p)\/[^/]/.test(evUrl)) return true
        if (homeUrls.has(evUrlBase)) return false
        for (const home of homeUrls) {
          if (evUrlBase.startsWith(home) && !/\/(events?|p)\//.test(evUrlBase)) return false
        }
        return true
      })
      integrityRemoved += pastBefore - community.pastEvents.length
    }
  }

  // 5. Detect shared-date anomalies (legacy check, now less needed with URL requirement)
  const dateRegionMap = new Map()
  for (const c of data.communities) {
    for (const ev of c.events) {
      if (!ev.url) {
        const key = `${ev.date}|${c.regionId}`
        if (!dateRegionMap.has(key)) dateRegionMap.set(key, [])
        dateRegionMap.get(key).push(c.id)
      }
    }
  }
  for (const [key, ids] of dateRegionMap) {
    if (ids.length >= 5) {
      const [date] = key.split('|')
      for (const id of ids) {
        const c = data.communities.find(x => x.id === id)
        if (c) {
          const before = c.events.length
          c.events = c.events.filter(ev => !(ev.date === date && !ev.url))
          integrityRemoved += before - c.events.length
        }
      }
      integrityFlagged++
    }
  }

  console.log(`Integrity check: removed ${integrityRemoved} suspicious events, flagged ${integrityFlagged} shared-date anomalies`)

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
