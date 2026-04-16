#!/usr/bin/env node
import {
  REGION_COORDS,
  REGION_COUNTRIES,
  createContext,
  findExistingCommunity,
  jitterCoords,
  launchBrowser,
  loadCommunities,
  saveCommunities,
  sleep,
  slugify,
  withRetry,
} from './scraper-utils.js'

const CITY_TO_REGION = {
  // US + Canada
  'san francisco': 'sf-bay-area',
  sf: 'sf-bay-area',
  oakland: 'sf-bay-area',
  berkeley: 'sf-bay-area',
  'new york': 'nyc',
  nyc: 'nyc',
  brooklyn: 'nyc',
  boston: 'boston',
  cambridge: 'boston',
  washington: 'dc',
  'washington dc': 'dc',
  dmv: 'dc',
  philadelphia: 'philadelphia',
  atlanta: 'atlanta',
  miami: 'miami',
  'los angeles': 'los-angeles',
  la: 'los-angeles',
  seattle: 'seattle',
  chicago: 'chicago',
  austin: 'austin',
  dallas: 'dallas',
  denver: 'denver',
  boulder: 'denver',
  portland: 'portland',
  minneapolis: 'minneapolis',
  'san diego': 'san-diego',
  houston: 'houston',
  toronto: 'toronto',
  vancouver: 'vancouver',

  // Europe
  london: 'london',
  dublin: 'dublin',
  manchester: 'manchester',
  edinburgh: 'edinburgh',
  oxford: 'oxford',
  birmingham: 'birmingham',
  leeds: 'leeds',
  bristol: 'bristol',
  berlin: 'berlin',
  munich: 'munich',
  paris: 'paris',
  amsterdam: 'amsterdam',
  geneva: 'geneva',
  lausanne: 'lausanne',
  zurich: 'zurich',
  'zürich': 'zurich',
  barcelona: 'barcelona',
  madrid: 'madrid',
  warsaw: 'warsaw',
  stockholm: 'stockholm',
  copenhagen: 'copenhagen',
  helsinki: 'helsinki',
  vienna: 'vienna',
  prague: 'prague',
  brussels: 'brussels',
  lisbon: 'lisbon',
  milan: 'milan',
  frankfurt: 'frankfurt',
  oslo: 'oslo',
  luxembourg: 'luxembourg',

  // APAC
  bangalore: 'bangalore',
  chennai: 'chennai',
  delhi: 'delhi',
  hyderabad: 'hyderabad',
  mumbai: 'mumbai',
  singapore: 'singapore',
  tokyo: 'tokyo',
  seoul: 'seoul',
  melbourne: 'melbourne',
  sydney: 'sydney',
  brisbane: 'brisbane',
  auckland: 'auckland',

  // LATAM / MEA
  'tel aviv': 'tel-aviv',
  'cape town': 'cape-town',
  lagos: 'lagos',
  'mexico city': 'mexico-city',
  medellin: 'medellin',
  'medellín': 'medellin',
}

