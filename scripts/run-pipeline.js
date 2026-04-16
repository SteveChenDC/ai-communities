#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { loadCommunities } from './scraper-utils.js'

function snapshot() {
  const data = loadCommunities()
  const eventCount = data.communities.reduce((sum, c) => sum + (c.events?.length || 0), 0)
  return {
    communities: data.communities.length,
    events: eventCount,
  }
}

function runScript(script) {
  return new Promise((resolve) => {
    const child = spawn('node', [script], { stdio: 'inherit' })
    child.on('close', (code) => resolve(code === 0))
  })
}

async function main() {
  const before = snapshot()
  console.log(`Before: ${before.communities} communities, ${before.events} events`)

  const discoveryOk = await runScript('scripts/discover-chapters.js')
  if (!discoveryOk) console.warn('Discovery failed, continuing to event scraping...')

  const scrapeOk = await runScript('scripts/scrape-events.js')
  if (!scrapeOk) console.warn('Event scraping exited non-zero.')

  const after = snapshot()
  console.log('\nPipeline complete')
  console.log(`Before communities: ${before.communities}`)
  console.log(`After communities:  ${after.communities}`)
  console.log(`Delta communities:  ${after.communities - before.communities}`)
  console.log(`Before events:      ${before.events}`)
  console.log(`After events:       ${after.events}`)
  console.log(`Delta events:       ${after.events - before.events}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
