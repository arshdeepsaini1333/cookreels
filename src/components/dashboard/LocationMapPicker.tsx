'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2 } from 'lucide-react'

// Leaflet's default marker icon assets don't resolve correctly through bundlers —
// point them at a CDN instead of relying on webpack asset resolution.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export type LocationType = 'city' | 'state' | 'country' | 'pincode'

const NOMINATIM_ADDRESS_KEYS: Record<LocationType, string[]> = {
  city:    ['city', 'town', 'village', 'municipality', 'county'],
  state:   ['state'],
  country: ['country'],
  pincode: ['postcode'],
}

function resolveAddressField(address: Record<string, string>, type: LocationType): string | null {
  for (const key of NOMINATIM_ADDRESS_KEYS[type]) {
    if (address[key]) return address[key]
  }
  return null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function LocationMapPicker({ locationType, onAdd, isDark }: {
  locationType: LocationType
  onAdd: (value: string) => void
  isDark: boolean
}) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async (lat: number, lng: number) => {
    setPosition([lat, lng])
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`)
      const data = await res.json() as { address?: Record<string, string> }
      const value = data.address ? resolveAddressField(data.address, locationType) : null
      if (!value) {
        setError(`Couldn't resolve a ${locationType} for that point — try zooming in or clicking elsewhere.`)
        return
      }
      onAdd(value)
    } catch {
      setError('Could not reach the map lookup service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, height: 260 }}>
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={handleClick} />
        {position && <Marker position={position} icon={markerIcon} />}
      </MapContainer>

      {loading && (
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.70)', zIndex: 1000 }}>
          <Loader2 size={14} className="text-white animate-spin" />
        </div>
      )}

      {error && (
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs font-medium"
          style={{ background: 'rgba(255,107,107,0.92)', color: '#fff', zIndex: 1000 }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
