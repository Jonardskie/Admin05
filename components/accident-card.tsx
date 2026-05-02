"use client"

import type { FirebaseAccident } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, MapPin } from "lucide-react"
import {
  getAccidentStatusColor,
  formatFullTimestamp,
} from "@/lib/utils/accident-utils"
import { cn } from "@/lib/utils"

interface AccidentCardProps {
  accident: FirebaseAccident
  onClick: () => void
}

export function AccidentCard({ accident }: AccidentCardProps) {
  const reporterName =
    accident.name || accident.user?.name || accident.userId || "Unknown User"

  const locationText =
    accident.location?.address ||
    accident.coordinates ||
    (accident.latitude && accident.longitude
      ? `${accident.latitude}, ${accident.longitude}`
      : "No location")

  return (
    <>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
              accident.severity === "critical" || accident.severity === "high"
                ? "bg-red-100 dark:bg-red-950"
                : "bg-yellow-100 dark:bg-yellow-950",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                accident.severity === "critical" || accident.severity === "high"
                  ? "text-red-600 dark:text-red-400"
                  : "text-yellow-600 dark:text-yellow-400",
              )}
            />
          </div>

          <div>
            <p className="text-sm font-semibold">{reporterName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFullTimestamp(accident.timestamp)}
            </p>
            <p className="text-xs text-muted-foreground">
              ID: {accident.id}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="line-clamp-1 text-muted-foreground">
            {locationText}
          </span>
        </div>
      </td>

      <td className="px-4 py-3">
        <Badge className={cn("text-xs", getAccidentStatusColor(accident.status))}>
          {accident.status}
        </Badge>
      </td>
    </>
  )
}