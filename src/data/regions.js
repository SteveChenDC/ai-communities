// Static geocoding lookup for all metro areas in the report.
// Communities in the same region get deterministic jitter offsets in parse-markdown.js.

export const REGIONS = {
  // --- UNITED STATES ---
  "sf-bay-area":        { name: "San Francisco Bay Area", lat: 37.7749,  lng: -122.4194, country: "US" },
  "nyc":                { name: "New York City",          lat: 40.7128,  lng: -74.0060,  country: "US" },
  "boston":              { name: "Boston / Cambridge",     lat: 42.3601,  lng: -71.0589,  country: "US" },
  "dc":                 { name: "Washington DC / DMV",    lat: 38.9072,  lng: -77.0369,  country: "US" },
  "philadelphia":       { name: "Philadelphia",           lat: 39.9526,  lng: -75.1652,  country: "US" },
  "atlanta":            { name: "Atlanta",                lat: 33.7490,  lng: -84.3880,  country: "US" },
  "miami":              { name: "Miami",                  lat: 25.7617,  lng: -80.1918,  country: "US" },
  "los-angeles":        { name: "Los Angeles / SoCal",    lat: 34.0522,  lng: -118.2437, country: "US" },
  "seattle":            { name: "Seattle",                lat: 47.6062,  lng: -122.3321, country: "US" },
  "chicago":            { name: "Chicago",                lat: 41.8781,  lng: -87.6298,  country: "US" },
  "austin":             { name: "Austin / Texas",         lat: 30.2672,  lng: -97.7431,  country: "US" },
  "dallas":             { name: "Dallas / Fort Worth",    lat: 32.7767,  lng: -96.7970,  country: "US" },
  "denver":             { name: "Denver / Boulder",       lat: 39.7392,  lng: -104.9903, country: "US" },
  "portland":           { name: "Portland",               lat: 45.5152,  lng: -122.6784, country: "US" },
  "minneapolis":        { name: "Minneapolis / Twin Cities", lat: 44.9778, lng: -93.2650, country: "US" },
  "toronto":            { name: "Toronto",                lat: 43.6532,  lng: -79.3832,  country: "CA" },

  // --- EUROPE: UK + Ireland ---
  "london":             { name: "London",                 lat: 51.5074,  lng: -0.1278,   country: "GB" },
  "dublin":             { name: "Dublin",                 lat: 53.3498,  lng: -6.2603,   country: "IE" },
  "manchester":         { name: "Manchester",             lat: 53.4808,  lng: -2.2426,   country: "GB" },
  "edinburgh":          { name: "Edinburgh",              lat: 55.9533,  lng: -3.1883,   country: "GB" },
  "cambridge-uk":       { name: "Cambridge (UK)",         lat: 52.2053,  lng: 0.1218,    country: "GB" },
  "oxford":             { name: "Oxford",                 lat: 51.7520,  lng: -1.2577,   country: "GB" },
  "birmingham":         { name: "Birmingham",             lat: 52.4862,  lng: -1.8904,   country: "GB" },
  "leeds":              { name: "Leeds",                  lat: 53.8008,  lng: -1.5491,   country: "GB" },
  "bristol":            { name: "Bristol",                lat: 51.4545,  lng: -2.5879,   country: "GB" },

  // --- EUROPE: Germany ---
  "berlin":             { name: "Berlin",                 lat: 52.5200,  lng: 13.4050,   country: "DE" },
  "munich":             { name: "Munich",                 lat: 48.1351,  lng: 11.5820,   country: "DE" },

  // --- EUROPE: France ---
  "paris":              { name: "Paris",                  lat: 48.8566,  lng: 2.3522,    country: "FR" },

  // --- EUROPE: Netherlands ---
  "amsterdam":          { name: "Amsterdam",              lat: 52.3676,  lng: 4.9041,    country: "NL" },

  // --- EUROPE: Switzerland ---
  "geneva":             { name: "Geneva",                 lat: 46.2044,  lng: 6.1432,    country: "CH" },
  "lausanne":           { name: "Lausanne",               lat: 46.5197,  lng: 6.6323,    country: "CH" },
  "zurich":             { name: "Zürich",                 lat: 47.3769,  lng: 8.5417,    country: "CH" },

  // --- EUROPE: Spain ---
  "barcelona":          { name: "Barcelona",              lat: 41.3874,  lng: 2.1686,    country: "ES" },
  "madrid":             { name: "Madrid",                 lat: 40.4168,  lng: -3.7038,   country: "ES" },

  // --- EUROPE: Nordics + Poland ---
  "warsaw":             { name: "Warsaw",                 lat: 52.2297,  lng: 21.0122,   country: "PL" },
  "stockholm":          { name: "Stockholm",              lat: 59.3293,  lng: 18.0686,   country: "SE" },
  "copenhagen":         { name: "Copenhagen",             lat: 55.6761,  lng: 12.5683,   country: "DK" },
  "helsinki":            { name: "Helsinki",               lat: 60.1699,  lng: 24.9384,   country: "FI" },

  // --- EUROPE: Other ---
  "vienna":             { name: "Vienna",                 lat: 48.2082,  lng: 16.3738,   country: "AT" },
  "prague":             { name: "Prague",                 lat: 50.0755,  lng: 14.4378,   country: "CZ" },
  "brussels":           { name: "Brussels",               lat: 50.8503,  lng: 4.3517,    country: "BE" },
  "lisbon":             { name: "Lisbon",                 lat: 38.7223,  lng: -9.1393,   country: "PT" },

  // --- GLOBAL (pinned to primary city or centroid) ---
  "global":             { name: "Global",                 lat: 30.0,     lng: 0.0,       country: "GLOBAL" },
  "global-sf":          { name: "Global (SF-based)",      lat: 37.78,    lng: -122.40,   country: "GLOBAL" },
}

// Map fuzzy region names from markdown section headers to region IDs
export const REGION_ALIASES = {
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
  "uk outside london + ireland": "london",  // default; individual communities may override
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
