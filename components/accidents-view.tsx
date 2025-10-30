"use client"

import { useEffect, useState } from "react"
import { AccidentCard } from "@/components/accident-card"
import { AccidentDetails } from "@/components/accident-details"
import type { FirebaseAccident } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Trash2, Eraser } from "lucide-react"
import { deleteAccident, cleanupInvalidAccidents } from "@/lib/firebase-service"
import { useToast } from "@/hooks/use-toast"
import { rtdb } from "@/lib/firebase"
import { ref, onValue, set } from "firebase/database"

export function AccidentsView({ accidents }: { accidents: FirebaseAccident[] }) {
  const [selectedAccident, setSelectedAccident] = useState<FirebaseAccident | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<Record<string, any>>({})

  // ✅ Safe Realtime DB listener for admin alerts (no infinite loop)
  useEffect(() => {
    const alertsRef = ref(rtdb, "admin_alerts")
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val() || {}

      // ✅ Use functional state update to avoid infinite re-renders
      setAlerts((prevAlerts) => {
        const updatedAlerts = { ...prevAlerts }

        Object.entries(data).forEach(([id, alert]) => {
          if (!prevAlerts[id] && !alert.viewed) {
            toast({
              title: "🚨 Auto-Confirmed Accident Detected",
              description: alert.coordinates
                ? `Location: ${alert.coordinates}`
                : "A new accident was auto-confirmed.",
              variant: "destructive",
            })
          }
          updatedAlerts[id] = alert
        })

        return updatedAlerts
      })
    })

    return () => unsubscribe()
  }, [toast])

  // ✅ Mark alert as viewed when admin opens an accident
  const handleViewAccident = async (accident: FirebaseAccident) => {
    setSelectedAccident(accident)
    try {
      await set(ref(rtdb, `admin_alerts/${accident.id}/viewed`), true)
    } catch (err) {
      console.error("[v0] Failed to mark alert as viewed:", err)
    }
  }

  const sortByLatest = (accidentsList: FirebaseAccident[]) => {
    return [...accidentsList].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  const allAccidents = sortByLatest(accidents)
  const pendingAccidents = sortByLatest(accidents.filter((acc) => acc.status === "pending"))
  const dispatchedAccidents = sortByLatest(accidents.filter((acc) => acc.status === "dispatched"))
  const resolvedAccidents = sortByLatest(accidents.filter((acc) => acc.status === "resolved"))

  // ✅ Delete Accident
  const handleDelete = async (accident: FirebaseAccident) => {
    setDeletingIds((prev) => new Set(prev).add(accident.id))

    try {
      await deleteAccident(accident.id)
      toast({
        title: "🗑️ Accident deleted",
        description: `The ${accident.status} accident has been removed.`,
      })
    } catch (error) {
      console.error("[v0] Error deleting accident:", error)
      toast({
        title: "Error",
        description: "Failed to delete accident.",
        variant: "destructive",
      })
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(accident.id)
        return next
      })
    }
  }

  // ✅ Cleanup Invalid Accidents
  const handleCleanup = async () => {
    setIsCleaningUp(true)
    try {
      const result = await cleanupInvalidAccidents()
      toast({
        title: "🧹 Cleanup complete",
        description: `Deleted ${result.deleted} invalid accidents, kept ${result.kept} valid ones.`,
      })
    } catch (error) {
      console.error("[v0] Error during cleanup:", error)
      toast({
        title: "Error",
        description: "Failed to cleanup invalid accidents.",
        variant: "destructive",
      })
    } finally {
      setIsCleaningUp(false)
    }
  }

  // ✅ Table Component
  const AccidentTable = ({ accidentsList }: { accidentsList: FirebaseAccident[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-semibold">Incident</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Reporter</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {accidentsList.map((accident) => (
            <tr
              key={accident.id}
              className="border-b hover:bg-muted/50 cursor-pointer transition-colors group"
              onClick={() => handleViewAccident(accident)}
            >
              <AccidentCard accident={accident} onClick={() => handleViewAccident(accident)} />
              <td className="px-4 py-3 text-right">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(accident)
                  }}
                  disabled={deletingIds.has(accident.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ✅ UI Render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accident Notifications</h2>
          <p className="text-muted-foreground">Monitor and respond to detected accidents in real time.</p>
        </div>
        <Button variant="outline" onClick={handleCleanup} disabled={isCleaningUp}>
          <Eraser className="mr-2 h-4 w-4" />
          {isCleaningUp ? "Cleaning..." : "Cleanup Invalid"}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All
            {allAccidents.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {allAccidents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {pendingAccidents.length > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-white">
                {pendingAccidents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="dispatched">
            Dispatched
            {dispatchedAccidents.length > 0 && (
              <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                {dispatchedAccidents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved
            {resolvedAccidents.length > 0 && (
              <span className="ml-2 rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">
                {resolvedAccidents.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {allAccidents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No accidents recorded yet.</p>
            </div>
          ) : (
            <AccidentTable accidentsList={allAccidents} />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {pendingAccidents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No pending accidents.</p>
            </div>
          ) : (
            <AccidentTable accidentsList={pendingAccidents} />
          )}
        </TabsContent>

        <TabsContent value="dispatched" className="mt-6">
          {dispatchedAccidents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No dispatched accidents.</p>
            </div>
          ) : (
            <AccidentTable accidentsList={dispatchedAccidents} />
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          {resolvedAccidents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No resolved accidents.</p>
            </div>
          ) : (
            <AccidentTable accidentsList={resolvedAccidents} />
          )}
        </TabsContent>
      </Tabs>

      {selectedAccident && (
        <AccidentDetails accident={selectedAccident} onClose={() => setSelectedAccident(null)} />
      )}
    </div>
  )
}
