#!/usr/bin/env node
/**
 * Parses the AI Communities Sponsorship Directory markdown into structured JSON.
 *
 * Usage:  node scripts/parse-markdown.js [path/to/source.md]
 * Output: src/data/communities.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Region lookup (duplicated from src/data/regions.js to avoid ESM import issues
// with Vite-style paths; kept in sync manually)
// ---------------------------------------------------------------------------
const REGIONS = {
  "sf-bay-area":   { name: "San Francisco Bay Area", lat: 37.7749,  lng: -122.4194, country: "US" },
  "nyc":           { name: "New York City",          lat: 40.7128,  lng: -74.0060,  country: "US" },
  "boston":         { name: "Boston / Cambridge",     lat: 42.3601,  lng: -71.0589,  country: "US" },
  "dc":            { name: "Washington DC / DMV",    lat: 38.9072,  lng: -77.0369,  country: "US" },
  "philadelphia":  { name: "Philadelphia",           lat: 39.9526,  lng: -75.1652,  country: "US" },
  "atlanta":       { name: "Atlanta",                lat: 33.7490,  lng: -84.3880,  country: "US" },
  "miami":         { name: "Miami",                  lat: 25.7617,  lng: -80.1918,  country: "US" },
  "los-angeles":   { name: "Los Angeles / SoCal",    lat: 34.0522,  lng: -118.2437, country: "US" },
  "seattle":       { name: "Seattle",                lat: 47.6062,  lng: -122.3321, country: "US" },
  "chicago":       { name: "Chicago",                lat: 41.8781,  lng: -87.6298,  country: "US" },
  "austin":        { name: "Austin / Texas",         lat: 30.2672,  lng: -97.7431,  country: "US" },
  "dallas":        { name: "Dallas / Fort Worth",    lat: 32.7767,  lng: -96.7970,  country: "US" },
  "denver":        { name: "Denver / Boulder",       lat: 39.7392,  lng: -104.9903, country: "US" },
  "portland":      { name: "Portland",               lat: 45.5152,  lng: -122.6784, country: "US" },
  "minneapolis":   { name: "Minneapolis",            lat: 44.9778,  lng: -93.2650,  country: "US" },
  "toronto":       { name: "Toronto",                lat: 43.6532,  lng: -79.3832,  country: "CA" },
  "london":        { name: "London",                 lat: 51.5074,  lng: -0.1278,   country: "GB" },
  "dublin":        { name: "Dublin",                 lat: 53.3498,  lng: -6.2603,   country: "IE" },
  "manchester":    { name: "Manchester",             lat: 53.4808,  lng: -2.2426,   country: "GB" },
  "edinburgh":     { name: "Edinburgh",              lat: 55.9533,  lng: -3.1883,   country: "GB" },
  "cambridge-uk":  { name: "Cambridge (UK)",         lat: 52.2053,  lng: 0.1218,    country: "GB" },
  "oxford":        { name: "Oxford",                 lat: 51.7520,  lng: -1.2577,   country: "GB" },
  "birmingham":    { name: "Birmingham",             lat: 52.4862,  lng: -1.8904,   country: "GB" },
  "leeds":         { name: "Leeds",                  lat: 53.8008,  lng: -1.5491,   country: "GB" },
  "bristol":       { name: "Bristol",                lat: 51.4545,  lng: -2.5879,   country: "GB" },
  "berlin":        { name: "Berlin",                 lat: 52.5200,  lng: 13.4050,   country: "DE" },
  "munich":        { name: "Munich",                 lat: 48.1351,  lng: 11.5820,   country: "DE" },
  "paris":         { name: "Paris",                  lat: 48.8566,  lng: 2.3522,    country: "FR" },
  "amsterdam":     { name: "Amsterdam",              lat: 52.3676,  lng: 4.9041,    country: "NL" },
  "geneva":        { name: "Geneva",                 lat: 46.2044,  lng: 6.1432,    country: "CH" },
  "lausanne":      { name: "Lausanne",               lat: 46.5197,  lng: 6.6323,    country: "CH" },
  "zurich":        { name: "Zürich",                 lat: 47.3769,  lng: 8.5417,    country: "CH" },
  "barcelona":     { name: "Barcelona",              lat: 41.3874,  lng: 2.1686,    country: "ES" },
  "madrid":        { name: "Madrid",                 lat: 40.4168,  lng: -3.7038,   country: "ES" },
  "warsaw":        { name: "Warsaw",                 lat: 52.2297,  lng: 21.0122,   country: "PL" },
  "stockholm":     { name: "Stockholm",              lat: 59.3293,  lng: 18.0686,   country: "SE" },
  "copenhagen":    { name: "Copenhagen",             lat: 55.6761,  lng: 12.5683,   country: "DK" },
  "helsinki":      { name: "Helsinki",               lat: 60.1699,  lng: 24.9384,   country: "FI" },
  "vienna":        { name: "Vienna",                 lat: 48.2082,  lng: 16.3738,   country: "AT" },
  "prague":        { name: "Prague",                 lat: 50.0755,  lng: 14.4378,   country: "CZ" },
  "brussels":      { name: "Brussels",               lat: 50.8503,  lng: 4.3517,    country: "BE" },
  "lisbon":        { name: "Lisbon",                 lat: 38.7223,  lng: -9.1393,   country: "PT" },
  "global":        { name: "Global",                 lat: 30.0,     lng: 0.0,       country: "GLOBAL" },
  "global-sf":     { name: "Global (SF-based)",      lat: 37.78,    lng: -122.40,   country: "GLOBAL" },
}

const REGION_ALIASES = {
  "san francisco bay area": "sf-bay-area",
  "new york city": "nyc",
  "boston / cambridge": "boston",
  "boston": "boston",
  "washington dc / dmv": "dc",
  "washington dc": "dc",
  "philadelphia": "philadelphia",
  "atlanta": "atlanta",
  "miami": "miami",
  "los angeles / southern california": "los-angeles",
  "los angeles": "los-angeles",
  "seattle": "seattle",
  "chicago": "chicago",
  "austin / texas": "austin",
  "austin": "austin",
  "denver / boulder": "denver",
  "denver": "denver",
  "portland": "portland",
  "minneapolis / twin cities": "minneapolis",
  "minneapolis": "minneapolis",
  "toronto (nearby)": "toronto",
  "toronto": "toronto",
  "london": "london",
  "uk outside london + ireland": "london",
  "dublin": "dublin",
  "germany": "berlin",
  "berlin": "berlin",
  "munich": "munich",
  "france": "paris",
  "paris": "paris",
  "netherlands": "amsterdam",
  "amsterdam": "amsterdam",
  "switzerland (sonar home market)": "zurich",
  "switzerland": "zurich",
  "spain": "barcelona",
  "barcelona": "barcelona",
  "madrid": "madrid",
  "nordics": "stockholm",
  "other continental europe": "vienna",
  "vienna": "vienna",
  "prague": "prague",
  "warsaw": "warsaw",
  "stockholm": "stockholm",
  "copenhagen": "copenhagen",
  "helsinki": "helsinki",
  "brussels": "brussels",
  "lisbon": "lisbon",
  "global cross-cutting organizations": "global-sf",
  "diversity-focused ai communities": "global",
  "ai safety communities": "global-sf",
  "developer-tools-adjacent ai conferences": "global-sf",
}

// Detect city names in community names/descriptions to override the section-level region
const CITY_KEYWORDS = [
  // must check longer names first
  ["dallas fort worth", "dallas"], ["dallas", "dallas"], ["dfw", "dallas"],
  ["dublin", "dublin"], ["oxford", "oxford"], ["manchester", "manchester"],
  ["edinburgh", "edinburgh"], ["cambridge", "cambridge-uk"], ["birmingham", "birmingham"],
  ["leeds", "leeds"], ["bristol", "bristol"],
  ["geneva", "geneva"], ["genève", "geneva"], ["lausanne", "lausanne"],
  ["zürich", "zurich"], ["zurich", "zurich"],
  ["munich", "munich"], ["münchen", "munich"],
  ["madrid", "madrid"], ["barcelona", "barcelona"],
  ["warsaw", "warsaw"], ["stockholm", "stockholm"], ["copenhagen", "copenhagen"],
  ["helsinki", "helsinki"], ["vienna", "vienna"], ["prague", "prague"],
  ["brussels", "brussels"], ["belgium", "brussels"],
  ["lisbon", "lisbon"],
  ["amsterdam", "amsterdam"],
  ["paris", "paris"], ["berlin", "berlin"],
  ["london", "london"],
]

// Known AI coding tools for extraction
const CODING_TOOLS = [
  "Cursor", "Windsurf", "Codeium", "GitHub Copilot", "Copilot", "CopilotKit",
  "Lovable", "Vercel", "v0", "Bolt.new", "Bolt", "Zed", "Kilo Code",
  "CodeRabbit", "Replit", "Cline", "Sourcegraph", "Cody", "Factory",
  "Graphite", "Qodo", "OpenAI Codex", "Codex", "Claude Code", "OpenHands",
  "Warp", "Amp", "AWS Q Developer",
]

// Sections to skip (not communities)
const SKIP_SECTIONS = [
  "top 3 targets for sonar",
  "cross-cutting takeaway on ai coding tools",
  "notes on the research",
  "table of contents",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function countStars(str) {
  const matches = str.match(/⭐/g)
  return matches ? Math.min(matches.length, 3) : 0
}

function extractAnnotation(headerText) {
  // Pattern: "Community Name ⭐⭐⭐ — ANNOTATION TEXT"
  const match = headerText.match(/\s*—\s*(.+)$/i)
  if (!match) return []
  return [match[1].trim()]
}

function cleanName(headerText) {
  return headerText
    .replace(/⭐/g, '')
    .replace(/\s*—\s*.+$/, '')  // remove annotation
    .replace(/\s*\(.*?\)\s*$/, '')  // keep parenthetical but clean trailing
    .replace(/^\d+\.\s*/, '')  // remove leading numbering like "1. "
    .trim()
}

