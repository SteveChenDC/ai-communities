import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useApp } from '../../context/AppContext'
import { PRIORITY_COLORS } from '../../utils/constants'

export default function MapView() {
  const { filtered, filters, selectedId, showCommunities, dispatch } = useApp()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(null)
  const clearControlRef = useRef(null)

  // Initialize map once
  useEffect(() => {
    if (mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [35, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 15,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Update markers when data or selection changes
  useEffect(() => {
    const map = mapRef.current
    const layer = markersRef.current
    if (!map || !layer) return

    layer.clearLayers()
    if (!filtered.length) return

    const bounds = []

    const visible = showCommunities ? filtered : filtered.filter(c => c.events.length > 0)
    for (const c of visible) {
      if (!c.lat || !c.lng) continue

      const p = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS[0]
      const isSelected = c.id === selectedId
      const radius = c.priority >= 3 ? 8 : c.priority >= 1 ? 6 : 4.5

      const marker = L.circleMarker([c.lat, c.lng], {
        radius: isSelected ? radius + 3 : radius,
        fillColor: p.fill,
        color: isSelected ? '#1d4ed8' : '#fff',
        weight: isSelected ? 2.5 : 1.5,
        opacity: 1,
        fillOpacity: isSelected ? 1 : 0.75,
      })

      // Stats line: last event attendees if available, otherwise member count
      let statsLine = ''
      if (c.attendanceEstimate) {
        statsLine = `<span style="font-weight:600;color:#374151">${c.attendanceEstimate.toLocaleString()}+</span> last event attendees`
      } else if (c.memberCount) {
        statsLine = `<span style="font-weight:600;color:#374151">${c.memberCount.toLocaleString()}</span> members`
      }

      const siblingCount = filtered.filter(s =>
        s.id !== c.id && (c.isGrouped ? s.groupName === c.groupName : s.regionId === c.regionId)
      ).length
      const siblingLine = siblingCount > 0
        ? `<div style="font-size:10px;color:#9ca3af;margin-bottom:6px">${siblingCount} related group${siblingCount > 1 ? 's' : ''} nearby</div>`
        : ''
      const nextEvent = Array.isArray(c.events) ? c.events.find((ev) => ev?.date) : null
      let nextEventLine = ''
      if (nextEvent) {
        const d = new Date(nextEvent.date + 'T12:00:00')
        const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        nextEventLine = `<div style="font-size:11px;color:#4b5563;margin-bottom:6px"><strong>Next:</strong> ${formatted}</div>`
      }
      const nextEventLink = nextEvent?.url
        ? `<a href="${nextEvent.url}" target="_blank" rel="noopener" style="font-size:11px;color:#3b82f6;text-decoration:none">Event &rarr;</a>`
        : ''

      marker.bindPopup(`
        <div style="font-family:system-ui,-apple-system,sans-serif;min-width:200px;max-width:280px">
          <div style="font-weight:600;font-size:13px;line-height:1.3;margin-bottom:2px">
            ${c.name}
          </div>
          ${statsLine ? `<div style="display:inline-block;font-size:11px;color:#6b7280;margin-bottom:6px">${statsLine}</div>` : ''}
          ${siblingLine}
          ${nextEventLine}
          <div style="color:#6b7280;font-size:11px;line-height:1.4;margin-bottom:8px">
            ${c.description.slice(0, 120)}${c.description.length > 120 ? '...' : ''}
          </div>
          <div style="display:flex;gap:12px;align-items:center">
            ${c.url ? `<a href="${c.url}" target="_blank" rel="noopener" style="font-size:11px;color:#3b82f6;text-decoration:none">Visit &rarr;</a>` : ''}
            ${nextEventLink}
            <a href="#" data-detail-id="${c.id}" style="font-size:11px;color:#3b82f6;text-decoration:none;cursor:pointer">Details &rarr;</a>
          </div>
        </div>
      `, { maxWidth: 300, className: 'clean-popup' })

      marker.addTo(layer)
      bounds.push([c.lat, c.lng])
    }

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 })
    }

    // Delegated click handler for "Details" links inside popups
    const handler = (e) => {
      const link = e.target.closest('[data-detail-id]')
      if (link) {
        e.preventDefault()
        map.closePopup()
        dispatch({ type: 'SELECT', id: link.dataset.detailId })
      }
    }
    map.getContainer().addEventListener('click', handler)
    return () => map.getContainer().removeEventListener('click', handler)
  }, [filtered, showCommunities, dispatch])

  // Pan to selected community and close any open popup
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.closePopup()
    if (!selectedId) return
    const c = filtered.find(c => c.id === selectedId)
    if (c?.lat && c?.lng) {
      mapRef.current.flyTo([c.lat, c.lng], Math.max(mapRef.current.getZoom(), 6), { duration: 0.5 })
    }
  }, [selectedId, filtered])

  // Clear Filters control on map
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const hasFilters = filters.search || filters.regions.length || filters.priorities.length

    if (hasFilters && !clearControlRef.current) {
      const ClearControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd() {
          const btn = L.DomUtil.create('button', '')
          btn.innerHTML = '✕ Clear Filters'
          btn.style.cssText = 'background:#34d399;border:1px solid #34d399;border-radius:8px;padding:5px 12px;font-size:12px;color:#fff;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.1);font-family:system-ui,sans-serif;font-weight:500'
          btn.onmouseenter = () => { btn.style.background = '#10b981'; btn.style.borderColor = '#10b981' }
          btn.onmouseleave = () => { btn.style.background = '#34d399'; btn.style.borderColor = '#34d399' }
          L.DomEvent.disableClickPropagation(btn)
          btn.onclick = () => dispatch({ type: 'CLEAR_FILTERS' })
          return btn
        },
      })
      clearControlRef.current = new ClearControl()
      clearControlRef.current.addTo(map)
    } else if (!hasFilters && clearControlRef.current) {
      map.removeControl(clearControlRef.current)
      clearControlRef.current = null
    }
  }, [filters, dispatch])

  return <div ref={containerRef} className="h-full w-full" />
}
