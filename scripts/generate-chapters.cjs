#!/usr/bin/env node
/**
 * Generate community entries for all discovered AI Tinkerers, AI Collective,
 * and AICamp chapters not already in communities.json
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../src/data/communities.json');
const REGIONS_FILE = path.resolve(__dirname, '../src/data/regions.js');

// ── Comprehensive geocoding database ──
const CITY_GEO = {
  // US
  "sf": { lat: 37.7749, lng: -122.4194, region: "sf-bay-area", country: "US", name: "San Francisco" },
  "palo-alto": { lat: 37.4419, lng: -122.1430, region: "sf-bay-area", country: "US", name: "Palo Alto" },
  "san-jose": { lat: 37.3382, lng: -121.8863, region: "sf-bay-area", country: "US", name: "San Jose" },
  "pleasanton": { lat: 37.6624, lng: -121.8747, region: "sf-bay-area", country: "US", name: "Pleasanton" },
  "santa-barbara": { lat: 34.4208, lng: -119.6982, region: "los-angeles", country: "US", name: "Santa Barbara" },
  "orange-county": { lat: 33.7175, lng: -117.8311, region: "los-angeles", country: "US", name: "Orange County" },
  "nyc": { lat: 40.7128, lng: -74.0060, region: "nyc", country: "US", name: "New York City" },
  "boston": { lat: 42.3601, lng: -71.0589, region: "boston", country: "US", name: "Boston" },
  "dc": { lat: 38.9072, lng: -77.0369, region: "dc", country: "US", name: "Washington DC" },
  "philadelphia": { lat: 39.9526, lng: -75.1652, region: "philadelphia", country: "US", name: "Philadelphia" },
  "atlanta": { lat: 33.7490, lng: -84.3880, region: "atlanta", country: "US", name: "Atlanta" },
  "miami": { lat: 25.7617, lng: -80.1918, region: "miami", country: "US", name: "Miami" },
  "la": { lat: 34.0522, lng: -118.2437, region: "los-angeles", country: "US", name: "Los Angeles" },
  "seattle": { lat: 47.6062, lng: -122.3321, region: "seattle", country: "US", name: "Seattle" },
  "chicago": { lat: 41.8781, lng: -87.6298, region: "chicago", country: "US", name: "Chicago" },
  "austin": { lat: 30.2672, lng: -97.7431, region: "austin", country: "US", name: "Austin" },
  "dallas-fort-worth": { lat: 32.7767, lng: -96.7970, region: "dallas", country: "US", name: "Dallas Fort Worth" },
  "denver-boulder": { lat: 39.7392, lng: -104.9903, region: "denver", country: "US", name: "Denver / Boulder" },
  "portland": { lat: 45.5152, lng: -122.6784, region: "portland", country: "US", name: "Portland" },
  "minneapolis-saint-paul": { lat: 44.9778, lng: -93.2650, region: "minneapolis", country: "US", name: "Minneapolis" },
  "san-diego": { lat: 32.7157, lng: -117.1611, region: "san-diego", country: "US", name: "San Diego" },
  "houston": { lat: 29.7604, lng: -95.3698, region: "houston", country: "US", name: "Houston" },
  "phoenix": { lat: 33.4484, lng: -112.0740, region: "phoenix", country: "US", name: "Phoenix" },
  "las-vegas": { lat: 36.1699, lng: -115.1398, region: "las-vegas", country: "US", name: "Las Vegas" },
  "nashville": { lat: 36.1627, lng: -86.7816, region: "nashville", country: "US", name: "Nashville" },
  "raleigh": { lat: 35.7796, lng: -78.6382, region: "raleigh", country: "US", name: "Raleigh" },
  "pittsburgh": { lat: 40.4406, lng: -79.9959, region: "pittsburgh", country: "US", name: "Pittsburgh" },
  "columbus": { lat: 39.9612, lng: -82.9988, region: "columbus", country: "US", name: "Columbus" },
  "cincinnati": { lat: 39.1031, lng: -84.5120, region: "cincinnati", country: "US", name: "Cincinnati" },
  "sacramento": { lat: 38.5816, lng: -121.4944, region: "sacramento", country: "US", name: "Sacramento" },
  "boise": { lat: 43.6150, lng: -116.2023, region: "boise", country: "US", name: "Boise" },
  "honolulu": { lat: 21.3069, lng: -157.8583, region: "honolulu", country: "US", name: "Honolulu" },
  "anchorage": { lat: 61.2181, lng: -149.9003, region: "anchorage", country: "US", name: "Anchorage" },
  "tucson": { lat: 32.2226, lng: -110.9747, region: "tucson", country: "US", name: "Tucson" },
  "tulsa": { lat: 36.1540, lng: -95.9928, region: "tulsa", country: "US", name: "Tulsa" },
  "oklahoma-city": { lat: 35.4676, lng: -97.5164, region: "oklahoma-city", country: "US", name: "Oklahoma City" },
  "st-louis": { lat: 38.6270, lng: -90.1994, region: "st-louis", country: "US", name: "St Louis" },
  "ann-arbor": { lat: 42.2808, lng: -83.7430, region: "ann-arbor", country: "US", name: "Ann Arbor" },
  "lehi": { lat: 40.3916, lng: -111.8508, region: "lehi", country: "US", name: "Lehi" },
  "slc": { lat: 40.7608, lng: -111.8910, region: "salt-lake-city", country: "US", name: "Salt Lake City" },
  "pensacola": { lat: 30.4213, lng: -87.2169, region: "pensacola", country: "US", name: "Pensacola" },
  "durango": { lat: 37.2753, lng: -107.8801, region: "durango", country: "US", name: "Durango" },
  "fort-wayne": { lat: 41.0793, lng: -85.1394, region: "fort-wayne", country: "US", name: "Fort Wayne" },
  "lafayette": { lat: 30.2241, lng: -92.0198, region: "lafayette", country: "US", name: "Lafayette" },
  "lincoln-omaha": { lat: 41.2565, lng: -95.9345, region: "lincoln-omaha", country: "US", name: "Lincoln / Omaha" },
  "princeton": { lat: 40.3573, lng: -74.6672, region: "princeton", country: "US", name: "Princeton" },
  "upstate-ny": { lat: 42.6526, lng: -73.7562, region: "upstate-ny", country: "US", name: "Upstate NY" },
  "hudson-valley": { lat: 41.4395, lng: -74.0229, region: "hudson-valley", country: "US", name: "Hudson Valley" },
  "fairfield-county": { lat: 41.1175, lng: -73.3253, region: "fairfield-county", country: "US", name: "Fairfield County" },
  "lynnwood": { lat: 47.8209, lng: -122.3151, region: "seattle", country: "US", name: "Lynnwood" },
  "manchester-nh": { lat: 42.9956, lng: -71.4548, region: "manchester-nh", country: "US", name: "Manchester NH" },
  "woodstock": { lat: 42.0409, lng: -74.1182, region: "woodstock", country: "US", name: "Woodstock" },

  // Canada
  "toronto": { lat: 43.6532, lng: -79.3832, region: "toronto", country: "CA", name: "Toronto" },
  "vancouver": { lat: 49.2827, lng: -123.1207, region: "vancouver", country: "CA", name: "Vancouver" },
  "montreal": { lat: 45.5017, lng: -73.5673, region: "montreal", country: "CA", name: "Montreal" },
  "calgary": { lat: 51.0447, lng: -114.0719, region: "calgary", country: "CA", name: "Calgary" },
  "edmonton": { lat: 53.5461, lng: -113.4938, region: "edmonton", country: "CA", name: "Edmonton" },
  "ottawa": { lat: 45.4215, lng: -75.6972, region: "ottawa", country: "CA", name: "Ottawa" },
  "waterloo": { lat: 43.4643, lng: -80.5204, region: "waterloo", country: "CA", name: "Waterloo" },
  "brampton": { lat: 43.7315, lng: -79.7624, region: "toronto", country: "CA", name: "Brampton" },
  "gatineau": { lat: 45.4765, lng: -75.7013, region: "ottawa", country: "CA", name: "Gatineau" },
  "fort-mcmurray": { lat: 56.7264, lng: -111.3803, region: "fort-mcmurray", country: "CA", name: "Fort McMurray" },

  // UK & Ireland
  "london": { lat: 51.5074, lng: -0.1278, region: "london", country: "GB", name: "London" },
  "dublin": { lat: 53.3498, lng: -6.2603, region: "dublin", country: "IE", name: "Dublin" },
  "edinburgh": { lat: 55.9533, lng: -3.1883, region: "edinburgh", country: "GB", name: "Edinburgh" },
  "manchester": { lat: 53.4808, lng: -2.2426, region: "manchester", country: "GB", name: "Manchester" },
  "cambridge": { lat: 52.2053, lng: 0.1218, region: "cambridge-uk", country: "GB", name: "Cambridge" },
  "bristol-uk": { lat: 51.4545, lng: -2.5879, region: "bristol", country: "GB", name: "Bristol" },
  "cardiff": { lat: 51.4816, lng: -3.1791, region: "cardiff", country: "GB", name: "Cardiff" },
  "liverpool": { lat: 53.4084, lng: -2.9916, region: "liverpool", country: "GB", name: "Liverpool" },
  "southampton": { lat: 50.9097, lng: -1.4044, region: "southampton", country: "GB", name: "Southampton" },

  // Europe: Germany
  "berlin": { lat: 52.5200, lng: 13.4050, region: "berlin", country: "DE", name: "Berlin" },
  "munich": { lat: 48.1351, lng: 11.5820, region: "munich", country: "DE", name: "Munich" },
  "hamburg": { lat: 53.5511, lng: 9.9937, region: "hamburg", country: "DE", name: "Hamburg" },
  "cologne": { lat: 50.9375, lng: 6.9603, region: "cologne", country: "DE", name: "Cologne" },
  "frankfurt": { lat: 50.1109, lng: 8.6821, region: "frankfurt", country: "DE", name: "Frankfurt" },
  "stuttgart": { lat: 48.7758, lng: 9.1829, region: "stuttgart", country: "DE", name: "Stuttgart" },
  "bonn": { lat: 50.7374, lng: 7.0982, region: "bonn", country: "DE", name: "Bonn" },
  "bremen": { lat: 53.0793, lng: 8.8017, region: "bremen", country: "DE", name: "Bremen" },
  "karlsruhe": { lat: 49.0069, lng: 8.4037, region: "karlsruhe", country: "DE", name: "Karlsruhe" },
  "nurnberg": { lat: 49.4521, lng: 11.0767, region: "nurnberg", country: "DE", name: "Nuremberg" },
  "mainz": { lat: 49.9929, lng: 8.2473, region: "mainz", country: "DE", name: "Mainz" },
  "regensburg": { lat: 49.0134, lng: 12.1016, region: "regensburg", country: "DE", name: "Regensburg" },

  // Europe: France
  "paris": { lat: 48.8566, lng: 2.3522, region: "paris", country: "FR", name: "Paris" },
  "toulouse": { lat: 43.6047, lng: 1.4442, region: "toulouse", country: "FR", name: "Toulouse" },
  "lille": { lat: 50.6292, lng: 3.0573, region: "lille", country: "FR", name: "Lille" },

  // Europe: Netherlands/Belgium
  "amsterdam": { lat: 52.3676, lng: 4.9041, region: "amsterdam", country: "NL", name: "Amsterdam" },
  "eindhoven": { lat: 51.4416, lng: 5.4697, region: "eindhoven", country: "NL", name: "Eindhoven" },
  "groningen": { lat: 53.2194, lng: 6.5665, region: "groningen", country: "NL", name: "Groningen" },
  "brussels": { lat: 50.8503, lng: 4.3517, region: "brussels", country: "BE", name: "Brussels" },
  "ghent": { lat: 51.0543, lng: 3.7174, region: "ghent", country: "BE", name: "Ghent" },

  // Europe: Switzerland
  "zurich": { lat: 47.3769, lng: 8.5417, region: "zurich", country: "CH", name: "Zürich" },
  "geneva": { lat: 46.2044, lng: 6.1432, region: "geneva", country: "CH", name: "Geneva" },
  "lausanne": { lat: 46.5197, lng: 6.6323, region: "lausanne", country: "CH", name: "Lausanne" },

  // Europe: Nordics
  "stockholm": { lat: 59.3293, lng: 18.0686, region: "stockholm", country: "SE", name: "Stockholm" },
  "copenhagen": { lat: 55.6761, lng: 12.5683, region: "copenhagen", country: "DK", name: "Copenhagen" },
  "helsinki": { lat: 60.1699, lng: 24.9384, region: "helsinki", country: "FI", name: "Helsinki" },
  "oslo": { lat: 59.9139, lng: 10.7522, region: "oslo", country: "NO", name: "Oslo" },
  "reykjavik": { lat: 64.1466, lng: -21.9426, region: "reykjavik", country: "IS", name: "Reykjavik" },

  // Europe: Iberia
  "barcelona": { lat: 41.3874, lng: 2.1686, region: "barcelona", country: "ES", name: "Barcelona" },
  "madrid": { lat: 40.4168, lng: -3.7038, region: "madrid", country: "ES", name: "Madrid" },
  "valencia": { lat: 39.4699, lng: -0.3763, region: "valencia", country: "ES", name: "Valencia" },
  "malaga": { lat: 36.7213, lng: -4.4217, region: "malaga", country: "ES", name: "Málaga" },
  "lisbon": { lat: 38.7223, lng: -9.1393, region: "lisbon", country: "PT", name: "Lisbon" },
  "porto": { lat: 41.1579, lng: -8.6291, region: "porto", country: "PT", name: "Porto" },

  // Europe: CEE
  "warsaw": { lat: 52.2297, lng: 21.0122, region: "warsaw", country: "PL", name: "Warsaw" },
  "poland": { lat: 52.2297, lng: 21.0122, region: "warsaw", country: "PL", name: "Warsaw" },
  "prague": { lat: 50.0755, lng: 14.4378, region: "prague", country: "CZ", name: "Prague" },
  "vienna": { lat: 48.2082, lng: 16.3738, region: "vienna", country: "AT", name: "Vienna" },
  "budapest": { lat: 47.4979, lng: 19.0402, region: "budapest", country: "HU", name: "Budapest" },
  "bucharest": { lat: 44.4268, lng: 26.1025, region: "bucharest", country: "RO", name: "Bucharest" },
  "bratislava": { lat: 48.1486, lng: 17.1077, region: "bratislava", country: "SK", name: "Bratislava" },
  "sofia": { lat: 42.6977, lng: 23.3219, region: "sofia", country: "BG", name: "Sofia" },
  "zagreb": { lat: 45.8150, lng: 15.9819, region: "zagreb", country: "HR", name: "Zagreb" },
  "belgrade": { lat: 44.7866, lng: 20.4489, region: "belgrade", country: "RS", name: "Belgrade" },
  "tallinn": { lat: 59.4370, lng: 24.7536, region: "tallinn", country: "EE", name: "Tallinn" },
  "vilnius": { lat: 54.6872, lng: 25.2797, region: "vilnius", country: "LT", name: "Vilnius" },
  "kyiv": { lat: 50.4501, lng: 30.5234, region: "kyiv", country: "UA", name: "Kyiv" },

  // Europe: Italy
  "milan": { lat: 45.4642, lng: 9.1900, region: "milan", country: "IT", name: "Milan" },
  "rome": { lat: 41.9028, lng: 12.4964, region: "rome", country: "IT", name: "Rome" },
  "turin": { lat: 45.0703, lng: 7.6869, region: "turin", country: "IT", name: "Turin" },
  "cagliari": { lat: 39.2238, lng: 9.1217, region: "cagliari", country: "IT", name: "Cagliari" },
  "rimini": { lat: 44.0678, lng: 12.5695, region: "rimini", country: "IT", name: "Rimini" },

  // Europe: Other
  "athens": { lat: 37.9838, lng: 23.7275, region: "athens", country: "GR", name: "Athens" },
  "luxembourg": { lat: 49.6117, lng: 6.1300, region: "luxembourg", country: "LU", name: "Luxembourg" },

  // Middle East
  "tel-aviv": { lat: 32.0853, lng: 34.7818, region: "tel-aviv", country: "IL", name: "Tel Aviv" },
  "dubai": { lat: 25.2048, lng: 55.2708, region: "dubai", country: "AE", name: "Dubai" },
  "abu-dhabi": { lat: 24.4539, lng: 54.3773, region: "abu-dhabi", country: "AE", name: "Abu Dhabi" },
  "doha": { lat: 25.2854, lng: 51.5310, region: "doha", country: "QA", name: "Doha" },
  "riyadh": { lat: 24.7136, lng: 46.6753, region: "riyadh", country: "SA", name: "Riyadh" },
  "amman": { lat: 31.9454, lng: 35.9284, region: "amman", country: "JO", name: "Amman" },
  "istanbul": { lat: 41.0082, lng: 28.9784, region: "istanbul", country: "TR", name: "Istanbul" },

  // Africa
  "cape-town": { lat: -33.9249, lng: 18.4241, region: "cape-town", country: "ZA", name: "Cape Town" },
  "johannesburg": { lat: -26.2041, lng: 28.0473, region: "johannesburg", country: "ZA", name: "Johannesburg" },
  "lagos": { lat: 6.5244, lng: 3.3792, region: "lagos", country: "NG", name: "Lagos" },
  "nairobi": { lat: -1.2921, lng: 36.8219, region: "nairobi", country: "KE", name: "Nairobi" },
  "cairo": { lat: 30.0444, lng: 31.2357, region: "cairo", country: "EG", name: "Cairo" },
  "accra": { lat: 5.6037, lng: -0.1870, region: "accra", country: "GH", name: "Accra" },
  "dakar": { lat: 14.7167, lng: -17.4677, region: "dakar", country: "SN", name: "Dakar" },
  "kampala": { lat: 0.3476, lng: 32.5825, region: "kampala", country: "UG", name: "Kampala" },
  "kigali": { lat: -1.9403, lng: 29.8739, region: "kigali", country: "RW", name: "Kigali" },
  "abuja": { lat: 9.0579, lng: 7.4951, region: "abuja", country: "NG", name: "Abuja" },
  "gaborone": { lat: -24.6282, lng: 25.9231, region: "gaborone", country: "BW", name: "Gaborone" },
  "bamako": { lat: 12.6392, lng: -8.0029, region: "bamako", country: "ML", name: "Bamako" },
  "conakry": { lat: 9.6412, lng: -13.5784, region: "conakry", country: "GN", name: "Conakry" },
  "kinshasa": { lat: -4.4419, lng: 15.2663, region: "kinshasa", country: "CD", name: "Kinshasa" },
  "lubumbashi": { lat: -11.6876, lng: 27.5026, region: "lubumbashi", country: "CD", name: "Lubumbashi" },
  "kumasi": { lat: 6.6885, lng: -1.6244, region: "kumasi", country: "GH", name: "Kumasi" },
  "mombasa": { lat: -4.0435, lng: 39.6682, region: "mombasa", country: "KE", name: "Mombasa" },
  "nakuru": { lat: -0.3031, lng: 36.0800, region: "nakuru", country: "KE", name: "Nakuru" },
  "warri": { lat: 5.5200, lng: 5.7600, region: "warri", country: "NG", name: "Warri" },

  // South Asia
  "bengaluru": { lat: 12.9716, lng: 77.5946, region: "bangalore", country: "IN", name: "Bengaluru" },
  "mumbai": { lat: 19.0760, lng: 72.8777, region: "mumbai", country: "IN", name: "Mumbai" },
  "delhi": { lat: 28.6139, lng: 77.2090, region: "delhi", country: "IN", name: "Delhi" },
  "chennai": { lat: 13.0827, lng: 80.2707, region: "chennai", country: "IN", name: "Chennai" },
  "hyderabad": { lat: 17.3850, lng: 78.4867, region: "hyderabad", country: "IN", name: "Hyderabad" },
  "pune": { lat: 18.5204, lng: 73.8567, region: "pune", country: "IN", name: "Pune" },
  "noida": { lat: 28.5355, lng: 77.3910, region: "delhi", country: "IN", name: "Noida" },
  "gurugram": { lat: 28.4595, lng: 77.0266, region: "delhi", country: "IN", name: "Gurugram" },
  "goa": { lat: 15.2993, lng: 74.1240, region: "goa", country: "IN", name: "Goa" },
  "indore": { lat: 22.7196, lng: 75.8577, region: "indore", country: "IN", name: "Indore" },
  "surat": { lat: 21.1702, lng: 72.8311, region: "surat", country: "IN", name: "Surat" },
  "nagpur": { lat: 21.1458, lng: 79.0882, region: "nagpur", country: "IN", name: "Nagpur" },
  "ambala": { lat: 30.3782, lng: 76.7767, region: "ambala", country: "IN", name: "Ambala" },
  "tiruchirappalli": { lat: 10.7905, lng: 78.7047, region: "tiruchirappalli", country: "IN", name: "Tiruchirappalli" },
  "trivandrum": { lat: 8.5241, lng: 76.9366, region: "trivandrum", country: "IN", name: "Trivandrum" },
  "virudhunagar": { lat: 9.5850, lng: 77.9571, region: "virudhunagar", country: "IN", name: "Virudhunagar" },
  "lahore": { lat: 31.5204, lng: 74.3587, region: "lahore", country: "PK", name: "Lahore" },
  "islamabad-rawalpindi": { lat: 33.6844, lng: 73.0479, region: "islamabad", country: "PK", name: "Islamabad" },
  "dhaka": { lat: 23.8103, lng: 90.4125, region: "dhaka", country: "BD", name: "Dhaka" },

  // East/SE Asia
  "singapore": { lat: 1.3521, lng: 103.8198, region: "singapore", country: "SG", name: "Singapore" },
  "tokyo": { lat: 35.6762, lng: 139.6503, region: "tokyo", country: "JP", name: "Tokyo" },
  "seoul": { lat: 37.5665, lng: 126.9780, region: "seoul", country: "KR", name: "Seoul" },
  "hong-kong": { lat: 22.3193, lng: 114.1694, region: "hong-kong", country: "HK", name: "Hong Kong" },
  "taipei": { lat: 25.0330, lng: 121.5654, region: "taipei", country: "TW", name: "Taipei" },
  "shanghai": { lat: 31.2304, lng: 121.4737, region: "shanghai", country: "CN", name: "Shanghai" },
  "beijing": { lat: 39.9042, lng: 116.4074, region: "beijing", country: "CN", name: "Beijing" },
  "shenzhen": { lat: 22.5431, lng: 114.0579, region: "shenzhen", country: "CN", name: "Shenzhen" },
  "bangkok": { lat: 13.7563, lng: 100.5018, region: "bangkok", country: "TH", name: "Bangkok" },
  "hanoi": { lat: 21.0285, lng: 105.8542, region: "hanoi", country: "VN", name: "Hanoi" },
  "ho-chi-minh-city": { lat: 10.8231, lng: 106.6297, region: "ho-chi-minh-city", country: "VN", name: "Ho Chi Minh City" },
  "jakarta": { lat: -6.2088, lng: 106.8456, region: "jakarta", country: "ID", name: "Jakarta" },
  "manila": { lat: 14.5995, lng: 120.9842, region: "manila", country: "PH", name: "Manila" },
  "kuala-lumpur": { lat: 3.1390, lng: 101.6869, region: "kuala-lumpur", country: "MY", name: "Kuala Lumpur" },
  "canggu": { lat: -8.6478, lng: 115.1385, region: "bali", country: "ID", name: "Canggu (Bali)" },

  // Oceania
  "sydney": { lat: -33.8688, lng: 151.2093, region: "sydney", country: "AU", name: "Sydney" },
  "melbourne": { lat: -37.8136, lng: 144.9631, region: "melbourne", country: "AU", name: "Melbourne" },
  "brisbane": { lat: -27.4698, lng: 153.0251, region: "brisbane", country: "AU", name: "Brisbane" },
  "perth": { lat: -31.9505, lng: 115.8605, region: "perth", country: "AU", name: "Perth" },
  "auckland": { lat: -36.8485, lng: 174.7633, region: "auckland", country: "NZ", name: "Auckland" },
  "wellington": { lat: -41.2865, lng: 174.7762, region: "wellington", country: "NZ", name: "Wellington" },
  "christchurch": { lat: -43.5321, lng: 172.6362, region: "christchurch", country: "NZ", name: "Christchurch" },

  // Latin America
  "mexico-city": { lat: 19.4326, lng: -99.1332, region: "mexico-city", country: "MX", name: "Mexico City" },
  "monterrey": { lat: 25.6866, lng: -100.3161, region: "monterrey", country: "MX", name: "Monterrey" },
  "queretaro": { lat: 20.5888, lng: -100.3899, region: "queretaro", country: "MX", name: "Querétaro" },
  "durango-mx": { lat: 24.0277, lng: -104.6532, region: "durango-mx", country: "MX", name: "Durango MX" },
  "guatemala-city": { lat: 14.6349, lng: -90.5069, region: "guatemala-city", country: "GT", name: "Guatemala City" },
  "panama": { lat: 8.9824, lng: -79.5199, region: "panama", country: "PA", name: "Panama City" },
  "san-salvador": { lat: 13.6929, lng: -89.2182, region: "san-salvador", country: "SV", name: "San Salvador" },
  "bogota": { lat: 4.7110, lng: -74.0721, region: "bogota", country: "CO", name: "Bogotá" },
  "medellin": { lat: 6.2476, lng: -75.5658, region: "medellin", country: "CO", name: "Medellín" },
  "cali": { lat: 3.4516, lng: -76.5320, region: "cali", country: "CO", name: "Cali" },
  "barranquilla": { lat: 10.9685, lng: -74.7813, region: "barranquilla", country: "CO", name: "Barranquilla" },
  "bucaramanga": { lat: 7.1254, lng: -73.1198, region: "bucaramanga", country: "CO", name: "Bucaramanga" },
  "manizales": { lat: 5.0689, lng: -75.5174, region: "manizales", country: "CO", name: "Manizales" },
  "pasto": { lat: 1.2136, lng: -77.2811, region: "pasto", country: "CO", name: "Pasto" },
  "pereira": { lat: 4.8133, lng: -75.6961, region: "pereira", country: "CO", name: "Pereira" },
  "armenia-quindio": { lat: 4.5339, lng: -75.6811, region: "armenia-quindio", country: "CO", name: "Armenia, Quindío" },
  "san-cristobal": { lat: 7.7667, lng: -72.2250, region: "san-cristobal", country: "VE", name: "San Cristóbal" },
  "tulcan": { lat: 0.8117, lng: -77.7172, region: "tulcan", country: "EC", name: "Tulcán" },
  "buenos-aires": { lat: -34.6037, lng: -58.3816, region: "buenos-aires", country: "AR", name: "Buenos Aires" },
  "montevideo": { lat: -34.9011, lng: -56.1645, region: "montevideo", country: "UY", name: "Montevideo" },
  "santiago": { lat: -33.4489, lng: -70.6693, region: "santiago", country: "CL", name: "Santiago" },
  "la-paz": { lat: -16.4897, lng: -68.1193, region: "la-paz", country: "BO", name: "La Paz" },
  "asuncion": { lat: -25.2637, lng: -57.5759, region: "asuncion", country: "PY", name: "Asunción" },
  "san-lorenzo": { lat: -25.3407, lng: -57.5094, region: "asuncion", country: "PY", name: "San Lorenzo" },
  "quito": { lat: -0.1807, lng: -78.4678, region: "quito", country: "EC", name: "Quito" },
  "saopaulo": { lat: -23.5505, lng: -46.6333, region: "sao-paulo", country: "BR", name: "São Paulo" },
  "rio-de-janeiro": { lat: -22.9068, lng: -43.1729, region: "rio-de-janeiro", country: "BR", name: "Rio de Janeiro" },
  "florianopolis": { lat: -27.5954, lng: -48.5480, region: "florianopolis", country: "BR", name: "Florianópolis" },
  "ribeirao-preto": { lat: -21.1767, lng: -47.8208, region: "ribeirao-preto", country: "BR", name: "Ribeirão Preto" },

  // Central Asia
  "tashkent": { lat: 41.2995, lng: 69.2401, region: "tashkent", country: "UZ", name: "Tashkent" },
  "namangan-chust": { lat: 40.9983, lng: 71.6726, region: "namangan", country: "UZ", name: "Namangan" },
  "casablanca": { lat: 33.5731, lng: -7.5898, region: "casablanca", country: "MA", name: "Casablanca" },
};

// ── AI Tinkerers cities from Wayback scrape ──
const AI_TINKERERS_CITIES = fs.readFileSync('/tmp/aitinkerers-cities.txt', 'utf8')
  .trim().split('\n')
  .map(url => url.replace(/https?:\/\//, '').replace('.aitinkerers.org', ''));

// ── AI Collective chapters ──
const AI_COLLECTIVE_CHAPTERS = [
  "sf", "nyc", "chicago", "dc", "london", "seattle", "la",
  "atlanta", "munich", "toronto", "stockholm", "bengaluru",
  "denver", "boston", "miami", "austin", "portland",
];

// ── AICamp cities ──
const AICAMP_CITIES = [
  "seattle", "sf", "nyc", "boston", "atlanta", "austin", "chicago",
  "dallas", "dc", "la", "san-diego", "denver", "houston", "portland", "raleigh",
  "toronto", "vancouver", "waterloo", "london", "paris", "berlin", "munich",
  "amsterdam", "stockholm", "zurich", "dublin", "geneva", "warsaw", "copenhagen",
  "bangalore", "chennai", "delhi", "hyderabad", "mumbai",
  "singapore", "tokyo", "melbourne", "sydney", "brisbane", "auckland",
  "saopaulo",
];

// ── Load existing data ──
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const existingIds = new Set(data.communities.map(c => c.id));

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleCase(slug) {
  const special = { sf: 'San Francisco', nyc: 'New York City', la: 'Los Angeles', dc: 'Washington DC', slc: 'Salt Lake City' };
  if (special[slug]) return special[slug];
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function makeCommunity(prefix, citySlug, urlTemplate, opts = {}) {
  const id = `${prefix}-${citySlug}`;
  if (existingIds.has(id)) return null;

  const geo = CITY_GEO[citySlug];
  if (!geo) {
    console.log(`  SKIP (no geo): ${id}`);
    return null;
  }

  const jitter = () => (Math.random() - 0.5) * 0.02;
  const name = opts.nameTemplate
    ? opts.nameTemplate.replace('{city}', geo.name)
    : `${opts.brandName || titleCase(prefix)} ${geo.name}`;

  return {
    id,
    name,
    regionId: geo.region,
    priority: 0,
    tags: [],
    url: urlTemplate.replace('{slug}', citySlug),
    urls: [urlTemplate.replace('{slug}', citySlug)],
    contact: opts.contact || { type: "email", value: null },
    description: opts.description || `${geo.name} chapter of ${opts.brandName || titleCase(prefix)}.`,
    notableCompanies: [],
    hasAICodingTools: false,
    codingTools: [],
    memberCount: null,
    attendanceEstimate: null,
    events: [],
    whyTarget: null,
    isGrouped: false,
    groupName: null,
    lat: geo.lat + jitter(),
    lng: geo.lng + jitter(),
    country: geo.country,
    founded: opts.founded || null,
    organizers: null,
    cadence: opts.cadence || "monthly",
    lastEvent: null,
    social: opts.social || { twitter: null, linkedin: null },
    researchNotes: null,
  };
}

// ── Generate AI Tinkerers chapters ──
console.log('=== AI Tinkerers ===');
let added = 0;
for (const city of AI_TINKERERS_CITIES) {
  const c = makeCommunity('ai-tinkerers', city, 'https://{slug}.aitinkerers.org', {
    brandName: 'AI Tinkerers',
    nameTemplate: 'AI Tinkerers {city}',
    description: `${CITY_GEO[city]?.name || titleCase(city)} chapter of AI Tinkerers — the world's largest AI builder community. Monthly live code demos, no slides, no pitches.`,
    contact: { type: "email", value: "admin@aitinkerers.org" },
    cadence: "monthly",
    social: { twitter: "@AITinkerers", linkedin: "https://www.linkedin.com/company/ai-tinkerers" },
  });
  if (c) { data.communities.push(c); added++; }
}
console.log(`Added ${added} AI Tinkerers chapters`);

// ── Generate AI Collective chapters ──
console.log('\n=== AI Collective ===');
added = 0;
for (const city of AI_COLLECTIVE_CHAPTERS) {
  const slug = city === 'bengaluru' ? 'bangalore' : city; // normalize
  const id = `genai-collective-${city}`;
  if (existingIds.has(id) || existingIds.has(`genai-collective-${slug}`)) continue;

  const geo = CITY_GEO[city] || CITY_GEO[slug];
  if (!geo) { console.log(`  SKIP (no geo): ${id}`); continue; }

  const jitter = () => (Math.random() - 0.5) * 0.02;
  const c = {
    id,
    name: `AI Collective ${geo.name}`,
    regionId: geo.region,
    priority: 0,
    tags: [],
    url: `https://www.aicollective.com/chapters/${city}`,
    urls: [`https://www.aicollective.com/chapters/${city}`],
    contact: { type: "email", value: null },
    description: `${geo.name} chapter of The AI Collective (fka GenAI Collective). 200K+ members globally across 100+ chapters. Hackathons, demo nights, salons.`,
    notableCompanies: [],
    hasAICodingTools: false,
    codingTools: [],
    memberCount: null,
    attendanceEstimate: null,
    events: [],
    whyTarget: null,
    isGrouped: false,
    groupName: null,
    lat: geo.lat + jitter(),
    lng: geo.lng + jitter(),
    country: geo.country,
    founded: null,
    organizers: null,
    cadence: "monthly",
    lastEvent: null,
    social: { twitter: "@AICollectiveCo", linkedin: "https://www.linkedin.com/company/aicollective" },
    researchNotes: null,
  };
  data.communities.push(c);
  added++;
}
console.log(`Added ${added} AI Collective chapters`);

// ── Generate AICamp chapters ──
console.log('\n=== AICamp ===');
added = 0;
for (const city of AICAMP_CITIES) {
  const geo = CITY_GEO[city];
  if (!geo) { console.log(`  SKIP (no geo): aicamp-${city}`); continue; }

  const id = `aicamp-${city === 'sf' ? 'sf-bay-area' : city === 'nyc' ? 'nyc' : city === 'la' ? 'los-angeles' : city === 'dc' ? 'dc' : city}`;
  if (existingIds.has(id) || existingIds.has(`aicamp-${city}`)) continue;

  const jitter = () => (Math.random() - 0.5) * 0.02;
  const cityParam = encodeURIComponent(geo.name);
  const c = {
    id: `aicamp-${city}`,
    name: `AICamp ${geo.name}`,
    regionId: geo.region,
    priority: 0,
    tags: [],
    url: `https://www.aicamp.ai/event/eventsquery?city=${cityParam}`,
    urls: [`https://www.aicamp.ai/event/eventsquery?city=${cityParam}`],
    contact: { type: "email", value: null },
    description: `${geo.name} chapter of AICamp. Global AI learning platform with 500K+ developer members in 100+ countries.`,
    notableCompanies: [],
    hasAICodingTools: false,
    codingTools: [],
    memberCount: null,
    attendanceEstimate: null,
    events: [],
    whyTarget: null,
    isGrouped: false,
    groupName: null,
    lat: geo.lat + jitter(),
    lng: geo.lng + jitter(),
    country: geo.country,
    founded: null,
    organizers: ["Bill Liu"],
    cadence: "monthly",
    lastEvent: null,
    social: { twitter: "@aicampai", linkedin: "https://www.linkedin.com/company/aicampai" },
    researchNotes: null,
  };
  data.communities.push(c);
  added++;
}
console.log(`Added ${added} AICamp chapters`);

// ── Update metadata ──
const regions = new Set(data.communities.map(c => c.regionId));
data.metadata.totalCommunities = data.communities.length;
data.metadata.totalRegions = regions.size;

// ── Write ──
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`\nTotal communities: ${data.communities.length}`);
console.log(`Total regions: ${regions.size}`);

// ── Collect new regions needed ──
const existingRegions = new Set(Object.keys(require('../src/data/regions.js').REGIONS || {}));
const newRegions = {};
for (const c of data.communities) {
  if (!existingRegions.has(c.regionId)) {
    const geo = CITY_GEO[c.regionId] || Object.values(CITY_GEO).find(g => g.region === c.regionId);
    if (geo) newRegions[c.regionId] = { name: geo.name, lat: geo.lat, lng: geo.lng, country: geo.country };
  }
}
if (Object.keys(newRegions).length) {
  console.log(`\nNew regions to add to regions.js (${Object.keys(newRegions).length}):`);
  for (const [id, r] of Object.entries(newRegions)) {
    console.log(`  "${id}": { name: "${r.name}", lat: ${r.lat}, lng: ${r.lng}, country: "${r.country}" },`);
  }
  // Write new regions to a temp file for easy copy
  fs.writeFileSync('/tmp/new-regions.json', JSON.stringify(newRegions, null, 2));
}