function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s,;)]+/g
  return (text.match(urlRegex) || []).map(u => u.replace(/[.)]+$/, ''))
}

function extractEmails(text) {
  const emailRegex = /[\w.+-]+@[\w.-]+\.\w+/g
  return text.match(emailRegex) || []
}

function extractMemberCount(text) {
  // Match patterns like "99,000+ members", "4,612 members", "50,000+ local AI developers"
  const patterns = [
    /(\d[\d,]*)\+?\s*(?:screened\s+)?(?:technical\s+)?members/i,
    /(\d[\d,]*)\+?\s*(?:local\s+)?(?:AI\s+)?developers/i,
    /(\d[\d,]*)\+?\s*(?:AI\/ML\s+)?practitioners/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return parseInt(m[1].replace(/,/g, ''), 10)
  }
  return null
}

function extractAttendance(text) {
  const patterns = [
    /(\d[\d,]*)\+?\s*(?:screened\s+)?(?:curated\s+)?(?:builders|attendees|participants|people)\s*(?:per|each)/i,
    /drawing\s+(\d[\d,]*)\+?\s*/i,
    /drew\s+(\d[\d,]*)\+?\s*/i,
    /(\d[\d,]*)\+?\s*attendees/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return parseInt(m[1].replace(/,/g, ''), 10)
  }
  return null
}

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

