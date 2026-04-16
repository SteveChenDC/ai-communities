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

  // --- ASIA-PACIFIC ---
  "bangalore":          { name: "Bangalore",              lat: 12.9716,  lng: 77.5946,   country: "IN" },
  "chennai":            { name: "Chennai",                lat: 13.0827,  lng: 80.2707,   country: "IN" },
  "delhi":              { name: "Delhi",                  lat: 28.6139,  lng: 77.2090,   country: "IN" },
  "hyderabad":          { name: "Hyderabad",              lat: 17.3850,  lng: 78.4867,   country: "IN" },
  "mumbai":             { name: "Mumbai",                 lat: 19.0760,  lng: 72.8777,   country: "IN" },
  "singapore":          { name: "Singapore",              lat: 1.3521,   lng: 103.8198,  country: "SG" },
  "tokyo":              { name: "Tokyo",                  lat: 35.6762,  lng: 139.6503,  country: "JP" },
  "seoul":              { name: "Seoul",                  lat: 37.5665,  lng: 126.9780,  country: "KR" },
  "melbourne":          { name: "Melbourne",              lat: -37.8136, lng: 144.9631,  country: "AU" },
  "sydney":             { name: "Sydney",                 lat: -33.8688, lng: 151.2093,  country: "AU" },
  "brisbane":           { name: "Brisbane",               lat: -27.4698, lng: 153.0251,  country: "AU" },
  "auckland":           { name: "Auckland",               lat: -36.8485, lng: 174.7633,  country: "NZ" },

  // --- AMERICAS (new) ---
  "vancouver":          { name: "Vancouver",              lat: 49.2827,  lng: -123.1207, country: "CA" },
  "san-diego":          { name: "San Diego",              lat: 32.7157,  lng: -117.1611, country: "US" },
  "houston":            { name: "Houston",                lat: 29.7604,  lng: -95.3698,  country: "US" },
  "mexico-city":        { name: "Mexico City",            lat: 19.4326,  lng: -99.1332,  country: "MX" },
  "medellin":           { name: "Medellín",               lat: 6.2476,   lng: -75.5658,  country: "CO" },

  // --- EUROPE (new) ---
  "milan":              { name: "Milan",                  lat: 45.4642,  lng: 9.1900,    country: "IT" },
  "frankfurt":          { name: "Frankfurt",              lat: 50.1109,  lng: 8.6821,    country: "DE" },
  "oslo":               { name: "Oslo",                   lat: 59.9139,  lng: 10.7522,   country: "NO" },
  "luxembourg":         { name: "Luxembourg",             lat: 49.6117,  lng: 6.1300,    country: "LU" },

  // --- MIDDLE EAST / AFRICA ---
  "tel-aviv":           { name: "Tel Aviv",               lat: 32.0853,  lng: 34.7818,   country: "IL" },
  "cape-town":          { name: "Cape Town",              lat: -33.9249, lng: 18.4241,   country: "ZA" },
  "lagos":              { name: "Lagos",                  lat: 6.5244,   lng: 3.3792,    country: "NG" },

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
