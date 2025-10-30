"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import type { Cluster } from "@/lib/utils/kmeans-clustering"

interface MapComponentProps {
  clusters: Cluster[]
}

function MapBoundsUpdater({ clusters }: { clusters: Cluster[] }) {
  const map = useMap()

  useEffect(() => {
    if (clusters.length > 0) {
      const bounds = L.latLngBounds(clusters.map((c) => [c.center.lat, c.center.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [clusters, map])

  return null
}

export default function RiskAreaMapClient({ clusters }: MapComponentProps) {
  useEffect(() => {
    // Check if Leaflet CSS is already loaded
    const existingLink = document.querySelector('link[href*="leaflet.css"]')
    if (!existingLink) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      link.crossOrigin = ""
      document.head.appendChild(link)
    }
  }, [])

  return (
    <MapContainer
      center={[17.614, 121.729]}
      zoom={12}
      scrollWheelZoom={true}
      className="w-full h-[600px] rounded-lg border z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapBoundsUpdater clusters={clusters} />

      {clusters.map((cluster) => (
        <Circle
          key={cluster.id}
          center={[cluster.center.lat, cluster.center.lng]}
          radius={500}
          pathOptions={{
            color: cluster.color,
            fillColor: cluster.color,
            fillOpacity: 0.3,
            weight: 2,
          }}
        >
          <Popup>
            <div className="font-sans">
              <h3 className="mb-2 text-sm font-semibold" style={{ color: cluster.color }}>
                {cluster.riskLevel} Risk Area
              </h3>
              <p className="mb-1 text-xs text-gray-600">
                <strong>Total Incidents:</strong> {cluster.points.length}
              </p>
              <p className="text-xs text-gray-600">
                <strong>Risk Score:</strong> {cluster.riskScore.toFixed(1)}/100
              </p>
            </div>
          </Popup>
        </Circle>
      ))}

      {clusters.flatMap((cluster) =>
        cluster.points.map((point) => {
          const severityColor =
            point.accident.severity === "critical"
              ? "#dc2626"
              : point.accident.severity === "high"
                ? "#ea580c"
                : point.accident.severity === "medium"
                  ? "#eab308"
                  : "#22c55e"

          const markerIcon = L.divIcon({
            className: "custom-marker",
            html: `
              <div style="
                width: 12px;
                height: 12px;
                background-color: ${severityColor};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>
            `,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          })

          return (
            <Marker key={point.accident.id} position={[point.lat, point.lng]} icon={markerIcon}>
              <Popup>
                <div className="font-sans">
                  <h4 className="mb-1 text-xs font-semibold">{point.accident.user.name}</h4>
                  <p className="mb-0.5 text-[11px] text-gray-600">
                    <strong>Severity:</strong> {point.accident.severity}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    <strong>Status:</strong> {point.accident.status}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        }),
      )}
    </MapContainer>
  )
}
