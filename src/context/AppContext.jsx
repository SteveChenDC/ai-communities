import { createContext, useContext, useReducer, useMemo, useCallback } from 'react'
import communitiesData from '../data/communities.json'
import { REGIONS } from '../data/regions.js'

const AppContext = createContext(null)

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
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } }
    case 'CLEAR_FILTERS':
      return { ...state, filters: initialState.filters }
    case 'SELECT':
      return { ...state, selectedId: action.id }
    case 'DESELECT':
      return { ...state, selectedId: null }
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
    return ids
      .map(id => ({ id, name: REGIONS[id]?.name || id }))
      .sort((a, b) => a.name.localeCompare(b.name))
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
