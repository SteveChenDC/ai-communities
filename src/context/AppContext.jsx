import { createContext, useContext, useReducer, useMemo, useCallback } from 'react'
import communitiesData from '../data/communities.json'
import { REGIONS } from '../data/regions.js'

const AppContext = createContext(null)

const NA_COUNTRIES = new Set(['US', 'CA', 'MX', 'CO', 'BR', 'AR', 'CL', 'EC', 'PE', 'UY', 'PY', 'BO', 'VE', 'PA', 'GT', 'SV', 'JM'])
const EU_COUNTRIES = new Set(['GB', 'IE', 'DE', 'FR', 'NL', 'CH', 'ES', 'SE', 'DK', 'FI', 'AT', 'CZ', 'BE', 'PT', 'PL', 'NO', 'IT', 'LU', 'IS', 'HR', 'BG', 'RO', 'HU', 'SK', 'LT', 'EE', 'GR', 'RS', 'UA'])

function getContinent(regionId) {
  const region = REGIONS[regionId]
  if (!region) return 'Other'
  if (region.country === 'GLOBAL') return 'Global'
  if (NA_COUNTRIES.has(region.country)) return 'Americas'
  if (EU_COUNTRIES.has(region.country)) return 'Europe'
  return 'Other'
}

const initialState = {
  communities: communitiesData.communities,
  metadata: communitiesData.metadata,
  filters: {
    search: '',
    regions: [],
    priorities: [],
    aiToolsOnly: false,
  },
  selectedId: null,
  showCommunities: false,
  mobilePanel: null, // null | 'events' | 'communities'
  userLocation: null, // { lat, lng, regionId, regionName } or null
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } }
    case 'CLEAR_FILTERS':
      return { ...state, filters: initialState.filters }
    case 'SELECT':
      return { ...state, selectedId: action.id, mobilePanel: null }
    case 'DESELECT':
      return { ...state, selectedId: null }
    case 'TOGGLE_COMMUNITIES':
      return { ...state, showCommunities: !state.showCommunities }
    case 'OPEN_MOBILE_PANEL':
      return {
        ...state,
        mobilePanel: state.mobilePanel === action.panel ? null : action.panel,
        showCommunities: action.panel === 'communities' ? true : state.showCommunities,
      }
    case 'CLOSE_MOBILE_PANEL':
      return { ...state, mobilePanel: null }
    case 'SET_USER_LOCATION':
      return { ...state, userLocation: action.location }
    default:
      return state
  }
}

function applyFilters(communities, filters) {
  let result = communities

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.notableCompanies.some(co => co.toLowerCase().includes(q))
    )
  }

  if (filters.regions.length) {
    result = result.filter(c => filters.regions.includes(c.regionId))
  }

  if (filters.priorities.length) {
    result = result.filter(c => filters.priorities.includes(c.priority))
  }

  if (filters.aiToolsOnly) {
    result = result.filter(c => c.hasAICodingTools)
  }

  return result
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const filtered = useMemo(
    () => applyFilters(state.communities, state.filters),
    [state.communities, state.filters]
  )

  const regionOptions = useMemo(() => {
    const ids = [...new Set(state.communities.map(c => c.regionId))]
    const all = ids
      .map(id => ({ id, name: REGIONS[id]?.name || id, continent: getContinent(id) }))
      .sort((a, b) => a.name.localeCompare(b.name))
    // Group by continent in display order
    const order = ['Americas', 'Europe', 'Global', 'Other']
    const grouped = []
    for (const continent of order) {
      const items = all.filter(r => r.continent === continent)
      if (items.length) grouped.push({ continent, items })
    }
    return grouped
  }, [state.communities])

  const value = useMemo(() => ({
    ...state,
    filtered,
    regionOptions,
    dispatch,
  }), [state, filtered, regionOptions])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
