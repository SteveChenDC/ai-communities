import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import MapView from './components/map/MapView'
import Sidebar from './components/Sidebar'
import DetailModal from './components/detail/DetailPanel'

function Dashboard() {
  const { filtered, metadata } = useApp()
  const withTools = filtered.filter(c => c.hasAICodingTools).length

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <FilterBar />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative isolate">
          <MapView />
        </div>
        <Sidebar />
      </div>

      <footer className="px-4 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-400 shrink-0 flex items-center justify-between">
        <span>
          {filtered.length} communities &middot; {new Set(filtered.map(c => c.regionId)).size} regions
          {withTools > 0 && <> &middot; {withTools} with AI coding tools</>}
        </span>
        <span>
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