function extractDates(text) {
  const results = []
  // Pattern: "Month DD, YYYY" or "Month DD–DD, YYYY" or "Month YYYY"
  const datePatterns = [
    // "Apr 28–29, 2026" or "May 13, 2026" or "Jun 5–7, 2026"
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s*(\d{4})\b/gi,
    // "Oct 27–31, 2025"
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[–-]\s*(?:(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?(\d{1,2}),?\s*(\d{4})\b/gi,
  ]

  // Simple pattern: "Month DD, YYYY"
  const simple = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})\b/gi
  let m
  while ((m = simple.exec(text)) !== null) {
    const month = MONTHS[m[1].toLowerCase()]
    const day = parseInt(m[2], 10)
    const year = parseInt(m[3], 10)
    if (month !== undefined && day >= 1 && day <= 31 && year >= 2024 && year <= 2027) {
      const d = new Date(year, month, day)
      results.push({
        date: d.toISOString().split('T')[0],
        dateRaw: m[0].trim(),
        datePrecision: 'day',
      })
    }
  }

  // Range pattern: "Month DD–DD, YYYY" — capture start date
  const range = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*[–-]\s*(?:\w+\s+)?(\d{1,2}),?\s*(\d{4})\b/gi
  while ((m = range.exec(text)) !== null) {
    const month = MONTHS[m[1].toLowerCase()]
    const day = parseInt(m[2], 10)
    const year = parseInt(m[4], 10)
    if (month !== undefined && day >= 1 && day <= 31 && year >= 2024 && year <= 2027) {
      const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      // avoid duplicates from simple pattern
      if (!results.find(r => r.date === key)) {
        results.push({
          date: key,
          dateRaw: m[0].trim(),
          datePrecision: 'day',
        })
      }
    }
  }

  return results
}

