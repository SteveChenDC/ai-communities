import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useApp } from '../../context/AppContext'
import { PRIORITY_COLORS } from '../../utils/constants'

export default function MapView() {
  const { filtered, selectedId, dispatch } = useApp()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(null)

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

    for (const c of filtered) {
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

      const tools = c.hasAICodingTools ? '<span style="color:#d97706;margin-left:4px">&#9881;</span>' : ''

      // Attendee count: use real data, or estimate from members / priority
      let attendees = c.attendanceEstimate
      let isEstimate = false
      if (!attendees || attendees < 9) {
        isEstimate = true
        if (c.memberCount && c.memberCount >= 100) {
          // ~5% of members typically attend a single event
          attendees = Math.round(c.memberCount * 0.05 / 10) * 10
          if (attendees < 20) attendees = 20
        } else {
          // Fallback by priority
          attendees = c.priority >= 3 ? 150 : c.priority >= 1 ? 75 : 40
        }
      }
      const attendeeLabel = `${attendees.toLocaleString()}+`
      const estTag = isEstimate
        ? '<span style="color:#9ca3af;font-style:italic"> est.</span>'
        : ''

      marker.bindPopup(`
        <div style="font-family:system-ui,-apple-system,sans-serif;min-width:200px;max-width:280px">
          <div style="font-weight:600;font-size:13px;line-height:1.3;margin-bottom:2px">
            ${c.name}${tools}
          </div>
          <div style="display:inline-block;font-size:11px;color:#6b7280;margin-bottom:6px">
            <span style="font-weight:600;color:#374151">${attendeeLabel}</span> attendees${estTag}
          </div>
          <div style="color:#6b7280;font-size:11px;line-height:1.4;margin-bottom:8px">
            ${c.description.slice(0, 120)}${c.description.length > 120 ? '...' : ''}
          </div>
          <div style="display:flex;gap:12px;align-items:center">
            ${c.url ? `<a href="${c.url}" target="_blank" rel="noopener" style="font-size:11px;color:#3b82f6;text-decoration:none">Visit &rarr;</a>` : ''}
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
        dispatch({ type: 'SELECT', id: link.dataset.detailId })
      }
    }
    map.getContainer().addEventListener('click', handler)
    return () => map.getContainer().removeEventListener('click', handler)
  }, [filtered, dispatch])

  // Pan to selected community
  useEffect(() => {
    if (!selectedId || !mapRef.current) return
    const c = filtered.find(c => c.id === selectedId)
    if (c?.lat && c?.lng) {
      mapRef.current.flyTo([c.lat, c.lng], Math.max(mapRef.current.getZoom(), 6), { duration: 0.5 })
    }
  }, [selectedId, filtered])

  return <div ref={containerRef} className="h-full w-full" />
}
