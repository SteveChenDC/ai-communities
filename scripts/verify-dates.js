#!/usr/bin/env node
/**
 * verify-dates.js
 *
 * Verifies event dates in communities.json by visiting each community's URL
 * and comparing scraped dates against stored dates. Reports mismatches.
 *
 * Usage:
 *   node scripts/verify-dates.js                    # verify all communities with events
 *   node scripts/verify-dates.js --region sf-bay-area  # verify one region
 *   node scripts/verify-dates.js --id sf-python     # verify one community
 *   node scripts/verify-dates.js --fix              # remove unverified events
 *   node scripts/verify-dates.js --report-only      # skip scraping, just analyze stored data
 */
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

function parseArgs(argv) {
  const args = { region: null, id: null, fix: false, reportOnly: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--region') args.region = argv[++i]
    else if (token === '--id') args.id = argv[++i]
    else if (token === '--fix') args.fix = true
    else if (token === '--report-only') args.reportOnly = true
  }
  return args
}

/* ── Static analysis (no browser needed) ── */

function analyzeStoredData(communities) {
  const issues = []

  // 1. Find events shared across multiple communities (Bond aggregator signature)
  const dateRegionMap = new Map() // "date|regionId" -> [community names]
  for (const c of communities) {
    for (const ev of c.events) {
      if (!ev.url) {
        const key = `${ev.date}|${c.regionId}`
        if (!dateRegionMap.has(key)) dateRegionMap.set(key, [])
        dateRegionMap.get(key).push(c.name)
      }
    }
  }

  // Flag dates shared by 3+ communities in a region without individual URLs
  const suspiciousDates = new Map()
  for (const [key, names] of dateRegionMap) {
    if (names.length >= 3) {
      const [date, regionId] = key.split('|')
      if (!suspiciousDates.has(regionId)) suspiciousDates.set(regionId, [])
      suspiciousDates.get(regionId).push({ date, count: names.length, communities: names })
    }
  }

  // 2. Find events with suspicious dateRaw patterns
  for (const c of communities) {
    for (const ev of c.events) {
      // T08:00:00 pattern = likely a lu.ma calendar page load timestamp, not a real event time
      if (/T08:00:00/.test(ev.dateRaw) && !ev.url) {
        issues.push({
          type: 'suspicious-timestamp',
          community: c.name,
          id: c.id,
          regionId: c.regionId,
          date: ev.date,
          dateRaw: ev.dateRaw,
          reason: 'dateRaw has T08:00:00 pattern without event URL (likely aggregator artifact)',
        })
      }

      // Two events on consecutive days from same T-date (UTC shift artifact)
      if (/T1[7-9]:00:00|T2[0-3]:00:00/.test(ev.dateRaw) && !ev.url) {
        issues.push({
          type: 'utc-shift',
          community: c.name,
          id: c.id,
          regionId: c.regionId,
          date: ev.date,
          dateRaw: ev.dateRaw,
          reason: 'Late-day timestamp shifted to next day via UTC conversion',
        })
      }

      // Very long dateRaw (scraped page text, not a real date)
      if (ev.dateRaw && ev.dateRaw.length > 100) {
        issues.push({
          type: 'raw-text-dump',
          community: c.name,
          id: c.id,
          regionId: c.regionId,
          date: ev.date,
          dateRaw: ev.dateRaw.slice(0, 80) + '...',
          reason: 'dateRaw is a page text dump, not a proper date string',
        })
      }

      // Past events (before today)
      const today = new Date().toISOString().slice(0, 10)
      if (ev.date < today) {
        issues.push({
          type: 'past-event',
          community: c.name,
          id: c.id,
          regionId: c.regionId,
          date: ev.date,
          reason: 'Event date is in the past',
        })
      }
    }
  }

  return { issues, suspiciousDates }
}

/* ── Live verification (browser-based) ── */

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

