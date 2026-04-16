#!/usr/bin/env node
import { loadCommunities } from './scraper-utils.js'

function networkOf(name = '') {
  const n = name.toLowerCase()
  if (n.includes('ai tinkerers')) return 'AI Tinkerers'
  if (n.includes('aicamp')) return 'AICamp'
  if (n.includes('mlops')) return 'MLOps'
  if (n.includes('genai collective')) return 'GenAI Collective'
  return 'Other'
}

function platformOf(community) {
  const url = (community.url || community.platformUrl || '').toLowerCase()
  if (url.includes('meetup.com')) return 'Meetup'
  if (url.includes('lu.ma') || url.includes('luma.com')) return 'Lu.ma'
  if (url.includes('aicamp.ai')) return 'AICamp'
  if (url.includes('aitinkerers.org')) return 'AI Tinkerers'
  if (!url) return 'Missing'
  return 'Other'
}

function countBy(items, keyFn) {
  const out = {}
  for (const item of items) {
    const key = keyFn(item)
    out[key] = (out[key] || 0) + 1
  }
  return out
}

function eventsInDays(communities, days) {
  const now = new Date()
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  const endStr = end.toISOString().slice(0, 10)
  const startStr = now.toISOString().slice(0, 10)
  let count = 0
  for (const c of communities) {
    for (const ev of c.events || []) {
      if (ev.date >= startStr && ev.date <= endStr) count += 1
    }
  }
  return count
}

function printTable(title, map) {
  console.log(`\n${title}`)
  for (const [k, v] of Object.entries(map).sort((a, b) => b[1] - a[1])) {
    console.log(`- ${k}: ${v}`)
  }
}

function main() {
  const data = loadCommunities()
  const communities = data.communities

  const withEvents = communities.filter((c) => (c.events || []).length > 0).length
  const withoutEvents = communities.length - withEvents

  printTable('Communities by network', countBy(communities, (c) => networkOf(c.name)))
  console.log('\nCommunities event coverage')
  console.log(`- With events: ${withEvents}`)
  console.log(`- Without events: ${withoutEvents}`)

  console.log('\nUpcoming events windows')
  console.log(`- Next 30 days: ${eventsInDays(communities, 30)}`)
  console.log(`- Next 60 days: ${eventsInDays(communities, 60)}`)
  console.log(`- Next 90 days: ${eventsInDays(communities, 90)}`)

  printTable('Platform breakdown', countBy(communities, (c) => platformOf(c)))
}

main()
