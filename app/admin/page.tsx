"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { AccidentsView } from "@/components/accidents-view"
import { PersonnelManagement } from "@/components/personnel-management"
import { AnalyticsView } from "@/components/analytics-view"
import { UsersManagement } from "@/components/users-management"
import { ReportsView } from "@/components/reports-view"
import { listenToAccidents } from "@/lib/firebase-service"
import type { FirebaseAccident } from "@/lib/types"

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("accidents")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accidents, setAccidents] = useState<FirebaseAccident[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAccess, setCheckingAccess] = useState(true)

  const router = useRouter()

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/admin/login")
        return
      }

      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (!userDocSnap.exists() || userDocSnap.data()?.isAdmin !== true) {
          router.replace("/admin/login")
          return
        }

        setCheckingAccess(false)
      } catch (error) {
        console.error("Admin access check failed:", error)
        router.replace("/admin/login")
      }
    })

    return () => unsubscribeAuth()
  }, [router])

  useEffect(() => {
    if (checkingAccess) return

    const unsubscribeAccidents = listenToAccidents((fetchedAccidents) => {
      setAccidents(fetchedAccidents)
      setLoading(false)
    })

    return () => unsubscribeAccidents()
  }, [checkingAccess])

  const activeAccidents = accidents.filter(
    (acc) => acc.status === "pending" || acc.status === "dispatched"
  ).length

  if (checkingAccess || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">
            {checkingAccess ? "Checking admin access..." : "Loading accident data..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        onMenuClick={() => setSidebarOpen(true)}
        activeAccidents={activeAccidents}
      />

      <div className="flex">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 p-4 md:p-6">
          {activeTab === "accidents" && <AccidentsView accidents={accidents} />}
          {activeTab === "personnel" && <PersonnelManagement />}
          {activeTab === "users" && <UsersManagement />}
          {activeTab === "reports" && <ReportsView accidents={accidents} />}
          {activeTab === "analytics" && <AnalyticsView accidents={accidents} />}
        </main>
      </div>
    </div>
  )
}