async function scrapeEventsFromUrl(page, url) {
  try {
    await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
  } catch {
    return { events: [], error: 'timeout' }
  }
  await page.waitForTimeout(1500)

  // Try JSON-LD first
  const jsonPayloads = await page.$$eval('script[type="application/ld+json"]', (scripts) =>
    scripts.map((s) => s.textContent || '').filter(Boolean)
  ).catch(() => [])

  const events = []
  for (const payload of jsonPayloads) {
    try {
      const parsed = JSON.parse(payload)
      const nodes = flattenForDates(parsed)
      for (const node of nodes) {
        const dateRaw = node.startDate || node.doorTime || ''
        const d = normalizeDate(dateRaw)
        if (d) events.push({ date: d, url: node.url || undefined, source: 'json-ld' })
      }
    } catch { /* skip */ }
  }
  if (events.length) return { events, error: null }

  // Fall back to DOM scraping
  const cards = await page.$$eval('a[href*="/events/"], [data-event-label], time, article', (nodes) =>
    nodes.slice(0, 80).map((n) => ({
      text: (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      href: n.tagName.toLowerCase() === 'a' ? n.href : n.querySelector('a')?.href || '',
    }))
  ).catch(() => [])

  for (const card of cards) {
    const d = parseDateFromText(card.text)
    if (d) events.push({ date: d, url: card.href || undefined, source: 'dom' })
  }

  return { events, error: null }
}

function flattenForDates(node, out = []) {
  if (!node) return out
  if (Array.isArray(node)) { for (const item of node) flattenForDates(item, out); return out }
  if (typeof node !== 'object') return out
  if (node.startDate || node['@type'] === 'Event') out.push(node)
  for (const value of Object.values(node)) flattenForDates(value, out)
  return out
}

async function verifyLive(communities, filters) {
  const browser = await launchBrowser({ headless: true, slowMo: 50 })
  const context = await createContext(browser)
  const page = await context.newPage()
  const results = []

  const targets = communities.filter((c) => {
    if (filters.id && c.id !== filters.id) return false
    if (filters.region && c.regionId !== filters.region) return false
    return c.events.length > 0
  })

  console.log(`\nVerifying ${targets.length} communities with events...\n`)

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i]
    const url = c.url || c.urls?.[0]
    if (!url) {
      results.push({ id: c.id, name: c.name, status: 'no-url', storedDates: c.events.map(e => e.date), scrapedDates: [] })
      continue
    }

    const scraped = await withRetry(
      () => scrapeEventsFromUrl(page, url),
      { maxRetries: 2, delayMs: 1000, label: c.id }
    )

    const scrapedDates = [...new Set((scraped?.events || []).map(e => e.date))].sort()
    const storedDates = [...new Set(c.events.map(e => e.date))].sort()

    const matching = storedDates.filter(d => scrapedDates.includes(d))
    const onlyStored = storedDates.filter(d => !scrapedDates.includes(d))
    const onlyScraped = scrapedDates.filter(d => !storedDates.includes(d))

    const status = scraped?.error
      ? 'error'
      : onlyStored.length === 0 && onlyScraped.length === 0
        ? 'match'
        : onlyStored.length > 0 && scrapedDates.length === 0
          ? 'unverified'
          : 'mismatch'

    const icon = status === 'match' ? '\u2705' : status === 'unverified' ? '\u274c' : status === 'mismatch' ? '\u26a0\ufe0f' : '\u2753'
    console.log(`[${i + 1}/${targets.length}] ${icon} ${c.name} — stored: ${storedDates.length}, scraped: ${scrapedDates.length}${onlyStored.length ? `, unverified: ${onlyStored.length}` : ''}`)

    results.push({
      id: c.id,
      name: c.name,
      regionId: c.regionId,
      url,
      status,
      storedDates,
      scrapedDates,
      matching,
      onlyStored,
      onlyScraped,
    })

    await sleep(200 + Math.floor(Math.random() * 300))
  }

  await context.close()
  await browser.close()

  return results
}

