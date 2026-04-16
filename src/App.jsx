import { useMemo } from 'react'
import { Calendar, Users } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import MapView from './components/map/MapView'
import Sidebar from './components/Sidebar'
import DetailModal from './components/detail/DetailPanel'

function Dashboard() {
  const { filtered, metadata, mobilePanel, dispatch } = useApp()
  const withTools = filtered.filter(c => c.hasAICodingTools).length

  const upcomingEventsCount = useMemo(() => {
    const now = new Date().toISOString().split('T')[0]
    return filtered.reduce((n, c) => n + c.events.filter(ev => ev.date >= now).length, 0)
  }, [filtered])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <FilterBar />

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative isolate">
          <MapView />
        </div>

        {/* Mobile sidebar backdrop */}
        {mobilePanel && (
          <div
            className="fixed inset-0 bg-black/20 z-10 lg:hidden"
            onClick={() => dispatch({ type: 'CLOSE_MOBILE_PANEL' })}
          />
        )}

        <Sidebar />

        {/* Mobile FABs */}
        <div className="lg:hidden fixed bottom-4 left-4 z-30 flex flex-col gap-3">
          <button
            onClick={() => dispatch({ type: 'OPEN_MOBILE_PANEL', panel: 'communities' })}
            className={`relative bg-white shadow-lg border border-gray-200 rounded-full p-3 transition-colors ${mobilePanel === 'communities' ? 'text-blue-600 ring-2 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
            aria-label="Toggle communities panel"
          >
            <Users size={20} />
          </button>
          <button
            onClick={() => dispatch({ type: 'OPEN_MOBILE_PANEL', panel: 'events' })}
            className={`relative bg-white shadow-lg border border-gray-200 rounded-full p-3 transition-colors ${mobilePanel === 'events' ? 'text-blue-600 ring-2 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
            aria-label="Toggle events panel"
          >
            <Calendar size={20} />
            {upcomingEventsCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>

      <footer className="px-3 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-400 shrink-0 flex items-center justify-between gap-2 md:px-4">
        <span>
          {filtered.length} communities &middot; {new Set(filtered.map(c => c.regionId)).size} regions
          {withTools > 0 && <> &middot; {withTools} with AI coding tools</>}
        </span>
        <span className="truncate">
          Data: {metadata.sourceFile}
        </span>
      </footer>

      <DetailModal />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  )
}
