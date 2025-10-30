"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// ✅ Helper to check valid coordinates
const isValidLatLng = (coords?: [number, number] | null) => {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number" &&
    isFinite(coords[0]) &&
    isFinite(coords[1])
  )
}

// 🧭 Smooth camera movement helper
function MapFlyTo({ position }: { position?: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    if (!isValidLatLng(position)) return
    const [lat, lng] = position!
    map.flyTo([lat, lng], 15, { animate: true })
  }, [position, map])

  return null
}

// 📍 Safe marker wrapper (prevents invalid markers)
function SafeMarker({
  lat,
  lng,
  label,
  color = "blue",
}: {
  lat?: number
  lng?: number
  label?: string
  color?: string
}) {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    console.warn("⚠️ Skipping invalid marker:", { lat, lng })
    return null
  }

  const customIcon = L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color:${color};width:14px;height:14px;border-radius:50%;border:2px solid white"></div>`,
  })

  return (
    <Marker position={[lat, lng]} icon={customIcon}>
      {label && <Popup>{label}</Popup>}
    </Marker>
  )
}

interface MapProps {
  center: [number, number]
  zoom?: number
  userPosition?: [number, number]
  destination?: [number, number] | null
  pois?: { latitude: number; longitude: number; name: string }[]
  onPoiClick?: (lat: number, lon: number) => void
  onMapInstance?: (map: L.Map) => void
}

export default function MapComponent({
  center,
  zoom = 14,
  userPosition,
  destination,
  pois = [],
  onPoiClick,
  onMapInstance,
}: MapProps) {
  // ✅ Use safe center fallback (avoids undefined map load)
  const safeCenter = isValidLatLng(center) ? center : [14.5995, 120.9842] // Manila fallback

  useEffect(() => {
    if (onMapInstance) {
      // Only call once map is available
      const mapRoot = L.DomUtil.get("map-root")
      if (mapRoot) {
        onMapInstance(L.map)
      }
    }
  }, [onMapInstance])

  return (
    <div id="map-root" className="w-full h-full rounded-lg overflow-hidden">
      <MapContainer
        center={safeCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => onMapInstance?.(map)}
      >
        {/* 🗺️ Base Map Layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* 👤 User Marker */}
        {isValidLatLng(userPosition) && (
          <SafeMarker
            lat={userPosition![0]}
            lng={userPosition![1]}
            label="You are here"
            color="#2563eb"
          />
        )}

        {/* 🎯 Destination Marker */}
        {isValidLatLng(destination) && (
          <SafeMarker
            lat={destination![0]}
            lng={destination![1]}
            label="Destination"
            color="red"
          />
        )}

        {/* 🏥 Points of Interest */}
        {pois.map((poi, i) =>
          isValidLatLng([poi.latitude, poi.longitude]) ? (
            <SafeMarker
              key={i}
              lat={poi.latitude}
              lng={poi.longitude}
              label={poi.name}
              color="#16a34a"
            />
          ) : null
        )}

        {/* 🔄 Smooth Camera */}
        <MapFlyTo position={userPosition} />
      </MapContainer>
    </div>
  )
}