/* ── Fix mode: remove unverified events ── */

function applyFixes(data, verifyResults) {
  let removed = 0
  for (const result of verifyResults) {
    if (result.status !== 'unverified' && result.status !== 'mismatch') continue

    const community = data.communities.find(c => c.id === result.id)
    if (!community) continue

    // Keep only events that were verified by live scraping or have their own URL
    const before = community.events.length
    community.events = community.events.filter(ev => {
      // Keep events with a direct URL (scraped from the community's own page)
      if (ev.url) return true
      // Keep events whose dates were found on the live page
      if (result.scrapedDates.includes(ev.date)) return true
      // Remove everything else (Bond aggregator artifacts, etc.)
      return false
    })
    removed += before - community.events.length
  }
  return removed
}

/* ── Main ── */

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const data = loadCommunities()

  console.log('=== Event Date Verification Report ===\n')
  console.log(`Communities: ${data.communities.length}`)
  console.log(`Total events: ${data.communities.reduce((n, c) => n + c.events.length, 0)}`)
  console.log(`Today: ${new Date().toISOString().slice(0, 10)}`)

  // Phase 1: Static analysis
  console.log('\n--- Phase 1: Static Analysis ---\n')
  const { issues, suspiciousDates } = analyzeStoredData(data.communities)

  if (suspiciousDates.size) {
    console.log('Suspicious shared dates (likely Bond aggregator artifacts):')
    for (const [regionId, entries] of suspiciousDates) {
      for (const entry of entries) {
        console.log(`  ${regionId}: ${entry.date} shared by ${entry.count} communities`)
      }
    }
    console.log()
  }

  const byType = {}
  for (const issue of issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1
  }
  console.log('Issue summary:')
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`)
  }

  if (args.reportOnly) {
    console.log('\n--- Detailed Issues ---\n')
    for (const issue of issues) {
      console.log(`[${issue.type}] ${issue.community} (${issue.regionId}): ${issue.date} — ${issue.reason}`)
    }
    return
  }

  // Phase 2: Live verification
  console.log('\n--- Phase 2: Live Verification ---\n')
  const results = await verifyLive(data.communities, args)

  // Summary
  const summary = { match: 0, mismatch: 0, unverified: 0, error: 0, 'no-url': 0 }
  for (const r of results) summary[r.status] = (summary[r.status] || 0) + 1

  console.log('\n--- Verification Summary ---\n')
  console.log(`  Verified (match):   ${summary.match}`)
  console.log(`  Mismatched:         ${summary.mismatch}`)
  console.log(`  Unverified (0 live): ${summary.unverified}`)
  console.log(`  Errors:             ${summary.error}`)
  console.log(`  No URL:             ${summary['no-url']}`)

  // Show unverified communities
  const unverified = results.filter(r => r.status === 'unverified')
  if (unverified.length) {
    console.log(`\nUnverified communities (stored dates not found on live page):`)
    for (const r of unverified) {
      console.log(`  ${r.name} (${r.regionId}): ${r.storedDates.join(', ')} — ${r.url}`)
    }
  }

  const mismatched = results.filter(r => r.status === 'mismatch')
  if (mismatched.length) {
    console.log(`\nMismatched communities:`)
    for (const r of mismatched) {
      console.log(`  ${r.name} (${r.regionId}):`)
      if (r.onlyStored.length) console.log(`    Stored but not found live: ${r.onlyStored.join(', ')}`)
      if (r.onlyScraped.length) console.log(`    Found live but not stored: ${r.onlyScraped.join(', ')}`)
    }
  }

  // Phase 3: Fix mode
  if (args.fix) {
    console.log('\n--- Phase 3: Applying Fixes ---\n')
    const removed = applyFixes(data, results)
    console.log(`Removed ${removed} unverified events`)
    saveCommunities(data)
    console.log('communities.json updated.')
  } else if (unverified.length || mismatched.length) {
    console.log('\nRun with --fix to remove unverified events from communities.json')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
