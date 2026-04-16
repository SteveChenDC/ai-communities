import { useState } from 'react'
import { Search, X, MapPin, Wrench, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PRIORITY_COLORS } from '../utils/constants'
import { REGIONS } from '../data/regions'

function findNearestRegion(lat, lng, regionOptions) {
  let best = null
  let bestDist = Infinity
  for (const group of regionOptions) {
    for (const r of group.items) {
      const region = REGIONS[r.id]
      if (!region || region.country === 'GLOBAL') continue
      const dlat = region.lat - lat
      const dlng = region.lng - lng
      const dist = dlat * dlat + dlng * dlng
      if (dist < bestDist) { bestDist = dist; best = r }
    }
  }
  return best
}

export default function FilterBar() {
  const { filters, regionOptions, userLocation, dispatch } = useApp()
  const [locating, setLocating] = useState(false)

  const setFilter = (key, value) => dispatch({ type: 'SET_FILTER', key, value })
  const clearAll = () => dispatch({ type: 'CLEAR_FILTERS' })

  const hasFilters = !!filters.search || filters.regions.length > 0 || filters.priorities.length > 0

  const toggleArray = (key, val) => {
    const cur = filters[key]
    setFilter(key, cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val])
  }

  const detectLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const nearest = findNearestRegion(latitude, longitude, regionOptions)
        if (nearest) {
          dispatch({ type: 'SET_USER_LOCATION', location: { lat: latitude, lng: longitude, regionId: nearest.id, regionName: nearest.name } })
          // Auto-filter to nearest region
          if (!filters.regions.includes(nearest.id)) {
            setFilter('regions', [nearest.id])
          }
        }
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  // Flat list for pill lookups
  const allRegions = regionOptions.flatMap(g => g.items)

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0 overflow-x-auto md:gap-2.5 md:px-5 md:overflow-x-visible">
      {/* Search */}
      <div className="relative shrink-0">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          className="w-36 md:w-48 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-300"
        />
      </div>

      <div className="w-px h-5 bg-gray-200 shrink-0" />

      {/* Region */}
      <select
        value=""
        onChange={e => { if (e.target.value) toggleArray('regions', e.target.value) }}
        className="text-sm bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shrink-0"
      >
        <option value="">Region{filters.regions.length ? ` (${filters.regions.length})` : ''}</option>
        {regionOptions.map(group => (
          <optgroup key={group.continent} label={group.continent}>
            {group.items.map(r => (
              <option key={r.id} value={r.id} disabled={filters.regions.includes(r.id)}>{r.name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Location pin */}
      <button
        onClick={detectLocation}
        className={`shrink-0 rounded-full p-1.5 border transition-all ${
          userLocation
            ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
            : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50'
        } ${locating ? 'animate-pulse' : ''}`}
        title={userLocation ? `Near ${userLocation.regionName}` : 'Detect my location'}
        aria-label="Detect my location"
      >
        <MapPin size={14} />
      </button>

      {filters.regions.map(r => {
        const name = allRegions.find(o => o.id === r)?.name || r
        return (
          <button key={r} onClick={() => toggleArray('regions', r)}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors shrink-0 whitespace-nowrap">
            {name} <X size={11} />
          </button>
        )
      })}

      <div className="w-px h-5 bg-gray-200 shrink-0" />

      {/* Priority */}
      {[3, 1].map(p => {
        const active = filters.priorities.includes(p)
        const color = p === 3
          ? { active: 'bg-red-500 border-red-500 text-white shadow-sm', inactive: 'border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50', dot: '#ef4444' }
          : { active: 'bg-blue-500 border-blue-500 text-white shadow-sm', inactive: 'border-blue-200 text-blue-500 hover:border-blue-300 hover:bg-blue-50', dot: '#3b82f6' }
        return (
          <button key={p} onClick={() => toggleArray('priorities', p)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all shrink-0 whitespace-nowrap ${active ? color.active : color.inactive}`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? '#fff' : color.dot }} />
            {PRIORITY_COLORS[p].label}
          </button>
        )
      })}

      <div
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shrink-0 whitespace-nowrap"
        title="Sponsored by an AI DevTools company — high likelihood of a turnkey sponsorship opportunity since these communities already have experience partnering with AI DevTools companies."
      >
        <Wrench size={12} className="text-amber-500 shrink-0" />
        <span>Sponsored by an AI DevTools company</span>
        <Info size={11} className="text-amber-400 shrink-0" aria-hidden="true" />
      </div>

      {hasFilters && (
        <button onClick={clearAll} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-emerald-400 bg-emerald-400 text-white hover:bg-emerald-500 hover:border-emerald-500 ml-2 lg:ml-auto transition-colors shadow-sm shrink-0 whitespace-nowrap">
          <X size={11} /> Clear
        </button>
      )}
    </div>
  )
}
