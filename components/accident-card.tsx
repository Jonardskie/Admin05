"use client"

import type { FirebaseAccident } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, User, MapPin } from "lucide-react"
import { getAccidentStatusColor, formatFullTimestamp } from "@/lib/utils/accident-utils"
import { cn } from "@/lib/utils"

interface AccidentCardProps {
  accident: FirebaseAccident
  onClick: () => void
}

export function AccidentCard({ accident, onClick }: AccidentCardProps) {
  // The row wrapper is now handled by the parent AccidentsView component
  return (
    <>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
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
            <p className="font-semibold text-sm">{accident.id}</p>
            <p className="text-xs text-muted-foreground">{formatFullTimestamp(accident.timestamp)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{accident.user.name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground line-clamp-1">{accident.location.address}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className={cn("text-xs", getAccidentStatusColor(accident.status))}>{accident.status}</Badge>
      </td>
    </>
  )
}