function toCityName(labelOrUrl) {
  const hostMatch = labelOrUrl.match(/^https?:\/\/([^./]+)\.aitinkerers\.org(?:\/|$)/i)
  if (hostMatch && hostMatch[1] !== 'www') return hostMatch[1].replace(/-/g, ' ')
  const pathCityMatch = labelOrUrl.match(/(?:city=|chapters\/)([a-z0-9+%\-]+)/i)
  if (pathCityMatch) {
    return decodeURIComponent(pathCityMatch[1]).replace(/\+/g, ' ').replace(/-/g, ' ').trim()
  }
  return labelOrUrl.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function regionForCity(city, unmapped) {
  const key = city.toLowerCase().trim()
  const regionId = CITY_TO_REGION[key]
  if (!regionId) {
    unmapped.add(city)
    return null
  }
  return regionId
}

function createCommunityEntry({ communities, name, regionId, url, network, description, contact }) {
  const [baseLat, baseLng] = REGION_COORDS[regionId] || REGION_COORDS.global
  const totalInRegion = communities.filter((c) => c.regionId === regionId).length + 1
  const { lat, lng } = jitterCoords(baseLat, baseLng, totalInRegion, totalInRegion + 2)
  return {
    id: slugify(name),
    name,
    regionId,
    country: REGION_COUNTRIES[regionId] || 'GLOBAL',
    priority: 0,
    tags: [],
    url,
    urls: [url].filter(Boolean),
    contact,
    description,
    notableCompanies: [],
    hasAICodingTools: false,
    codingTools: [],
    memberCount: null,
    attendanceEstimate: null,
    events: [],
    whyTarget: '',
    isGrouped: false,
    groupName: null,
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
  }
}

async function discoverAiTinkerers(page) {
  const found = await withRetry(
    async () => {
      await page.goto('https://aitinkerers.org', { timeout: 15000, waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      return page.$$eval('a[href*=".aitinkerers.org"]', (anchors) =>
        anchors.map((a) => ({
          href: a.href,
          text: (a.textContent || '').trim(),
        }))
      )
    },
    { label: 'ai-tinkerers-discovery' }
  )
  return found || []
}

async function discoverGenAiCollective(page) {
  const urls = ['https://www.genaicollective.ai', 'https://lu.ma/genaicollective']
  const results = []
  for (const url of urls) {
    const links = await withRetry(
      async () => {
        await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        return page.$$eval('a[href*="/chapters/"], a[href*="/hubs/"], a[href*="lu.ma"]', (anchors) =>
          anchors.map((a) => ({
            href: a.href,
            text: (a.textContent || '').trim(),
          }))
        )
      },
      { label: `genai-discovery-${url}` }
    )
    if (links) results.push(...links)
    await sleep(2000)
  }
  return results
}

async function discoverAICamp(page) {
  const links = await withRetry(
    async () => {
      await page.goto('https://www.aicamp.ai', { timeout: 15000, waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      return page.$$eval('a[href*="eventsquery?city="], a[href*="meetup.com"]', (anchors) =>
        anchors.map((a) => ({
          href: a.href,
          text: (a.textContent || '').trim(),
        }))
      )
    },
    { label: 'aicamp-discovery' }
  )
  return links || []
}

function extractCitiesFromLinks(links) {
  const out = []
  for (const item of links) {
    const city = toCityName(item.href || item.text || '')
    if (city.length < 2) continue
    out.push({ city, url: item.href })
  }
  return out
}

function titleCase(str) {
  return str.replace(/\b\w/g, (m) => m.toUpperCase())
}

function cleanAiTinkerersRows(rows) {
  return rows
    .filter((r) => /^https?:\/\/[a-z0-9-]+\.aitinkerers\.org\/?$/i.test(r.url))
    .map((r) => ({ ...r, city: r.city.toLowerCase().trim() }))
}

function cleanGenAiRows(rows) {
  return rows
    .filter((r) => /genaicollective|aicollective|lu\.ma/i.test(r.url))
    .map((r) => ({ ...r, city: r.city.toLowerCase().trim() }))
}

function cleanAICampRows(rows) {
  return rows
    .filter((r) => /eventsquery\?city=|meetup\.com/i.test(r.url))
    .map((r) => ({ ...r, city: r.city.toLowerCase().trim() }))
}

function dedupeCityRows(rows) {
  const seen = new Set()
  const deduped = []
  for (const row of rows) {
    const key = `${row.city.toLowerCase()}|${row.url}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  return deduped
}

async function main() {
  const data = loadCommunities()
  const browser = await launchBrowser({ headless: true, slowMo: 100 })
  const context = await createContext(browser)
  const page = await context.newPage()
  const unmapped = new Set()

  const summary = {
    aiTinkerers: 0,
    genaiCollective: 0,
    aicamp: 0,
  }

  try {
    try {
      const links = await discoverAiTinkerers(page)
      const rows = cleanAiTinkerersRows(dedupeCityRows(extractCitiesFromLinks(links)))
      for (const row of rows) {
        const regionId = regionForCity(row.city, unmapped)
        if (!regionId) continue
        const name = `AI Tinkerers ${titleCase(row.city)}`
        if (findExistingCommunity(data.communities, { name, regionId, network: 'AI Tinkerers' })) continue
        const community = createCommunityEntry({
          communities: data.communities,
          name,
          regionId,
          url: row.url,
          network: 'AI Tinkerers',
          description: `${row.city} chapter of AI Tinkerers global AI builder community.`,
          contact: { type: 'email', value: 'admin@aitinkerers.org' },
        })
        data.communities.push(community)
        summary.aiTinkerers += 1
      }
    } catch (error) {
      console.warn(`AI Tinkerers discovery failed: ${error.message}`)
    }

    await sleep(2000)

    try {
      const links = await discoverGenAiCollective(page)
      const rows = cleanGenAiRows(dedupeCityRows(extractCitiesFromLinks(links)))
      for (const row of rows) {
        const regionId = regionForCity(row.city, unmapped)
        if (!regionId) continue
        const titleCity = titleCase(row.city)
        const name = `GenAI Collective ${titleCity}`
        if (findExistingCommunity(data.communities, { name, regionId, network: 'GenAI Collective' })) continue
        const community = createCommunityEntry({
          communities: data.communities,
          name,
          regionId,
          url: row.url,
          network: 'GenAI Collective',
          description: `${titleCity} chapter of GenAI Collective.`,
          contact: { type: 'email', value: 'markiesha@aicollective.com' },
        })
        data.communities.push(community)
        summary.genaiCollective += 1
      }
    } catch (error) {
      console.warn(`GenAI Collective discovery failed: ${error.message}`)
    }

    await sleep(2000)

    try {
      const links = await discoverAICamp(page)
      const rows = cleanAICampRows(dedupeCityRows(extractCitiesFromLinks(links)))
      for (const row of rows) {
        const regionId = regionForCity(row.city, unmapped)
        if (!regionId) continue
        const titleCity = titleCase(row.city)
        const name = `AICamp ${titleCity}`
        if (findExistingCommunity(data.communities, { name, regionId, network: 'AICamp' })) continue
        const community = createCommunityEntry({
          communities: data.communities,
          name,
          regionId,
          url: row.url,
          network: 'AICamp',
          description: `${titleCity} chapter of AICamp global AI developer community.`,
          contact: { type: 'email', value: 'info@aicamp.ai' },
        })
        data.communities.push(community)
        summary.aicamp += 1
      }
    } catch (error) {
      console.warn(`AICamp discovery failed: ${error.message}`)
    }
  } finally {
    await context.close()
    await browser.close()
  }

  saveCommunities(data)

  console.log('\nDiscovery summary')
  console.log(`- AI Tinkerers: ${summary.aiTinkerers}`)
  console.log(`- GenAI Collective: ${summary.genaiCollective}`)
  console.log(`- AICamp: ${summary.aicamp}`)
  if (unmapped.size) {
    console.log('\nUnmapped cities:')
    for (const city of [...unmapped].sort()) {
      console.log(`UNMAPPED: ${city}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
