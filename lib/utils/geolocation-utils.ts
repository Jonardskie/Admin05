// Geolocation utility functions for map features

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface GeofenceZone {
  id: string
  name: string
  center: Coordinates
  radius: number // in meters
  alertEnabled: boolean
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude)
  const dLon = toRadians(coord2.longitude - coord1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 100) / 100 // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

/**
 * Reverse geocode coordinates to address
 * Note: Disabled due to CORS restrictions with Nominatim API
 * Returns formatted coordinates instead
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

/**
 * Check if coordinates are within a geofence zone
 */
export function isInGeofence(point: Coordinates, zone: GeofenceZone): boolean {
  const distance = calculateDistance(point, zone.center) * 1000 // Convert to meters
  return distance <= zone.radius
}

/**
 * Generate route URL for navigation apps
 */
export function getRouteUrl(
  from: Coordinates,
  to: Coordinates,
  provider: "google" | "apple" | "osm" = "google",
): string {
  switch (provider) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&travelmode=driving`
    case "apple":
      return `http://maps.apple.com/?saddr=${from.latitude},${from.longitude}&daddr=${to.latitude},${to.longitude}&dirflg=d`
    case "osm":
      return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.latitude}%2C${from.longitude}%3B${to.latitude}%2C${to.longitude}`
    default:
      return ""
  }
}

/**
 * Get estimated travel time (simplified calculation)
 * Assumes average speed of 50 km/h in urban areas
 */
export function estimateTravelTime(distanceKm: number): string {
  const averageSpeedKmh = 50
  const hours = distanceKm / averageSpeedKmh
  const minutes = Math.round(hours * 60)

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs}h ${mins}m`
}
