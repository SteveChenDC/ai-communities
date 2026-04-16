import { useMemo } from 'react'
import { X, ExternalLink, Mail, Globe, Wrench, Calendar, MapPin, Users } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { PRIORITY_COLORS } from '../../utils/constants'
import { REGIONS } from '../../data/regions'

const EVENT_PLATFORMS = ['meetup.com', 'lu.ma', 'luma.com', 'eventbrite.com']

function formatEventDate(ev) {
  if (ev.date) {
    const d = new Date(ev.date + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return ev.dateRaw || 'TBD'
}

function getEventUrl(community, event) {
  if (event.url) return event.url
  if (community.url && EVENT_PLATFORMS.some(p => community.url.includes(p))) return community.url
  const platformUrl = community.urls?.find(u => EVENT_PLATFORMS.some(p => u.includes(p)))
  if (platformUrl) return platformUrl
  return community.url || null
}

export default function DetailModal() {
  const { selectedId, communities, dispatch } = useApp()

  const community = useMemo(
    () => communities.find(c => c.id === selectedId),
    [selectedId, communities]
  )

  if (!community) return null

  const c = community
  const p = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS[0]
  const region = REGIONS[c.regionId]

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={() => dispatch({ type: 'DESELECT' })} />

      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6 pointer-events-none">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] md:max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden">

          {/* Drag handle - mobile only */}
          <div className="flex justify-center pt-2 md:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.fill }} />
                  <h2 className="text-lg font-semibold text-gray-900 leading-tight">{c.name}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {region?.name}
                  </span>
                  {c.priority > 0 && (
                    <span style={{ color: p.fill }}>{p.stars}</span>
                  )}
                  {c.hasAICodingTools && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Wrench size={11} /> AI Tools
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => dispatch({ type: 'DESELECT' })}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors shrink-0">
                <X size={18} />
              </button>
            </div>

            {c.tags.length > 0 && (
              <div className="flex gap-1.5 mt-3">
                {c.tags.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-4 py-3 md:px-6 md:py-4 space-y-5">
            <p className="text-sm text-gray-600 leading-relaxed">{c.description}</p>

            {/* Related / Nearby Communities */}
            {(() => {
              const siblings = c.isGrouped
                ? communities.filter(s => s.id !== c.id && s.groupName === c.groupName)
                : communities.filter(s => s.id !== c.id && s.regionId === c.regionId)
              if (!siblings.length) return null
              return (
                <div>
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {c.isGrouped ? 'Related Communities' : 'Nearby Communities'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {siblings.map(s => {
                      const sp = PRIORITY_COLORS[s.priority] || PRIORITY_COLORS[0]
                      return (
                        <button key={s.id}
                          onClick={() => dispatch({ type: 'SELECT', id: s.id })}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sp.fill }} />
                          <span className="truncate max-w-[140px]">{s.name}</span>
                          {s.hasAICodingTools && <Wrench size={10} className="text-amber-400 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Stats row */}
            {(c.memberCount || c.attendanceEstimate) && (
              <div className="flex gap-3">
                {c.memberCount && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                    <Users size={12} />
                    {c.memberCount.toLocaleString()} members
                  </div>
                )}
                {c.attendanceEstimate && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                    <Users size={12} />
                    {c.attendanceEstimate.toLocaleString()}+ per event
                  </div>
                )}
              </div>
            )}

            {/* Links */}
            <div className="space-y-1.5">
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  <Globe size={13} className="shrink-0" />
                  <span className="truncate">{c.url.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={11} className="shrink-0 opacity-50" />
                </a>
              )}
              {c.contact.value && c.contact.type === 'email' && (
                <a href={`mailto:${c.contact.value}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  <Mail size={13} className="shrink-0" />
                  {c.contact.value}
                </a>
              )}
              {c.contact.value && c.contact.type === 'url' && (
                <a href={c.contact.value} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  <Globe size={13} className="shrink-0" />
                  <span className="truncate">{c.contact.value.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {c.contact.value && c.contact.type === 'text' && (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Mail size={13} className="shrink-0 text-gray-400" />
                  {c.contact.value}
                </p>
              )}
            </div>

            {/* Events */}
            {c.events.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Events</h3>
                <div className="space-y-1.5">
                  {c.events.map((ev, i) => {
                    const evUrl = getEventUrl(c, ev)
                    return evUrl ? (
                      <a key={i} href={evUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                        <Calendar size={12} className="text-blue-400 shrink-0" />
                        {formatEventDate(ev)}
                        <ExternalLink size={11} className="shrink-0 opacity-50 ml-auto" />
                      </a>
                    ) : (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                        <Calendar size={12} className="text-gray-400 shrink-0" />
                        {formatEventDate(ev)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Notable Companies */}
            {c.notableCompanies.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notable Companies</h3>
                <div className="flex flex-wrap gap-1">
                  {c.notableCompanies.map((co, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      {co}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Coding Tools */}
            {c.codingTools.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Coding Tools</h3>
                <div className="flex flex-wrap gap-1">
                  {c.codingTools.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
