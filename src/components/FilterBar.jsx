import { Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PRIORITY_COLORS } from '../utils/constants'

export default function FilterBar() {
  const { filters, regionOptions, dispatch } = useApp()

  const setFilter = (key, value) => dispatch({ type: 'SET_FILTER', key, value })
  const clearAll = () => dispatch({ type: 'CLEAR_FILTERS' })

  const hasFilters = !!filters.search || filters.regions.length > 0 || filters.priorities.length > 0

  const toggleArray = (key, val) => {
    const cur = filters[key]
    setFilter(key, cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val])
  }

  return (
    <div className="flex items-center gap-2.5 px-5 py-2 bg-white border-b border-gray-100 shrink-0">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          className="w-48 pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-300"
        />
      </div>

      <div className="w-px h-5 bg-gray-200" />

      {/* Region */}
      <select
        value=""
        onChange={e => { if (e.target.value) toggleArray('regions', e.target.value) }}
        className="text-sm bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
      >
        <option value="">Region{filters.regions.length ? ` (${filters.regions.length})` : ''}</option>
        {regionOptions.map(r => (
          <option key={r.id} value={r.id} disabled={filters.regions.includes(r.id)}>{r.name}</option>
        ))}
      </select>

      {filters.regions.map(r => {
        const name = regionOptions.find(o => o.id === r)?.name || r
        return (
          <button key={r} onClick={() => toggleArray('regions', r)}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
            {name} <X size={11} />
          </button>
        )
      })}

      <div className="w-px h-5 bg-gray-200" />

      {/* Priority */}
      {[3, 1].map(p => {
        const active = filters.priorities.includes(p)
        const color = p === 3
          ? { active: 'bg-red-500 border-red-500 text-white shadow-sm', inactive: 'border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50', dot: '#ef4444' }
          : { active: 'bg-blue-500 border-blue-500 text-white shadow-sm', inactive: 'border-blue-200 text-blue-500 hover:border-blue-300 hover:bg-blue-50', dot: '#3b82f6' }
        return (
          <button key={p} onClick={() => toggleArray('priorities', p)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${active ? color.active : color.inactive}`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? '#fff' : color.dot }} />
            {PRIORITY_COLORS[p].label}
          </button>
        )
      })}

      {hasFilters && (
        <button onClick={clearAll} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-emerald-400 bg-emerald-400 text-white hover:bg-emerald-500 hover:border-emerald-500 ml-auto transition-colors shadow-sm">
          <X size={11} /> Clear
        </button>
      )}
    </div>
  )
}
