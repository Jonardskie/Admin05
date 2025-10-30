"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getAllUserLocations } from "@/lib/firebase-service"
import { UserStatusIndicator } from "@/components/user-status-indicator"

interface UsersMapViewProps {
  accidents?: any[]
}

export function UsersMapView({ accidents = [] }: UsersMapViewProps) {
  const [userLocations, setUserLocations] = useState<Map<string, any>>(new Map())
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [hoveredUser, setHoveredUser] = useState<string | null>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    const loadUserLocations = async () => {
      const locations = await getAllUserLocations()
      setUserLocations(locations)
      console.log("[v0] Loaded user locations:", locations.size)
    }

    loadUserLocations()

    // Refresh every 10 seconds
    const interval = setInterval(loadUserLocations, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const script = document.createElement("script")
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.async = true
    script.onload = () => {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)

      const L = (window as any).L

      const mapInstance = L.map(mapContainer.current).setView([17.6582, 121.7548], 14)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 1,
      }).addTo(mapInstance)

      map.current = mapInstance
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!map.current) return

    const L = (window as any).L

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current.clear()

    // Add user location markers
    userLocations.forEach((userLocation, userId) => {
      const statusColor =
        userLocation.status === "online" ? "#22c55e" : userLocation.status === "busy" ? "#eab308" : "#9ca3af"

      const marker = L.circleMarker([userLocation.latitude, userLocation.longitude], {
        radius: 8,
        fillColor: statusColor,
        color: "white",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .addTo(map.current)
        .bindPopup(`<strong>${userLocation.name}</strong><br/>${userLocation.status}`)
        .on("click", () => setSelectedUser(userId))
        .on("mouseover", () => setHoveredUser(userId))
        .on("mouseout", () => setHoveredUser(null))

      markersRef.current.set(userId, marker)
    })

    // Add accident location markers
    accidents.forEach((accident) => {
      const color =
        accident.severity === "critical"
          ? "#dc2626"
          : accident.severity === "high"
            ? "#ea580c"
            : accident.severity === "medium"
              ? "#eab308"
              : "#22c55e"

      const marker = L.circleMarker([accident.location.latitude, accident.location.longitude], {
        radius: 10,
        fillColor: color,
        color: "white",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
        dashArray: "5, 5",
      })
        .addTo(map.current)
        .bindPopup(`<strong>Accident: ${accident.user.name}</strong><br/>${accident.status}`)

      markersRef.current.set(`accident-${accident.id}`, marker)
    })

    // Fit bounds if there are markers
    if (markersRef.current.size > 0) {
      const group = L.featureGroup(Array.from(markersRef.current.values()))
      map.current.fitBounds(group.getBounds().pad(0.1))
    }
  }, [userLocations, accidents])

  const onlineUsers = Array.from(userLocations.values()).filter((u) => u.status === "online").length
  const busyUsers = Array.from(userLocations.values()).filter((u) => u.status === "busy").length
  const offlineUsers = Array.from(userLocations.values()).filter((u) => u.status === "offline").length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Locations & Status</h2>
        <p className="text-muted-foreground">Real-time user locations and active status monitoring</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Online Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Busy Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{busyUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">On duty or responding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Offline Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{offlineUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Not currently active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              User Locations Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full rounded-lg border overflow-hidden" style={{ height: "500px" }}>
              <div ref={mapContainer} className="w-full h-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {userLocations.size === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No users with location data</p>
                </div>
              ) : (
                Array.from(userLocations.values()).map((userLocation) => (
                  <div
                    key={userLocation.userId}
                    className={cn(
                      "rounded-lg border p-3 transition-all cursor-pointer hover:border-primary",
                      hoveredUser === userLocation.userId && "ring-2 ring-primary",
                      selectedUser === userLocation.userId && "ring-2 ring-primary bg-primary/5",
                    )}
                    onMouseEnter={() => setHoveredUser(userLocation.userId)}
                    onMouseLeave={() => setHoveredUser(null)}
                    onClick={() => setSelectedUser(userLocation.userId)}
                  >
                    <UserStatusIndicator
                      userId={userLocation.userId}
                      userName={userLocation.name}
                      userPhone={userLocation.phone}
                      userEmail={userLocation.email}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