/**
 * Parse structured "Upcoming events" field.
 * Format: "May 13, 2026 | https://lu.ma/xyz ; Jun 5, 2026 | https://meetup.com/event/456"
 * The URL part after | is optional.
 */
function parseUpcomingEvents(raw) {
  const entries = raw.split(/\s*;\s*/)
  const results = []
  for (const entry of entries) {
    const parts = entry.split(/\s*\|\s*/)
    const dateText = parts[0]?.trim()
    const eventUrl = parts[1]?.trim() || null
    if (!dateText) continue
    const dates = extractDates(dateText)
    for (const d of dates) {
      if (eventUrl) d.url = eventUrl
      results.push(d)
    }
  }
  return results
}

function extractCodingTools(text) {
  const found = new Set()
  for (const tool of CODING_TOOLS) {
    if (text.includes(tool)) found.add(tool)
  }
  // Normalize some variants
  if (found.has('Codeium') && !found.has('Windsurf')) found.add('Windsurf')
  if (found.has('CopilotKit')) found.add('CopilotKit')
  if (found.has('v0') && !found.has('Vercel')) found.add('Vercel')
  return [...found].sort()
}

function inferRegionFromName(name, currentRegionId) {
  const lower = name.toLowerCase()
  for (const [keyword, regionId] of CITY_KEYWORDS) {
    if (lower.includes(keyword) && REGIONS[regionId]) {
      return regionId
    }
  }
  return currentRegionId
}

