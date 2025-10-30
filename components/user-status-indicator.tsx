"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { listenToUserStatus, listenToUserLocation } from "@/lib/firebase-service"

interface UserStatusIndicatorProps {
  userId: string
  userName: string
  userPhone?: string
  userEmail?: string
  className?: string
}

export function UserStatusIndicator({ userId, userName, userPhone, userEmail, className }: UserStatusIndicatorProps) {
  const [status, setStatus] = useState<"online" | "offline" | "busy">("offline")
  const [location, setLocation] = useState<{ latitude: number; longitude: number; timestamp: number } | null>(null)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)

  useEffect(() => {
    const unsubscribeStatus = listenToUserStatus(userId, (newStatus) => {
      setStatus(newStatus as "online" | "offline" | "busy")
    })

    const unsubscribeLocation = listenToUserLocation(userId, (newLocation) => {
      setLocation(newLocation)
      if (newLocation.timestamp) {
        setLastSeen(new Date(newLocation.timestamp))
      }
    })

    return () => {
      unsubscribeStatus()
      unsubscribeLocation()
    }
  }, [userId])

  const statusColor = status === "online" ? "bg-green-500" : status === "busy" ? "bg-yellow-500" : "bg-gray-400"

  const statusLabel = status === "online" ? "Online" : status === "busy" ? "Busy" : "Offline"

  const getTimeAgo = (date: Date | null) => {
    if (!date) return "Never"
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className={cn("h-3 w-3 rounded-full animate-pulse", statusColor)} />
        <Badge variant="outline" className="text-xs">
          {statusLabel}
        </Badge>
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium">{userName}</p>
        {userPhone && <p className="text-xs text-muted-foreground">{userPhone}</p>}
        {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
      </div>

      {location && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Last seen: {getTimeAgo(lastSeen)}</span>
      </div>
    </div>
  )
}
