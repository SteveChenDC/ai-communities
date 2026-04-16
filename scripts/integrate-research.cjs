#!/usr/bin/env node
/**
 * Merge research data from multiple JSON files into src/data/communities.json
 * Adds: founded, organizers, cadence, lastEvent, social fields to each community
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'src/data/communities.json');

// Collect all research data from various files
const researchFiles = [
  path.join(ROOT, 'scripts/research-london-1.json'),
  path.join(ROOT, 'scripts/research-sf.json'),
  path.join(ROOT, 'scripts/research-nyc.json'),
  path.join(ROOT, 'scripts/research-sea-chi-minn-atx.json'),
  path.join(ROOT, 'community-research.json'),
  path.join(ROOT, 'communities.json'),
  path.join(ROOT, 'london-pt2-dublin-communities.json'),
];

// Also inline the Rest of Europe + Mox data
const restEuropeMox = {
  "ai-tinkerers-barcelona": { "founded": "2024", "organizers": ["Luca Borella", "Raul Berganza Gomez"], "cadence": "monthly", "lastEvent": "2026-03", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/company/ai-tinkerers" }, "notes": "Part of global AI Tinkerers. First known event: Structured Finance Hackathon on 2024-06-05." },
  "madrid-ai": { "founded": null, "organizers": ["Jimmy Guerrero"], "cadence": "monthly", "lastEvent": "2026-04-09", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/in/jiguerrero/" }, "notes": "562 members. Sponsored by Voxel51. Jimmy Guerrero is VP Marketing at Voxel51." },
  "ml": { "founded": "2023", "organizers": ["Joshua Wöhle"], "cadence": "monthly", "lastEvent": "2026-03-19", "social": { "twitter": "@MindstoneHQ", "linkedin": "https://www.linkedin.com/company/mindstonehq" }, "notes": "978 members. Part of Mindstone #PracticalAI Community (35 groups globally). Three-talk format." },
  "ai-tinkerers-warsaw": { "founded": "2024-11", "organizers": ["Tom Aniol", "Artur Wala", "Bartosz Kolasa"], "cadence": "monthly", "lastEvent": "2026-03-04", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/company/ai-tinkerers" }, "notes": "First meetup Nov 21, 2024. Expanding to Poznan and Wroclaw. Hosted OpenAI and Google DeepMind hackathons." },
  "ai-tinkerers-stockholm": { "founded": null, "organizers": null, "cadence": "monthly", "lastEvent": null, "social": { "twitter": null, "linkedin": "https://www.linkedin.com/company/ai-tinkerers" }, "notes": "Part of global AI Tinkerers. Members include ElevenLabs, Volvo Cars, Sana, Mentimeter." },
  "stockholm-ai": { "founded": "2015", "organizers": ["Ali Leylani", "Armin Catovic", "Christoffer Stuart", "Alex Patow"], "cadence": "irregular", "lastEvent": null, "social": { "twitter": "@sthlmai", "linkedin": "https://www.linkedin.com/company/stockholm-ai/" }, "notes": "Non-profit grassroots association. First AI Summit March 2015." },
  "ai-meetup-copenhagen": { "founded": "2024", "organizers": ["Martin Schultz"], "cadence": "quarterly", "lastEvent": "2026-02-19", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/company/ai-meetup-copenhagen" }, "notes": "1,172 members. Martin Schultz is Founder & CEO of Transmission." },
  "helsinki-ai-meetup": { "founded": "2026-02", "organizers": ["Helsinki XR Center", "Digiole"], "cadence": "monthly", "lastEvent": "2026-04", "social": { "twitter": "@helsinkixr", "linkedin": "https://www.linkedin.com/company/helsinkixrcenter" }, "notes": "Very new -- launched Feb 11, 2026. Peer-led, hands-on AI working sessions." },
  "ai-club-nordics": { "founded": null, "organizers": ["Charles A."], "cadence": "irregular", "lastEvent": "2025-04-28", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/groups/10071202/" }, "notes": "1,228 members. Collaborates with Agentics Foundation." },
  "vienna-ai-engineering": { "founded": "2015", "organizers": ["Bogdan Pirvu", "Alex Gavrilescu"], "cadence": "irregular", "lastEvent": "2026-03-10", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/in/bogdan-pirvu/" }, "notes": "3,124 members. Originally 'Vienna Spark Meetup' (2015). Alex Gavrilescu is OpenAI Codex Ambassador." },
  "ai-tinkerers-prague": { "founded": "2024-09", "organizers": ["Marek Miltner"], "cadence": "monthly", "lastEvent": "2026-02-26", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/in/marek-miltner/" }, "notes": "Launch event Sep 2024 at CTU. Marek Miltner is Researcher at Stanford/CVUT." },
  "generative-ai-belgium": { "founded": "2023", "organizers": ["Rémi Delanghe"], "cadence": "irregular", "lastEvent": "2025-03-05", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/company/generative-ai-belgium" }, "notes": "4,222 members. Rémi Delanghe is ML Lead at In The Pocket." },
  "ai-community-belgium": { "founded": "2014", "organizers": ["Sam Rédelé"], "cadence": "irregular", "lastEvent": "2025-03-05", "social": { "twitter": "@samredele", "linkedin": "https://www.linkedin.com/in/samredele" }, "notes": "4,262 members. Originally 'Data Science Belgium Community' (2014). 224 past events. 6 city chapters." },
  "mindstone-lisbon": { "founded": "2023-11", "organizers": ["Joshua Wöhle"], "cadence": "monthly", "lastEvent": "2026-03-25", "social": { "twitter": "@MindstoneHQ", "linkedin": "https://www.linkedin.com/company/mindstonehq" }, "notes": "989 members. First Lisbon event Nov 14, 2023 at LX Factory during Portugal Tech Week." },
  "hands-on-ai-lisbon": { "founded": null, "organizers": ["Alex Russo"], "cadence": "irregular", "lastEvent": "2025-09-09", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/in/alessandro-russo-wym/" }, "notes": "542 members. Alex Russo is a 3x founder and applied AI educator." },
  "prague-gen-ai": { "founded": "2023", "organizers": ["Petr Brzek", "Jitka Vrtělová", "Martin Repka"], "cadence": "monthly", "lastEvent": "2026-04-02", "social": { "twitter": null, "linkedin": "https://www.linkedin.com/in/petr-brzek-76359417/" }, "notes": "1,672 members. Petr Brzek is co-founder of Avocode and CEO of Langtail/Macaly." },
  "warsawai": { "founded": "2017", "organizers": ["Marek Cygan", "Paweł Gora", "Kacper Nowicki", "Tomasz Trzciński"], "cadence": "monthly", "lastEvent": "2026-03-26", "social": { "twitter": "@warsawaigroup", "linkedin": "https://www.linkedin.com/groups/7481210/" }, "notes": "First event June 27, 2017. Now organized by Fundacja Quantum AI. Weekly newsletter." },
  "mox-sf": { "founded": "2025-02", "organizers": ["Austin Chen", "Rachel Shu"], "cadence": "daily", "lastEvent": "2026-04", "social": { "twitter": "@moxspace", "linkedin": null }, "notes": "Launched Feb 15, 2025. 188 members. SF's largest AI safety community space. 20k sq ft venue." },
};

// Load all research data
const allResearch = {};

for (const file of researchFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [id, info] of Object.entries(data)) {
      allResearch[id] = info;
    }
    console.log(`Loaded ${Object.keys(data).length} entries from ${path.basename(file)}`);
  } catch (e) {
    console.log(`Skipping ${path.basename(file)}: ${e.message}`);
  }
}

// Add inline data
for (const [id, info] of Object.entries(restEuropeMox)) {
  allResearch[id] = info;
}
console.log(`Added ${Object.keys(restEuropeMox).length} inline entries (Rest of Europe + Mox)`);
console.log(`Total research entries: ${Object.keys(allResearch).length}`);

// Load main data file
const mainData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
console.log(`\nMain data file: ${mainData.communities.length} communities`);

// Merge research into communities
let matched = 0;
let unmatched = 0;
for (const community of mainData.communities) {
  const research = allResearch[community.id];
  if (research) {
    community.founded = research.founded || null;
    community.organizers = research.organizers || null;
    // Only override cadence if we have research data
    if (research.cadence) community.cadence = research.cadence;
    community.lastEvent = research.lastEvent || null;
    community.social = research.social || { twitter: null, linkedin: null };
    if (research.platformUrl) community.platformUrl = research.platformUrl;
    if (research.notes) community.researchNotes = research.notes;
    matched++;
  } else {
    // Add empty fields for consistency
    if (!community.founded) community.founded = null;
    if (!community.organizers) community.organizers = null;
    if (!community.cadence) community.cadence = null;
    if (!community.lastEvent) community.lastEvent = null;
    if (!community.social) community.social = { twitter: null, linkedin: null };
    unmatched++;
  }
}

console.log(`Matched: ${matched} communities`);
console.log(`Unmatched: ${unmatched} communities (new chapters without research)`);

// Write back
fs.writeFileSync(DATA_FILE, JSON.stringify(mainData, null, 2) + '\n');
console.log(`\nWrote updated data to ${DATA_FILE}`);
