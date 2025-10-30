"use client"

import { useState, useEffect } from "react"
import type { FirebaseAccident } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  CheckCircle,
  XCircle,
  Heart,
  FileText,
} from "lucide-react"
import { getAccidentStatusColor, getSeverityColor, formatFullTimestamp } from "@/lib/utils/accident-utils"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { dispatchPersonnel, updateAccidentStatus, listenToPersonnel } from "@/lib/firebase-service"
import { PoliceReportModal } from "@/components/police-report-modal"
import { ref, update } from "firebase/database"
import { database, firestore } from "@/lib/firebase-config"
import { doc, getDoc } from "firebase/firestore"
import { toast } from "react-toastify"

interface AccidentDetailsProps {
  accident: FirebaseAccident
  onClose: () => void
}

export function AccidentDetails({ accident, onClose }: AccidentDetailsProps) {
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [notes, setNotes] = useState(accident.notes || "")
  const [isDispatching, setIsDispatching] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [personnel, setPersonnel] = useState<any[]>([])
  const [showPoliceReport, setShowPoliceReport] = useState(false)
  const [policeReport, setPoliceReport] = useState(accident.policeReport || "")
  const [userData, setUserData] = useState<any>(accident.user || null)
  const [isLoadingUser, setIsLoadingUser] = useState(false)

  const getDispatchedOfficerName = () => {
    if (accident.dispatchedPersonnel && accident.dispatchedPersonnel.length > 0) {
      const firstOfficerId = accident.dispatchedPersonnel[0]
      const officer = personnel.find((p) => p.id === firstOfficerId)
      return officer?.name || firstOfficerId
    }
    return undefined
  }

  // ✅ Fetch Firestore user data for accurate information
  useEffect(() => {
    const fetchUserData = async () => {
      if (!accident.userId) return
      setIsLoadingUser(true)
      try {
        const userRef = doc(firestore, "users", accident.userId)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setUserData(userSnap.data())
        } else {
          console.warn("No user found for ID:", accident.userId)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setIsLoadingUser(false)
      }
    }
    fetchUserData()
  }, [accident.userId])

  useEffect(() => {
    const unsubscribe = listenToPersonnel((fetchedPersonnel) => setPersonnel(fetchedPersonnel))
    return () => unsubscribe()
  }, [])

  const availablePersonnel = personnel.filter((p) => p.status === "available")

  // ✅ Dispatch Logic
  const handleDispatch = async () => {
    setIsDispatching(true)
    try {
      await dispatchPersonnel(accident.id, selectedPersonnel)
      toast.success(`Successfully dispatched ${selectedPersonnel.length} personnel to accident ${accident.id}`)
      onClose()
    } catch (error) {
      console.error("[v0] Error dispatching personnel:", error)
      toast.error("Failed to dispatch personnel. Please try again.")
    } finally {
      setIsDispatching(false)
    }
  }

  const handleMarkAsResolved = async () => {
    setIsUpdatingStatus(true)
    try {
      await updateAccidentStatus(accident.id, "resolved")
      toast.success(`Accident ${accident.id} has been marked as resolved.`)
      onClose()
    } catch (error) {
      console.error("[v0] Error marking accident as resolved:", error)
      toast.error("Failed to mark accident as resolved. Please try again.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleMarkAsFalseAlarm = async () => {
    setIsUpdatingStatus(true)
    try {
      await updateAccidentStatus(accident.id, "false-alarm")
      toast.success(`Accident ${accident.id} has been marked as false alarm.`)
      onClose()
    } catch (error) {
      console.error("[v0] Error marking accident as false alarm:", error)
      toast.error("Failed to mark accident as false alarm. Please try again.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePoliceReportFinish = async (reportText: string) => {
    setPoliceReport(reportText)
    try {
      const accidentRef = ref(database, `accidents/${accident.id}`)
      await update(accidentRef, { policeReport: reportText, policeReportDate: Date.now() })
      toast.success("Police report saved successfully.")
    } catch (error) {
      console.error("[v0] Error saving police report:", error)
      toast.error("Failed to save police report.")
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">Accident Details</DialogTitle>
                <DialogDescription className="text-sm text-gray-600">ID: {accident.id}</DialogDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={cn("text-xs capitalize", getSeverityColor(accident.severity))}>
                  {accident.severity}
                </Badge>
                <Badge className={cn("text-xs capitalize", getAccidentStatusColor(accident.status))}>
                  {accident.status}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8 mt-4 text-gray-800">
            {/* 🚨 Alert Banner */}
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg p-4 border",
                accident.severity === "critical" || accident.severity === "high"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-5 w-5",
                  accident.severity === "critical" || accident.severity === "high"
                    ? "text-red-600"
                    : "text-yellow-600"
                )}
              />
              <div>
                <p className="font-semibold text-sm">
                  {accident.severity === "critical" ? "Critical Emergency" : "Accident Detected"}
                </p>
                <p className="text-xs text-gray-600">User confirmed they need assistance</p>
              </div>
            </div>

            {/* 👤 User Information (now from Firestore) */}
            <section>
              <h3 className="font-semibold flex items-center gap-2 text-lg mb-3">
                <User className="h-4 w-4 text-gray-600" /> User Information
              </h3>
              <div className="grid gap-3 rounded-lg border p-4 bg-white">
                {isLoadingUser ? (
                  <p className="text-sm text-gray-500">Fetching user info...</p>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>User ID</span>
                      <span>{accident.userId}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>Name</span>
                      <span>{userData?.name || "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>Phone</span>
                      <span>{userData?.phone || "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>Email</span>
                      <span>{userData?.email || "—"}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ❤️ Medical Information */}
            {(userData?.bloodType || userData?.allergies?.length || userData?.medicalInfo) && (
              <section>
                <h3 className="font-semibold flex items-center gap-2 text-lg mb-3">
                  <Heart className="h-4 w-4 text-gray-600" /> Medical Information
                </h3>
                <div className="grid gap-3 rounded-lg border p-4 bg-red-50">
                  {userData?.bloodType && (
                    <div className="flex justify-between text-sm">
                      <span>Blood Type</span>
                      <Badge variant="destructive">{userData.bloodType}</Badge>
                    </div>
                  )}
                  {userData?.allergies?.length > 0 && (
                    <div className="text-sm">
                      <span>Allergies</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {userData.allergies.map((a: string, i: number) => (
                          <Badge key={i} variant="outline">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {userData?.medicalInfo && (
                    <div className="text-sm">
                      <span>Additional Medical Info:</span>
                      <p className="mt-1 text-gray-700">{userData.medicalInfo}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 📍 Location */}
            <section>
              <h3 className="font-semibold flex items-center gap-2 text-lg mb-3">
                <MapPin className="h-4 w-4 text-gray-600" /> Location
              </h3>
              <div className="rounded-lg border p-4 bg-white text-sm space-y-2">
                <p>{accident.location.address}</p>
                <p className="text-gray-600">
                  Coordinates: {accident.location.latitude}, {accident.location.longitude}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() =>
                    window.open(`https://www.google.com/maps?q=${accident.location.latitude},${accident.location.longitude}`, "_blank")
                  }
                >
                  View on Map
                </Button>
              </div>
            </section>

            {/* ⏰ Time */}
            <section>
              <h3 className="font-semibold flex items-center gap-2 text-lg mb-3">
                <Clock className="h-4 w-4 text-gray-600" /> Time Information
              </h3>
              <div className="rounded-lg border p-4 bg-white text-sm space-y-2">
                <div className="flex justify-between"><span>Detected</span><span>{formatFullTimestamp(accident.timestamp)}</span></div>
                <Separator />
                <div className="flex justify-between"><span>Detection Count</span><Badge variant="outline">{accident.detectionCount}</Badge></div>
              </div>
            </section>

            {/* 🚑 Dispatch & Resolution */}
            {accident.status === "pending" && (
              <section>
                <h3 className="font-semibold flex items-center gap-2 text-lg mb-3">
                  <Users className="h-4 w-4 text-gray-600" /> Dispatch Personnel
                </h3>
                <div className="rounded-lg border p-4 bg-white space-y-3">
                  <Select onValueChange={(v) => setSelectedPersonnel([...selectedPersonnel, v])}>
                    <SelectTrigger><SelectValue placeholder="Select personnel to dispatch" /></SelectTrigger>
                    <SelectContent>
                      {availablePersonnel.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} - {p.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedPersonnel.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPersonnel.map((id) => {
                        const person = personnel.find((p) => p.id === id)
                        return <Badge key={id} variant="secondary">{person?.name}</Badge>
                      })}
                    </div>
                  )}

                  <Textarea
                    placeholder="Add additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />

                  <Button
                    onClick={handleDispatch}
                    disabled={!selectedPersonnel.length || isDispatching}
                    className="w-full"
                  >
                    {isDispatching ? "Dispatching..." : `Dispatch ${selectedPersonnel.length} Personnel`}
                  </Button>
                  <Button
                    onClick={handleMarkAsFalseAlarm}
                    disabled={isUpdatingStatus}
                    variant="outline"
                    className="w-full"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> {isUpdatingStatus ? "Updating..." : "Mark as False Alarm"}
                  </Button>
                </div>
              </section>
            )}

            {accident.status === "dispatched" && (
              <section>
                <h3 className="font-semibold flex items-center gap-2 text-lg mb-3">
                  <FileText className="h-4 w-4 text-gray-600" /> Complete Response
                </h3>
                <div className="rounded-lg border p-4 bg-white space-y-3">
                  {!policeReport && (
                    <Button variant="outline" onClick={() => setShowPoliceReport(true)} className="w-full">
                      <FileText className="h-4 w-4 mr-2" /> Add Police Report
                    </Button>
                  )}
                  {policeReport && (
                    <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                      <CheckCircle className="text-green-600 inline-block mr-2" /> Police Report Completed
                      <Button variant="ghost" size="sm" onClick={() => setShowPoliceReport(true)}>Edit Report</Button>
                    </div>
                  )}
                  <Button
                    onClick={handleMarkAsResolved}
                    disabled={isUpdatingStatus || !policeReport}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> {isUpdatingStatus ? "Updating..." : "Mark as Resolved"}
                  </Button>
                </div>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PoliceReportModal
        open={showPoliceReport}
        onClose={() => setShowPoliceReport(false)}
        accidentId={accident.id}
        onFinish={handlePoliceReportFinish}
        officerName={getDispatchedOfficerName()}
      />
    </>
  )
}
