#!/usr/bin/env node
/**
 * Adds newly scraped global network chapters to communities.json.
 * Skips any community that already exists (matched by regionId + network).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jsonPath = path.resolve(__dirname, '..', 'src', 'data', 'communities.json')
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

function slugify(str) {
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// Regions with lat/lng (must match regions.js)
const REGION_COORDS = {
  "sf-bay-area": [37.7749, -122.4194], "nyc": [40.7128, -74.006], "boston": [42.3601, -71.0589],
  "dc": [38.9072, -77.0369], "atlanta": [33.749, -84.388], "miami": [25.7617, -80.1918],
  "seattle": [47.6062, -122.3321], "chicago": [41.8781, -87.6298], "austin": [30.2672, -97.7431],
  "dallas": [32.7767, -96.797], "denver": [39.7392, -104.9903], "los-angeles": [34.0522, -118.2437],
  "san-diego": [32.7157, -117.1611], "houston": [29.7604, -95.3698], "portland": [45.5152, -122.6784],
  "toronto": [43.6532, -79.3832], "vancouver": [49.2827, -123.1207],
  "london": [51.5074, -0.1278], "dublin": [53.3498, -6.2603], "paris": [48.8566, 2.3522],
  "berlin": [52.52, 13.405], "munich": [48.1351, 11.582], "amsterdam": [52.3676, 4.9041],
  "zurich": [47.3769, 8.5417], "stockholm": [59.3293, 18.0686], "copenhagen": [55.6761, 12.5683],
  "barcelona": [41.3874, 2.1686], "lisbon": [38.7223, -9.1393], "milan": [45.4642, 9.19],
  "frankfurt": [50.1109, 8.6821], "oslo": [59.9139, 10.7522], "luxembourg": [49.6117, 6.13],
  "bristol": [51.4545, -2.5879], "edinburgh": [55.9533, -3.1883],
  "bangalore": [12.9716, 77.5946], "chennai": [13.0827, 80.2707], "delhi": [28.6139, 77.209],
  "hyderabad": [17.385, 78.4867], "mumbai": [19.076, 72.8777],
  "singapore": [1.3521, 103.8198], "tokyo": [35.6762, 139.6503], "seoul": [37.5665, 126.978],
  "melbourne": [-37.8136, 144.9631], "sydney": [-33.8688, 151.2093], "brisbane": [-27.4698, 153.0251],
  "auckland": [-36.8485, 174.7633],
  "tel-aviv": [32.0853, 34.7818], "cape-town": [-33.9249, 18.4241], "lagos": [6.5244, 3.3792],
  "mexico-city": [19.4326, -99.1332], "medellin": [6.2476, -75.5658],
  "global-sf": [37.78, -122.4], "global": [30, 0],
}

const REGION_COUNTRIES = {
  "sf-bay-area": "US", "nyc": "US", "boston": "US", "dc": "US", "atlanta": "US", "miami": "US",
  "seattle": "US", "chicago": "US", "austin": "US", "dallas": "US", "denver": "US",
  "los-angeles": "US", "san-diego": "US", "houston": "US", "portland": "US",
  "toronto": "CA", "vancouver": "CA",
  "london": "GB", "dublin": "IE", "paris": "FR", "berlin": "DE", "munich": "DE",
  "amsterdam": "NL", "zurich": "CH", "stockholm": "SE", "copenhagen": "DK",
  "barcelona": "ES", "lisbon": "PT", "milan": "IT", "frankfurt": "DE", "oslo": "NO",
  "luxembourg": "LU", "bristol": "GB", "edinburgh": "GB",
  "bangalore": "IN", "chennai": "IN", "delhi": "IN", "hyderabad": "IN", "mumbai": "IN",
  "singapore": "SG", "tokyo": "JP", "seoul": "KR",
  "melbourne": "AU", "sydney": "AU", "brisbane": "AU", "auckland": "NZ",
  "tel-aviv": "IL", "cape-town": "ZA", "lagos": "NG",
  "mexico-city": "MX", "medellin": "CO",
}

// Existing communities keyed by "network|regionId"
const existingKeys = new Set()
data.communities.forEach(c => {
  const lower = c.name.toLowerCase()
  if (lower.includes('aicamp')) existingKeys.add(`aicamp|${c.regionId}`)
  if (lower.includes('mlops')) existingKeys.add(`mlops|${c.regionId}`)
})

function addCommunity({ name, regionId, url, network, description }) {
  const key = `${network}|${regionId}`
  if (existingKeys.has(key)) return false

  const coords = REGION_COORDS[regionId]
  if (!coords) { console.warn(`  SKIP: no coords for region ${regionId}`); return false }

  // Jitter based on existing count in region
  const regionCount = data.communities.filter(c => c.regionId === regionId).length
  const angle = (2 * Math.PI * regionCount) / Math.max(regionCount + 1, 6)
  const radius = 0.02 + (regionCount % 3) * 0.008

  data.communities.push({
    id: slugify(name),
    name,
    regionId,
    country: REGION_COUNTRIES[regionId] || 'GLOBAL',
    priority: 0,
    tags: [],
    url,
    urls: [url],
    contact: { type: 'url', value: url },
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
    lat: parseFloat((coords[0] + radius * Math.cos(angle)).toFixed(5)),
    lng: parseFloat((coords[1] + radius * Math.sin(angle)).toFixed(5)),
  })

  existingKeys.add(key)
  return true
}

let added = 0

// ── AICamp chapters (scraped from aicamp.ai) ──
const aicampChapters = [
  { city: 'Silicon Valley', regionId: 'sf-bay-area', url: 'https://www.aicamp.ai/event/eventsquery?city=US-Silicon+Valley' },
  { city: 'Dallas', regionId: 'dallas', url: 'https://www.aicamp.ai/event/eventsquery?city=US-Dallas' },
  { city: 'San Diego', regionId: 'san-diego', url: 'https://www.aicamp.ai/event/eventsquery?city=US-San+Diego' },
  { city: 'Houston', regionId: 'houston', url: 'https://www.aicamp.ai/event/eventsquery?city=US-Houston' },
  { city: 'Los Angeles', regionId: 'los-angeles', url: 'https://www.aicamp.ai/event/eventsquery?city=US-Los+Angeles' },
  { city: 'Vancouver', regionId: 'vancouver', url: 'https://www.aicamp.ai/event/eventsquery?city=Canada-Vancouver' },
  { city: 'Munich', regionId: 'munich', url: 'https://www.aicamp.ai/event/eventsquery?city=Germany-Munich' },
  { city: 'Amsterdam', regionId: 'amsterdam', url: 'https://www.aicamp.ai/event/eventsquery?city=Netherlands-Amsterdam' },
  { city: 'Stockholm', regionId: 'stockholm', url: 'https://www.aicamp.ai/event/eventsquery?city=Sweden-Stockholm' },
  { city: 'Zürich', regionId: 'zurich', url: 'https://www.aicamp.ai/event/eventsquery?city=Switzerland-Zürich' },
  { city: 'Dublin', regionId: 'dublin', url: 'https://www.aicamp.ai/event/eventsquery?city=Ireland-Dublin' },
  { city: 'Copenhagen', regionId: 'copenhagen', url: 'https://www.aicamp.ai/event/eventsquery?city=Denmark-Copenhagen' },
  { city: 'Bangalore', regionId: 'bangalore', url: 'https://www.aicamp.ai/event/eventsquery?city=India-Bangalore' },
  { city: 'Chennai', regionId: 'chennai', url: 'https://www.aicamp.ai/event/eventsquery?city=India-Chennai' },
  { city: 'Delhi', regionId: 'delhi', url: 'https://www.aicamp.ai/event/eventsquery?city=India-Delhi' },
  { city: 'Hyderabad', regionId: 'hyderabad', url: 'https://www.aicamp.ai/event/eventsquery?city=India-Hyderabad' },
  { city: 'Mumbai', regionId: 'mumbai', url: 'https://www.aicamp.ai/event/eventsquery?city=India-Mumbai' },
  { city: 'Singapore', regionId: 'singapore', url: 'https://www.aicamp.ai/event/eventsquery?city=Singapore' },
  { city: 'Melbourne', regionId: 'melbourne', url: 'https://www.aicamp.ai/event/eventsquery?city=Australia-Melbourne' },
  { city: 'Sydney', regionId: 'sydney', url: 'https://www.aicamp.ai/event/eventsquery?city=Australia-Sydney' },
  { city: 'Brisbane', regionId: 'brisbane', url: 'https://www.aicamp.ai/event/eventsquery?city=Australia-Brisbane' },
  { city: 'Auckland', regionId: 'auckland', url: 'https://www.aicamp.ai/event/eventsquery?city=New+Zealand-Auckland' },
  { city: 'Tokyo', regionId: 'tokyo', url: 'https://www.aicamp.ai/event/eventsquery?city=Japan-Tokyo' },
  { city: 'Toronto', regionId: 'toronto', url: 'https://www.aicamp.ai/event/eventsquery?city=Canada-Toronto' },
]

for (const ch of aicampChapters) {
  if (addCommunity({
    name: `AICamp ${ch.city}`,
    regionId: ch.regionId,
    url: ch.url,
    network: 'aicamp',
    description: `${ch.city} chapter of AICamp, a global AI developer community with 500K+ members. Monthly tech talks with sponsor packages including speaking slots.`,
  })) { added++; console.log(`+ AICamp ${ch.city}`) }
}

// ── MLOps Community chapters (scraped from mlops.community/meetups) ──
const mlopsChapters = [
  { city: 'Cape Town', regionId: 'cape-town', url: 'https://lu.ma/capetown-mlops' },
  { city: 'Atlanta', regionId: 'atlanta', url: 'https://lu.ma/atlanta-mlops' },
  { city: 'Milan', regionId: 'milan', url: 'https://lu.ma/milan-mlops' },
  { city: 'Miami', regionId: 'miami', url: 'https://lu.ma/miami-mlops' },
  { city: 'New York', regionId: 'nyc', url: 'https://www.meetup.com/MLOps-NYC/' },
  { city: 'Tel Aviv', regionId: 'tel-aviv', url: 'https://lu.ma/telavivyafo-mlops' },
  { city: 'Paris', regionId: 'paris', url: 'https://lu.ma/paris-mlops' },
  { city: 'Lisbon', regionId: 'lisbon', url: 'https://lu.ma/lisbon-mlops' },
  { city: 'Frankfurt', regionId: 'frankfurt', url: 'https://lu.ma/frankfurt-mlops' },
  { city: 'Amsterdam', regionId: 'amsterdam', url: 'https://www.meetup.com/amsterdam-mlops-community/' },
  { city: 'Bangalore', regionId: 'bangalore', url: 'https://lu.ma/india-mlops' },
  { city: 'Barcelona', regionId: 'barcelona', url: 'https://lu.ma/barcelona-mlops' },
  { city: 'Chicago', regionId: 'chicago', url: 'https://lu.ma/chicago-mlops' },
  { city: 'Boston', regionId: 'boston', url: 'https://lu.ma/boston-mlops' },
  { city: 'Toronto', regionId: 'toronto', url: 'https://lu.ma/toronto-mlops' },
  { city: 'Bristol', regionId: 'bristol', url: 'https://lu.ma/bristol-mlops' },
  { city: 'Chennai', regionId: 'chennai', url: 'https://www.meetup.com/chennai-mlops-community/' },
  { city: 'Copenhagen', regionId: 'copenhagen', url: 'https://lu.ma/copenhagen-mlops' },
  { city: 'Delhi', regionId: 'delhi', url: 'https://www.meetup.com/delhi-mlops-community/' },
  { city: 'Denver', regionId: 'denver', url: 'https://www.meetup.com/denver-mlops-community/' },
  { city: 'Lagos', regionId: 'lagos', url: 'https://lu.ma/lagos-mlops' },
  { city: 'Los Angeles', regionId: 'los-angeles', url: 'https://lu.ma/losangeles-mlops' },
  { city: 'Luxembourg', regionId: 'luxembourg', url: 'https://lu.ma/luxembourg-mlops' },
  { city: 'Melbourne', regionId: 'melbourne', url: 'https://lu.ma/melbourne-mlops' },
  { city: 'Mexico City', regionId: 'mexico-city', url: 'https://lu.ma/mexicocity-mlops' },
  { city: 'Mumbai', regionId: 'mumbai', url: 'https://www.meetup.com/mumbai-mlops/' },
  { city: 'Munich', regionId: 'munich', url: 'https://lu.ma/munich-mlops' },
  { city: 'Oslo', regionId: 'oslo', url: 'https://lu.ma/oslo-mlops' },
  { city: 'Scotland', regionId: 'edinburgh', url: 'https://lu.ma/scotland-mlops' },
  { city: 'Seattle', regionId: 'seattle', url: 'https://lu.ma/seattle-mlops' },
  { city: 'Stockholm', regionId: 'stockholm', url: 'https://www.meetup.com/stockholm-mlops-community/' },
  { city: 'Switzerland', regionId: 'zurich', url: 'https://lu.ma/switzerland-mlops' },
  { city: 'Sydney', regionId: 'sydney', url: 'https://lu.ma/sydney-mlops' },
  { city: 'Washington DC', regionId: 'dc', url: 'https://lu.ma/washington-mlops' },
  { city: 'Seoul', regionId: 'seoul', url: 'https://lu.ma/seoul-mlops' },
  { city: 'Medellín', regionId: 'medellin', url: 'https://lu.ma/medellin-mlops' },
]

for (const ch of mlopsChapters) {
  if (addCommunity({
    name: `MLOps Community ${ch.city}`,
    regionId: ch.regionId,
    url: ch.url,
    network: 'mlops',
    description: `${ch.city} chapter of the global MLOps Community (85,000+ AI/ML practitioners across 37+ cities). Monthly in-person meetups covering production ML and agentic MLOps.`,
  })) { added++; console.log(`+ MLOps Community ${ch.city}`) }
}

// Update metadata
data.metadata.totalCommunities = data.communities.length
data.metadata.totalRegions = new Set(data.communities.map(c => c.regionId)).size
data.metadata.generatedAt = new Date().toISOString()

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2))
console.log(`\nDone. Added ${added} new chapters. Total: ${data.communities.length} communities across ${data.metadata.totalRegions} regions.`)
