"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { AccidentsView } from "@/components/accidents-view"
// import { MapView } from "@/components/map-view"
import { PersonnelManagement } from "@/components/personnel-management"
import { AnalyticsView } from "@/components/analytics-view"
import { UsersManagement } from "@/components/users-management"
import { ReportsView } from "@/components/reports-view"
import { listenToAccidents } from "@/lib/firebase-service"
import type { FirebaseAccident } from "@/lib/types"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("accidents")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accidents, setAccidents] = useState<FirebaseAccident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("[v0] Setting up Firebase listener for accidents")

    const unsubscribe = listenToAccidents((fetchedAccidents) => {
      console.log("[v0] Received accidents from Firebase:", fetchedAccidents.length)
      setAccidents(fetchedAccidents)
      setLoading(false)
    })

    return () => {
      console.log("[v0] Cleaning up Firebase listener")
      unsubscribe()
    }
  }, [])

  const activeAccidents = accidents.filter((acc) => acc.status === "pending" || acc.status === "dispatched").length

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading accident data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} activeAccidents={activeAccidents} />

      <div className="flex">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 p-4 md:p-6">
          {activeTab === "accidents" && <AccidentsView accidents={accidents} />}
          {/* {activeTab === "map" && <MapView accidents={accidents} />} */}
          {activeTab === "personnel" && <PersonnelManagement />}
          {activeTab === "users" && <UsersManagement />}
          {activeTab === "reports" && <ReportsView accidents={accidents} />}
          {activeTab === "analytics" && <AnalyticsView accidents={accidents} />}
        </main>
      </div>
    </div>
  )
}
