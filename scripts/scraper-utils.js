#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { fileURLToPath } from 'node:url'

chromium.use(StealthPlugin())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const COMMUNITIES_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'communities.json')

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function launchBrowser(options = {}) {
  const { headless = true, slowMo = 100 } = options
  return chromium.launch({
    headless,
    slowMo,
  })
}

export async function withRetry(fn, { maxRetries = 3, delayMs = 2000, label = 'task' } = {}) {
  let attempt = 0
  while (attempt < maxRetries) {
    attempt += 1
    try {
      return await fn(attempt)
    } catch (error) {
      const lastAttempt = attempt >= maxRetries
      console.warn(`[retry:${label}] attempt ${attempt}/${maxRetries} failed: ${error.message}`)
      if (lastAttempt) {
        console.warn(`[retry:${label}] giving up`)
        return null
      }
      const backoff = delayMs * Math.pow(2, attempt - 1)
      await sleep(backoff)
    }
  }
  return null
}

export function loadCommunities() {
  return JSON.parse(fs.readFileSync(COMMUNITIES_PATH, 'utf-8'))
}

export function saveCommunities(data) {
  const communities = data.communities || []
  const metadata = data.metadata || {}
  const totalRegions = new Set(communities.map((c) => c.regionId).filter(Boolean)).size
  const communitiesWithDates = communities.filter((c) => Array.isArray(c.events) && c.events.length > 0).length

  data.metadata = {
    ...metadata,
    generatedAt: new Date().toISOString(),
    totalCommunities: communities.length,
    totalRegions,
    communitiesWithDates,
  }

  fs.writeFileSync(COMMUNITIES_PATH, JSON.stringify(data, null, 2))
}

export function slugify(str = '') {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const REGION_COORDS = {
  'sf-bay-area': [37.7749, -122.4194],
  nyc: [40.7128, -74.006],
  boston: [42.3601, -71.0589],
  dc: [38.9072, -77.0369],
  atlanta: [33.749, -84.388],
  miami: [25.7617, -80.1918],
  seattle: [47.6062, -122.3321],
  chicago: [41.8781, -87.6298],
  austin: [30.2672, -97.7431],
  dallas: [32.7767, -96.797],
  denver: [39.7392, -104.9903],
  'los-angeles': [34.0522, -118.2437],
  'san-diego': [32.7157, -117.1611],
  houston: [29.7604, -95.3698],
  portland: [45.5152, -122.6784],
  toronto: [43.6532, -79.3832],
  vancouver: [49.2827, -123.1207],
  london: [51.5074, -0.1278],
  dublin: [53.3498, -6.2603],
  paris: [48.8566, 2.3522],
  berlin: [52.52, 13.405],
  munich: [48.1351, 11.582],
  amsterdam: [52.3676, 4.9041],
  zurich: [47.3769, 8.5417],
  stockholm: [59.3293, 18.0686],
  copenhagen: [55.6761, 12.5683],
  barcelona: [41.3874, 2.1686],
  lisbon: [38.7223, -9.1393],
  milan: [45.4642, 9.19],
  frankfurt: [50.1109, 8.6821],
  oslo: [59.9139, 10.7522],
  luxembourg: [49.6117, 6.13],
  bristol: [51.4545, -2.5879],
  edinburgh: [55.9533, -3.1883],
  bangalore: [12.9716, 77.5946],
  chennai: [13.0827, 80.2707],
  delhi: [28.6139, 77.209],
  hyderabad: [17.385, 78.4867],
  mumbai: [19.076, 72.8777],
  singapore: [1.3521, 103.8198],
  tokyo: [35.6762, 139.6503],
  seoul: [37.5665, 126.978],
  melbourne: [-37.8136, 144.9631],
  sydney: [-33.8688, 151.2093],
  brisbane: [-27.4698, 153.0251],
  auckland: [-36.8485, 174.7633],
  'tel-aviv': [32.0853, 34.7818],
  'cape-town': [-33.9249, 18.4241],
  lagos: [6.5244, 3.3792],
  'mexico-city': [19.4326, -99.1332],
  medellin: [6.2476, -75.5658],
  'global-sf': [37.78, -122.4],
  global: [30, 0],
}

export const REGION_COUNTRIES = {
  'sf-bay-area': 'US',
  nyc: 'US',
  boston: 'US',
  dc: 'US',
  atlanta: 'US',
  miami: 'US',
  seattle: 'US',
  chicago: 'US',
  austin: 'US',
  dallas: 'US',
  denver: 'US',
  'los-angeles': 'US',
  'san-diego': 'US',
  houston: 'US',
  portland: 'US',
  toronto: 'CA',
  vancouver: 'CA',
  london: 'GB',
  dublin: 'IE',
  paris: 'FR',
  berlin: 'DE',
  munich: 'DE',
  amsterdam: 'NL',
  zurich: 'CH',
  stockholm: 'SE',
  copenhagen: 'DK',
  barcelona: 'ES',
  lisbon: 'PT',
  milan: 'IT',
  frankfurt: 'DE',
  oslo: 'NO',
  luxembourg: 'LU',
  bristol: 'GB',
  edinburgh: 'GB',
  bangalore: 'IN',
  chennai: 'IN',
  delhi: 'IN',
  hyderabad: 'IN',
  mumbai: 'IN',
  singapore: 'SG',
  tokyo: 'JP',
  seoul: 'KR',
  melbourne: 'AU',
  sydney: 'AU',
  brisbane: 'AU',
  auckland: 'NZ',
  'tel-aviv': 'IL',
  'cape-town': 'ZA',
  lagos: 'NG',
  'mexico-city': 'MX',
  medellin: 'CO',
}

export function jitterCoords(baseLat, baseLng, index, total) {
  if (total <= 1) return { lat: baseLat, lng: baseLng }
  const angle = (2 * Math.PI * index) / Math.max(total, 6)
  const radius = 0.02 + (index % 3) * 0.008
  return {
    lat: baseLat + radius * Math.cos(angle),
    lng: baseLng + radius * Math.sin(angle),
  }
}

export function findExistingCommunity(communities, { name, regionId, network }) {
  const nameSlug = slugify(name || '')
  const networkLower = (network || '').toLowerCase()

  for (const community of communities) {
    if (slugify(community.id || '') === nameSlug || slugify(community.name || '') === nameSlug) {
      return community
    }
    if (
      community.regionId === regionId &&
      (community.name || '').toLowerCase().includes(networkLower)
    ) {
      return community
    }
  }

  return null
}

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

export function formatEvent(dateStr, rawStr, url) {
  const date = normalizeDate(dateStr)
  if (!date) return null

  const event = {
    date,
    dateRaw: rawStr || dateStr,
    datePrecision: 'day',
  }
  if (url) event.url = url
  return event
}

export function normalizeDate(input) {
  const str = (input || '').trim()
  if (!str) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  const isoInside = str.match(/\b(20\d{2}-\d{2}-\d{2})(?:T[0-9:.+-Z]+)?\b/)
  if (isoInside) return isoInside[1]

  const m = str.match(
    /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\,?\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:\s*[–-]\s*\d{1,2})?,?\s*(\d{4})\b/i
  )
  if (!m) return null
  const month = MONTHS[m[1].toLowerCase()]
  const day = Number(m[2])
  const year = Number(m[3])
  if (month === undefined || day < 1 || day > 31 || year < 2024 || year > 2035) return null

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function createContext(browser) {
  return browser.newContext({
    userAgent: DEFAULT_USER_AGENT,
  })
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = loadCommunities()
  console.log(`Loaded ${data.communities.length} communities`)
}
