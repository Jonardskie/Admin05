import type { Accident } from "../types"

export function getAccidentStatusColor(status: Accident["status"]): string {
  switch (status) {
    case "pending":
      return "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950"
    case "dispatched":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
    case "resolved":
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
    case "false-alarm":
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
    default:
      return "text-gray-600 bg-gray-50"
  }
}

export function getSeverityColor(severity: Accident["severity"]): string {
  switch (severity) {
    case "low":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
    case "medium":
      return "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950"
    case "high":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950"
    case "critical":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950"
    default:
      return "text-gray-600 bg-gray-50"
  }
}

export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

export function formatFullTimestamp(date: Date): string {
  // Format in Philippine timezone (Asia/Manila)
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}
