"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { FirebaseAccident } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, AlertTriangle } from "lucide-react"
import { performKMeansClustering, type Cluster } from "@/lib/utils/kmeans-clustering"

interface RiskAreaMapProps {
  accidents: FirebaseAccident[]
}

const MapComponent = dynamic(() => import("./risk-area-map-client"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-lg border flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

export function RiskAreaMap({ accidents }: RiskAreaMapProps) {
  const [clusters, setClusters] = useState<Cluster[]>([])

  // Perform clustering when accidents change
  useEffect(() => {
    const activeAccidents = accidents.filter((acc) => acc.status === "pending" || acc.status === "dispatched")
    const clusterResults = performKMeansClustering(activeAccidents, 3)
    setClusters(clusterResults)
  }, [accidents])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Risk Area Analysis</h2>
        <p className="text-muted-foreground">K-Means clustering visualization of accident-prone zones</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Container */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Clustered Risk Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <MapComponent clusters={clusters} />

              {/* Cluster count overlay */}
              <div className="absolute top-4 right-4 rounded-lg bg-background/95 px-3 py-2 shadow-lg backdrop-blur border z-[1000]">
                <p className="text-xs text-muted-foreground">Risk Zones</p>
                <p className="text-2xl font-bold">{clusters.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cluster Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cluster Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {clusters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No clusters detected</p>
              ) : (
                clusters
                  .sort((a, b) => b.riskScore - a.riskScore)
                  .map((cluster, index) => (
                    <div key={cluster.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">Cluster {index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            {cluster.center.lat.toFixed(4)}, {cluster.center.lng.toFixed(4)}
                          </p>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: cluster.color,
                            color: "white",
                          }}
                        >
                          {cluster.riskLevel}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Risk Score</span>
                          <span className="font-semibold">{cluster.riskScore.toFixed(1)}/100</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${cluster.riskScore}%`,
                              backgroundColor: cluster.color,
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Incidents</p>
                          <p className="font-semibold text-lg">{cluster.points.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Severity</p>
                          <p className="font-semibold text-lg">
                            {(
                              cluster.points.reduce((sum, p) => {
                                const weights = { critical: 4, high: 3, medium: 2, low: 1 }
                                return sum + weights[p.accident.severity]
                              }, 0) / cluster.points.length
                            ).toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Severity Distribution</p>
                        <div className="flex gap-1">
                          {["critical", "high", "medium", "low"].map((severity) => {
                            const count = cluster.points.filter((p) => p.accident.severity === severity).length
                            const percentage = (count / cluster.points.length) * 100

                            return (
                              <div
                                key={severity}
                                className="h-2 rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor:
                                    severity === "critical"
                                      ? "#dc2626"
                                      : severity === "high"
                                        ? "#ea580c"
                                        : severity === "medium"
                                          ? "#eab308"
                                          : "#22c55e",
                                }}
                                title={`${severity}: ${count}`}
                              />
                            )
                          })}
                        </div>
                      </div>
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
