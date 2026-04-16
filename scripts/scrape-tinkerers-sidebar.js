#!/usr/bin/env node
import { launchBrowser, createContext, loadCommunities, saveCommunities, normalizeDate } from './scraper-utils.js'

/**
 * Scrape AI Tinkerers sidebar from one page to get next-event dates
 * for all chapters at once, then match to our community entries.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function resolveRelativeDate(hint) {
  const today = new Date()
  const trimmed = hint.trim()

  // "May 11", "Apr 28", etc. — absolute month+day
  const absMatch = trimmed.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i)
  if (absMatch) {
    return normalizeDate(`${absMatch[1]} ${absMatch[2]}, 2026`)
  }

  // "Tue", "Thu", etc. — next occurrence of that weekday
  const dayIdx = DAY_NAMES.findIndex(d => trimmed.toLowerCase().startsWith(d.toLowerCase()))
  if (dayIdx >= 0) {
    const todayDay = today.getDay()
    let daysAhead = dayIdx - todayDay
    if (daysAhead <= 0) daysAhead += 7
    const target = new Date(today)
    target.setDate(today.getDate() + daysAhead)
    return target.toISOString().slice(0, 10)
  }

  // "Tomorrow"
  if (/^tomorrow$/i.test(trimmed)) {
    const t = new Date(today)
    t.setDate(t.getDate() + 1)
    return t.toISOString().slice(0, 10)
  }

  return null
}

// Map city names from sidebar to community URL slugs
function findCommunityForChapter(communities, cityName, chapterUrl) {
  const slug = chapterUrl.replace('https://', '').replace('.aitinkerers.org/', '').replace('.aitinkerers.org', '')

  // Match by URL containing the slug
  return communities.find(c =>
    c.url?.includes(`${slug}.aitinkerers.org`) ||
    c.urls?.some(u => u.includes(`${slug}.aitinkerers.org`))
  )
}

async function main() {
  const browser = await launchBrowser({ headless: true, slowMo: 50 })
  const context = await createContext(browser)
  const page = await context.newPage()

  console.log('Loading AI Tinkerers sidebar...')
  await page.goto('https://sf.aitinkerers.org/all_cities', { timeout: 20000, waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)

  // Extract all chapter links with their text (includes "Next: ..." hints)
  const chapters = await page.$$eval('a[href*=".aitinkerers.org"]', anchors =>
    anchors.map(a => ({
      href: a.href,
      text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
    })).filter(l => l.href.includes('.aitinkerers.org/') && !l.href.includes('/all_cities'))
  )

  console.log(`Found ${chapters.length} chapter links`)

  // Deduplicate by href
  const seen = new Set()
  const unique = chapters.filter(c => {
    if (seen.has(c.href)) return false
    seen.add(c.href)
    return true
  })

  // Parse "Next: ..." hints
  const withNext = []
  for (const ch of unique) {
    const nextMatch = ch.text.match(/Next:\s*(.+)$/i)
    if (nextMatch) {
      const resolved = resolveRelativeDate(nextMatch[1])
      if (resolved) {
        withNext.push({ ...ch, nextDate: resolved, hint: nextMatch[1] })
      }
    }
  }

  console.log(`Chapters with upcoming events: ${withNext.length}`)

  // Match to our community data
  const data = loadCommunities()
  let matched = 0

  for (const ch of withNext) {
    const community = findCommunityForChapter(data.communities, ch.text, ch.href)
    if (community) {
      // Only add if we don't already have better data
      const hasExisting = community.events?.length > 0
      if (!hasExisting) {
        community.events = [{ date: ch.nextDate, dateRaw: ch.hint, datePrecision: 'day' }]
        matched++
        console.log(`  ✓ ${community.name} → ${ch.nextDate} (${ch.hint})`)
      } else {
        console.log(`  ~ ${community.name} already has ${community.events.length} events`)
      }
    }
  }

  // Also try individual chapter pages for those with "Next:" that we matched
  // to get fuller event listings
  console.log('\nFetching full event listings for matched chapters...')
  const today = new Date().toISOString().slice(0, 10)

  for (const ch of withNext) {
    const community = findCommunityForChapter(data.communities, ch.text, ch.href)
    if (!community) continue

    try {
      await page.goto(ch.href, { timeout: 15000, waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(4000)

      const text = await page.evaluate(() => document.body.innerText)

      // Only parse UPCOMING section
      const upIdx = text.indexOf('UPCOMING')
      const pastIdx = upIdx >= 0 ? text.indexOf('PAST', upIdx + 8) : -1
      const section = upIdx >= 0 ? text.slice(upIdx, pastIdx > 0 ? pastIdx : upIdx + 3000) : ''

      if (!section) continue

      const events = []

      // "NEXT EVENT: TUESDAY, APRIL 21, 2026"
      const nextHeader = text.match(/NEXT EVENT:\s*\w+,\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}),?\s*(\d{4})/i)
      if (nextHeader) {
        const d = normalizeDate(`${nextHeader[1]}, ${nextHeader[2]}`)
        if (d && d >= today) events.push({ date: d, dateRaw: `${nextHeader[1]}, ${nextHeader[2]}`, datePrecision: 'day' })
      }

      // "Tuesday, April 21st from 8AM"
      const dateRe = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)/gi
      let m
      while ((m = dateRe.exec(section)) !== null) {
        const d = normalizeDate(`${m[1]} ${m[2]}, 2026`)
        if (d && d >= today) events.push({ date: d, dateRaw: `${m[1]} ${m[2]}, 2026`, datePrecision: 'day' })
      }

      const unique = [...new Map(events.map(e => [e.date, e])).values()].sort((a, b) => a.date.localeCompare(b.date))
      if (unique.length > 0) {
        community.events = unique
        console.log(`  ✓ ${community.name}: ${unique.map(e => e.date).join(', ')}`)
      }
    } catch (e) {
      // sidebar date is still saved from earlier
    }
  }

  saveCommunities(data)
  console.log(`\nDone. Matched ${matched} new chapter events.`)

  await context.close()
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