function jitterCoords(baseLat, baseLng, index, total) {
  if (total <= 1) return { lat: baseLat, lng: baseLng }
  const angle = (2 * Math.PI * index) / Math.max(total, 6)
  const radius = 0.02 + (index % 3) * 0.008
  return {
    lat: baseLat + radius * Math.cos(angle),
    lng: baseLng + radius * Math.sin(angle),
  }
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

function parseMarkdown(source) {
  const lines = source.split('\n')
  const communities = []
  let currentCountry = ''
  let currentRegionId = 'global'
  let inSkipSection = false
  let inTopTargets = false

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // --- H1: Country grouping ---
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      const heading = line.replace(/^#\s+/, '').trim()
      if (heading === 'UNITED STATES') currentCountry = 'US'
      else if (heading === 'EUROPE') currentCountry = 'EU'
      else if (heading.includes('GLOBAL')) currentCountry = 'GLOBAL'
      else currentCountry = heading

      inSkipSection = false
      inTopTargets = false
      i++
      continue
    }

    // --- H2: Region ---
    if (line.startsWith('## ')) {
      const heading = line.replace(/^##\s+/, '').trim()
      const headingLower = heading.toLowerCase()

      if (SKIP_SECTIONS.some(s => headingLower.includes(s))) {
        inSkipSection = true
        inTopTargets = headingLower.includes('top 3')
        i++
        continue
      }

      inSkipSection = false
      inTopTargets = false
      currentRegionId = REGION_ALIASES[headingLower] || currentRegionId
      i++
      continue
    }

    // --- H3: Community entry ---
    if (line.startsWith('### ')) {
      // Skip if inside a skip section (except Top 3 — we want those)
      if (inSkipSection && !inTopTargets) {
        i++
        continue
      }

      const headerText = line.replace(/^###\s+/, '').trim()
      const priority = countStars(headerText)
      const tags = extractAnnotation(headerText)
      const rawName = cleanName(headerText)

      // Collect all lines until the next heading or horizontal rule
      const blockLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('## ') && !lines[i].startsWith('### ') && !lines[i].startsWith('# ')) {
        if (lines[i].trim() === '---') { i++; break }
        blockLines.push(lines[i])
        i++
      }

      const block = blockLines.join('\n')

      // Extract structured fields
      let url = ''
      let urls = []
      let contactType = 'unknown'
      let contactValue = ''
      let description = ''
      let notableCompaniesRaw = ''
      let whyTarget = ''
      let upcomingEventsRaw = ''

      for (const bl of blockLines) {
        const trimmed = bl.trim()
        if (trimmed.startsWith('- **Link:**')) {
          url = (extractUrls(trimmed)[0] || '').trim()
          urls = [url].filter(Boolean)
        } else if (trimmed.startsWith('- **Links:**')) {
          const linkText = trimmed.replace('- **Links:**', '').trim()
          // URLs separated by • or spaces
          const rawParts = linkText.split(/\s*•\s*/)
          for (const part of rawParts) {
            const found = extractUrls(part)
            if (found.length) urls.push(...found)
            else if (part.includes('.')) {
              // Bare domains like "meetup.com/foo"
              urls.push('https://' + part.trim())
            }
          }
          url = urls[0] || ''
        } else if (trimmed.startsWith('- **How to get started:**')) {
          const contactText = trimmed.replace('- **How to get started:**', '').trim()
          const emails = extractEmails(contactText)
          const contactUrls = extractUrls(contactText)
          if (emails.length) {
            contactType = 'email'
            contactValue = emails[0]
          } else if (contactUrls.length) {
            contactType = 'url'
            contactValue = contactUrls[0]
          } else {
            contactType = 'text'
            contactValue = contactText
          }
        } else if (trimmed.startsWith('- **Upcoming events:**') || trimmed.startsWith('- **Upcoming event:**')) {
          upcomingEventsRaw = trimmed.replace(/^-\s*\*\*Upcoming events?:\*\*\s*/, '').trim()
        } else if (trimmed.startsWith('- **Description:**')) {
          description = trimmed.replace('- **Description:**', '').trim()
        } else if (trimmed.startsWith('- **Notable F500')) {
          notableCompaniesRaw = trimmed.replace(/^-\s*\*\*Notable F500.*?\*\*:?\s*/, '').trim()
        } else if (trimmed.startsWith('**Why #')) {
          whyTarget = trimmed.replace(/^\*\*Why #\d+:\*\*\s*/, '').trim()
        }
      }

      // Parse notable companies into array
      const notableCompanies = notableCompaniesRaw
        ? notableCompaniesRaw
            .split(/[;,]/)
            .map(c => c.replace(/🔧/g, '').replace(/\(.*?\)/g, '').trim())
            .filter(c => c && c !== 'Not publicly disclosed' && c !== 'Limited public sponsor data' && c.length < 80)
        : []

      const hasAICodingTools = block.includes('🔧')
      const codingTools = extractCodingTools(block)
      const memberCount = extractMemberCount(description + ' ' + block)
      const attendanceEstimate = extractAttendance(description + ' ' + block)

      // Parse events: prefer structured "Upcoming events" field, fall back to free-text date extraction
      let events
      if (upcomingEventsRaw) {
        events = parseUpcomingEvents(upcomingEventsRaw)
      }
      if (!events || events.length === 0) {
        events = extractDates(block)
      }

      // Check if this is a grouped entry (multiple communities in one header)
      const slashNames = rawName.split(/\s*\/\s*/)
      const isGrouped = slashNames.length > 1 && urls.length > 1

      if (isGrouped) {
        // Create one entry per sub-community
        for (let j = 0; j < slashNames.length; j++) {
          const subName = slashNames[j].trim()
          if (!subName) continue
          const subRegion = inferRegionFromName(subName, currentRegionId)
          const subUrl = urls[j] || urls[0] || ''
          communities.push({
            id: slugify(subName),
            name: subName,
            regionId: subRegion,
            priority,
            tags,
            url: subUrl,
            urls: urls.length > 1 ? urls : [subUrl],
            contact: { type: contactType, value: contactValue },
            description,
            notableCompanies,
            hasAICodingTools,
            codingTools,
            memberCount,
            attendanceEstimate,
            events,
            whyTarget,
            isGrouped: true,
            groupName: rawName,
          })
        }
      } else {
        const regionId = inferRegionFromName(rawName, currentRegionId)
        communities.push({
          id: slugify(rawName),
          name: rawName,
          regionId,
          priority,
          tags,
          url,
          urls: urls.length ? urls : [url].filter(Boolean),
          contact: { type: contactType, value: contactValue },
          description,
          notableCompanies,
          hasAICodingTools,
          codingTools,
          memberCount,
          attendanceEstimate,
          events,
          whyTarget,
          isGrouped: false,
          groupName: null,
        })
      }

      continue
    }

    i++
  }

  return communities
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicate(communities) {
  // The Top 3 Targets section duplicates entries that also appear in regional sections.
  // Keep the regional version (usually has more data), but merge priority/tags/whyTarget from Top 3.
  const byUrl = new Map()
  const byName = new Map()

  for (const c of communities) {
    const key = c.url || c.name
    if (byUrl.has(c.url) && c.url) {
      const existing = byUrl.get(c.url)
      // Merge: keep higher priority, merge tags, prefer longer description
      existing.priority = Math.max(existing.priority, c.priority)
      existing.tags = [...new Set([...existing.tags, ...c.tags])]
      if (c.whyTarget && !existing.whyTarget) existing.whyTarget = c.whyTarget
      if (c.description.length > existing.description.length) existing.description = c.description
      continue
    }
    // Also check by cleaned name for near-duplicates
    const cleanKey = slugify(c.name)
    if (byName.has(cleanKey)) {
      const existing = byName.get(cleanKey)
      existing.priority = Math.max(existing.priority, c.priority)
      existing.tags = [...new Set([...existing.tags, ...c.tags])]
      if (c.whyTarget && !existing.whyTarget) existing.whyTarget = c.whyTarget
      continue
    }
    byUrl.set(c.url, c)
    byName.set(cleanKey, c)
  }

  return [...byUrl.values()]
}

// ---------------------------------------------------------------------------
// Add coordinates
// ---------------------------------------------------------------------------

function addCoordinates(communities) {
  // Count communities per region for jitter
  const regionCounts = {}
  const regionIndices = {}

  for (const c of communities) {
    regionCounts[c.regionId] = (regionCounts[c.regionId] || 0) + 1
    regionIndices[c.regionId] = 0
  }

  for (const c of communities) {
    const region = REGIONS[c.regionId] || REGIONS['global']
    const idx = regionIndices[c.regionId]++
    const total = regionCounts[c.regionId]
    const { lat, lng } = jitterCoords(region.lat, region.lng, idx, total)
    c.lat = parseFloat(lat.toFixed(5))
    c.lng = parseFloat(lng.toFixed(5))
    c.country = region.country
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const sourcePath = process.argv[2] || path.join(PROJECT_ROOT, 'source', 'ai_communities_sonar_v2.md')

if (!fs.existsSync(sourcePath)) {
  console.error(`Source file not found: ${sourcePath}`)
  console.error(`Usage: node scripts/parse-markdown.js [path/to/source.md]`)
  process.exit(1)
}

const source = fs.readFileSync(sourcePath, 'utf-8')
let communities = parseMarkdown(source)

console.log(`Parsed ${communities.length} raw entries`)

communities = deduplicate(communities)
console.log(`After dedup: ${communities.length} communities`)

addCoordinates(communities)

// Compute stats
const regionSet = new Set(communities.map(c => c.regionId))
const withDates = communities.filter(c => c.events.length > 0)
const withTools = communities.filter(c => c.hasAICodingTools)
const byPriority = { 0: 0, 1: 0, 2: 0, 3: 0 }
for (const c of communities) byPriority[c.priority]++

const output = {
  metadata: {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(sourcePath),
    totalCommunities: communities.length,
    totalRegions: regionSet.size,
    communitiesWithDates: withDates.length,
    communitiesWithCodingTools: withTools.length,
    byPriority,
  },
  communities,
}

const outPath = path.join(PROJECT_ROOT, 'src', 'data', 'communities.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
console.log(`\nWritten to ${outPath}`)
console.log(`  Regions: ${regionSet.size}`)
console.log(`  Communities with dates: ${withDates.length}`)
console.log(`  Communities with AI tools: ${withTools.length}`)
console.log(`  By priority: ⭐⭐⭐=${byPriority[3]}  ⭐=${byPriority[1]}  none=${byPriority[0]}`)
