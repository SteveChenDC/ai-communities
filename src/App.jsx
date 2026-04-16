import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import MapView from './components/map/MapView'
import Sidebar from './components/Sidebar'
import DetailModal from './components/detail/DetailPanel'

function Dashboard() {
  const { filtered, metadata, mobileSidebarOpen, dispatch } = useApp()
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
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-10 lg:hidden"
            onClick={() => dispatch({ type: 'CLOSE_MOBILE_SIDEBAR' })}
          />
        )}

        <Sidebar />

        {/* Mobile FAB to toggle sidebar */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_MOBILE_SIDEBAR' })}
          className="lg:hidden fixed bottom-4 left-4 z-30 bg-white shadow-lg border border-gray-200 rounded-full p-3 text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Toggle events panel"
        >
          <Calendar size={20} />
          {upcomingEventsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {upcomingEventsCount > 99 ? '99+' : upcomingEventsCount}
            </span>
          )}
        </button>
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
