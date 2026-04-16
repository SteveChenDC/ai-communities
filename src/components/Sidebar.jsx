import { useMemo } from 'react'
import { Calendar, Wrench, ExternalLink, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PRIORITY_COLORS } from '../utils/constants'
import { REGIONS } from '../data/regions'

function PriorityDot({ priority, size = 8 }) {
  const p = PRIORITY_COLORS[priority] || PRIORITY_COLORS[0]
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: p.fill }}
    />
  )
}

const EVENT_PLATFORMS = ['meetup.com', 'lu.ma', 'luma.com', 'eventbrite.com']

function getEventUrl(community, event) {
  if (event.url) return event.url
  if (community.url && EVENT_PLATFORMS.some(p => community.url.includes(p))) return community.url
  const platformUrl = community.urls?.find(u => EVENT_PLATFORMS.some(p => u.includes(p)))
  if (platformUrl) return platformUrl
  return community.url || null
}

function EventItem({ community, event }) {
  const { selectedId, dispatch } = useApp()
  const isSelected = community.id === selectedId
  const region = REGIONS[community.regionId]
  const now = new Date().toISOString().split('T')[0]
  const isPast = event.date < now
  const eventUrl = getEventUrl(community, event)

  const d = new Date(event.date + 'T12:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()

  return (
    <button
      onClick={() => dispatch({ type: 'SELECT', id: community.id })}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
        isSelected
          ? 'bg-blue-50 ring-1 ring-blue-200'
          : 'hover:bg-gray-50'
      } ${isPast ? 'opacity-40' : ''}`}
    >
      <div className="text-center min-w-[36px]">
        <div className="text-xs font-medium text-gray-400 uppercase leading-none">{month}</div>
        <div className="text-lg font-bold text-gray-800 leading-tight tabular-nums">{day}</div>
      </div>
      <PriorityDot priority={community.priority} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800 truncate">{community.name}</div>
        <div className="text-[11px] text-gray-400 truncate">{region?.name}</div>
      </div>
      {community.hasAICodingTools && (
        <span title="AI Coding Tools" className="shrink-0 flex">
          <Wrench size={12} className="text-amber-400" />
        </span>
      )}
      {eventUrl && (
        <a href={eventUrl} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-gray-300 hover:text-blue-500 shrink-0 transition-colors">
          <ExternalLink size={12} />
        </a>
      )}
    </button>
  )
}

function CommunityItem({ community }) {
  const { selectedId, dispatch } = useApp()
  const isSelected = community.id === selectedId
  const region = REGIONS[community.regionId]

  return (
    <button
      onClick={() => dispatch({ type: 'SELECT', id: community.id })}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
        isSelected
          ? 'bg-blue-50 ring-1 ring-blue-200'
          : 'hover:bg-gray-50'
      }`}
    >
      <PriorityDot priority={community.priority} />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-800 truncate">{community.name}</div>
        <div className="text-[11px] text-gray-400 truncate">{region?.name}</div>
      </div>
      {community.hasAICodingTools && (
        <span title="AI Coding Tools" className="shrink-0 flex">
          <Wrench size={11} className="text-amber-400" />
        </span>
      )}
      {community.url && (
        <a href={community.url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-gray-300 hover:text-blue-500 shrink-0 transition-colors">
          <ExternalLink size={12} />
        </a>
      )}
    </button>
  )
}

export default function Sidebar() {
  const { filtered, showCommunities, mobilePanel, dispatch } = useApp()

  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString().split('T')[0]
    const items = []
    for (const c of filtered) {
      for (const ev of c.events) {
        if (ev.date) items.push({ community: c, event: ev })
      }
    }
    // Future events first (sorted ascending), then past events
    const future = items.filter(i => i.event.date >= now).sort((a, b) => a.event.date.localeCompare(b.event.date))
    const past = items.filter(i => i.event.date < now).sort((a, b) => b.event.date.localeCompare(a.event.date))
    return [...future, ...past]
  }, [filtered])

  // Sort communities: priority desc, then name asc
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name)),
    [filtered]
  )

  return (
    <aside className={`bg-white flex flex-col shrink-0 fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out max-h-[70vh] ${mobilePanel ? 'translate-y-0' : 'translate-y-full'} lg:static lg:w-80 lg:border-l lg:border-t-0 lg:rounded-none lg:shadow-none lg:translate-y-0 lg:max-h-none lg:z-auto`}>
      {/* Drag handle - mobile only */}
      <div className="flex justify-center pt-2 pb-1 lg:hidden">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Events */}
      {upcomingEvents.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <Calendar size={13} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Events
            </h2>
            <span className="text-[10px] text-gray-300 ml-auto">{upcomingEvents.length}</span>
          </div>
          <div className="flex-1 overflow-auto px-1 pb-2">
            {upcomingEvents.map((item, i) => (
              <EventItem key={`${item.community.id}-${i}`} community={item.community} event={item.event} />
            ))}
          </div>
        </div>
      )}

      {/* All Communities - collapsible, pinned to bottom */}
      <div className="border-t border-gray-100 shrink-0">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_COMMUNITIES' })}
          className="flex items-center gap-2 px-4 pt-3 pb-1 w-full hover:bg-gray-50 transition-colors"
        >
          {showCommunities ? (
            <ChevronDown size={13} className="text-gray-400" />
          ) : (
            <ChevronRight size={13} className="text-gray-400" />
          )}
          <MapPin size={13} className="text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Communities
          </h2>
          <span className="text-[10px] text-gray-300 ml-auto">{sorted.length}</span>
        </button>
        {showCommunities && (
          <div className="max-h-[220px] overflow-auto px-1 pb-2">
            {sorted.map(c => (
              <CommunityItem key={c.id} community={c} />
            ))}
            {sorted.length === 0 && (
              <div className="text-center text-gray-300 text-sm py-8">No results</div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
