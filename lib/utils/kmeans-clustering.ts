import type { FirebaseAccident } from "@/lib/types"

export interface ClusterPoint {
  lat: number
  lng: number
  accident: FirebaseAccident
}

export interface Cluster {
  id: number
  center: { lat: number; lng: number }
  points: ClusterPoint[]
  riskScore: number
  riskLevel: "High" | "Medium" | "Low"
  color: string
}

// Calculate Euclidean distance between two points
function calculateDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const latDiff = p1.lat - p2.lat
  const lngDiff = p1.lng - p2.lng
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)
}

// Initialize cluster centers using K-Means++ algorithm
function initializeCenters(points: ClusterPoint[], k: number): { lat: number; lng: number }[] {
  if (points.length === 0) return []
  if (points.length <= k) {
    return points.map((p) => ({ lat: p.lat, lng: p.lng }))
  }

  const centers: { lat: number; lng: number }[] = []

  // Choose first center randomly
  const firstIndex = Math.floor(Math.random() * points.length)
  centers.push({ lat: points[firstIndex].lat, lng: points[firstIndex].lng })

  // Choose remaining centers
  for (let i = 1; i < k; i++) {
    const distances = points.map((point) => {
      const minDist = Math.min(...centers.map((center) => calculateDistance(point, center)))
      return minDist * minDist
    })

    const totalDist = distances.reduce((sum, d) => sum + d, 0)
    let random = Math.random() * totalDist
    let selectedIndex = 0

    for (let j = 0; j < distances.length; j++) {
      random -= distances[j]
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }

    centers.push({ lat: points[selectedIndex].lat, lng: points[selectedIndex].lng })
  }

  return centers
}

// Perform K-Means clustering
export function performKMeansClustering(accidents: FirebaseAccident[], k = 3): Cluster[] {
  if (accidents.length === 0) return []

  // Convert accidents to cluster points
  const points: ClusterPoint[] = accidents.map((accident) => ({
    lat: accident.location.latitude,
    lng: accident.location.longitude,
    accident,
  }))

  // Handle edge case: fewer points than clusters
  if (points.length <= k) {
    return points.map((point, index) => {
      const riskScore = calculateRiskScore([point])
      return {
        id: index,
        center: { lat: point.lat, lng: point.lng },
        points: [point],
        riskScore,
        riskLevel: getRiskLevel(riskScore),
        color: getRiskColor(getRiskLevel(riskScore)),
      }
    })
  }

  // Initialize centers
  let centers = initializeCenters(points, k)
  let clusters: ClusterPoint[][] = []
  let iterations = 0
  const maxIterations = 100

  // K-Means iteration
  while (iterations < maxIterations) {
    // Assign points to nearest cluster
    clusters = Array.from({ length: k }, () => [])

    for (const point of points) {
      let minDist = Number.POSITIVE_INFINITY
      let clusterIndex = 0

      for (let i = 0; i < centers.length; i++) {
        const dist = calculateDistance(point, centers[i])
        if (dist < minDist) {
          minDist = dist
          clusterIndex = i
        }
      }

      clusters[clusterIndex].push(point)
    }

    // Calculate new centers
    const newCenters = clusters.map((cluster) => {
      if (cluster.length === 0) {
        // Keep the old center if cluster is empty
        return centers[clusters.indexOf(cluster)]
      }

      const sumLat = cluster.reduce((sum, p) => sum + p.lat, 0)
      const sumLng = cluster.reduce((sum, p) => sum + p.lng, 0)

      return {
        lat: sumLat / cluster.length,
        lng: sumLng / cluster.length,
      }
    })

    // Check for convergence
    const hasConverged = centers.every((center, i) => {
      const dist = calculateDistance(center, newCenters[i])
      return dist < 0.0001 // Convergence threshold
    })

    centers = newCenters
    iterations++

    if (hasConverged) break
  }

  // Create cluster objects with risk scores
  return clusters
    .map((clusterPoints, index) => {
      if (clusterPoints.length === 0) return null

      const riskScore = calculateRiskScore(clusterPoints)

      return {
        id: index,
        center: centers[index],
        points: clusterPoints,
        riskScore,
        riskLevel: getRiskLevel(riskScore),
        color: getRiskColor(getRiskLevel(riskScore)),
      }
    })
    .filter((cluster): cluster is Cluster => cluster !== null)
}

// Calculate risk score based on cluster density and severity
function calculateRiskScore(points: ClusterPoint[]): number {
  if (points.length === 0) return 0

  // Factor 1: Number of incidents (normalized)
  const incidentScore = Math.min(points.length / 10, 1) * 40 // Max 40 points

  // Factor 2: Severity score
  const severityWeights = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  }

  const totalSeverity = points.reduce((sum, point) => {
    return sum + severityWeights[point.accident.severity]
  }, 0)

  const avgSeverity = totalSeverity / points.length
  const severityScore = (avgSeverity / 4) * 40 // Max 40 points

  // Factor 3: Recent incidents (within last hour)
  const now = Date.now()
  const recentIncidents = points.filter((point) => {
    const timeDiff = now - new Date(point.accident.timestamp).getTime()
    return timeDiff < 60 * 60 * 1000 // 1 hour
  }).length

  const recencyScore = Math.min(recentIncidents / points.length, 1) * 20 // Max 20 points

  return incidentScore + severityScore + recencyScore
}

// Map risk score to risk level
function getRiskLevel(score: number): "High" | "Medium" | "Low" {
  if (score >= 70) return "High"
  if (score >= 40) return "Medium"
  return "Low"
}

// Map risk level to color
function getRiskColor(level: "High" | "Medium" | "Low"): string {
  switch (level) {
    case "High":
      return "#ef4444" // Red
    case "Medium":
      return "#f97316" // Orange
    case "Low":
      return "#eab308" // Yellow
  }
}
