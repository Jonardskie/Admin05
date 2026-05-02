"use client"

import { useState, useEffect } from "react"
import type { FirebaseAccident } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Users,
  CheckCircle,
  XCircle,
  Heart,
  FileText,
} from "lucide-react"
import {
  getAccidentStatusColor,
  getSeverityColor,
  formatFullTimestamp,
} from "@/lib/utils/accident-utils"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  dispatchPersonnel,
  updateAccidentStatus,
  listenToPersonnel,
} from "@/lib/firebase-service"
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

  const reporterId = accident.userId || accident.user?.id || "—"

  const reporterName =
    accident.name ||
    accident.user?.name ||
    userData?.name ||
    `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
    "—"

  const reporterPhone =
    accident.phone ||
    accident.phoneNumber ||
    accident.user?.phone ||
    userData?.phone ||
    userData?.phoneNumber ||
    "—"

  const reporterEmail =
    accident.email || accident.user?.email || userData?.email || "—"

  const emergencyName =
    accident.emergencyName ||
    accident.user?.emergencyContact?.name ||
    userData?.emergencyName ||
    userData?.emergencyContact?.name ||
    "—"

  const emergencyNumber =
    accident.emergencyNumber ||
    accident.user?.emergencyContact?.phone ||
    userData?.emergencyNumber ||
    userData?.emergencyContact?.phone ||
    "—"

  const locationLat = accident.latitude ?? accident.location?.latitude ?? null
  const locationLng = accident.longitude ?? accident.location?.longitude ?? null

  const locationText =
    accident.location?.address ||
    accident.coordinates ||
    (locationLat !== null && locationLng !== null
      ? `${locationLat}, ${locationLng}`
      : "—")

  const getDispatchedOfficerName = () => {
    if (accident.dispatchedPersonnel && accident.dispatchedPersonnel.length > 0) {
      const firstOfficerId = accident.dispatchedPersonnel[0]
      const officer = personnel.find((p) => p.id === firstOfficerId)
      return officer?.name || firstOfficerId
    }
    return undefined
  }

  useEffect(() => {
    const fetchUserData = async () => {
      if (!accident.userId) return

      setIsLoadingUser(true)

      try {
        const userRef = doc(firestore, "users", accident.userId)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          setUserData(userSnap.data())
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
    const unsubscribe = listenToPersonnel((fetchedPersonnel) =>
      setPersonnel(fetchedPersonnel),
    )

    return () => unsubscribe()
  }, [])

  const availablePersonnel = personnel.filter((p) => p.status === "available")

  const handleDispatch = async () => {
    setIsDispatching(true)

    try {
      await dispatchPersonnel(accident.id, selectedPersonnel)
      toast.success(
        `Successfully dispatched ${selectedPersonnel.length} personnel to accident ${accident.id}`,
      )
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

      await update(accidentRef, {
        policeReport: reportText,
        policeReportDate: Date.now(),
      })

      toast.success("Police report saved successfully.")
    } catch (error) {
      console.error("[v0] Error saving police report:", error)
      toast.error("Failed to save police report.")
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Accident Details
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  ID: {accident.id}
                </DialogDescription>
              </div>

              <div className="flex gap-2">
                <Badge
                  className={cn(
                    "text-xs capitalize",
                    getSeverityColor(accident.severity),
                  )}
                >
                  {accident.severity || "low"}
                </Badge>

                <Badge
                  className={cn(
                    "text-xs capitalize",
                    getAccidentStatusColor(accident.status),
                  )}
                >
                  {accident.status}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-8 text-gray-800">
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4",
                accident.severity === "critical" || accident.severity === "high"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50",
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-5 w-5",
                  accident.severity === "critical" || accident.severity === "high"
                    ? "text-red-600"
                    : "text-yellow-600",
                )}
              />

              <div>
                <p className="text-sm font-semibold">
                  {accident.severity === "critical"
                    ? "Critical Emergency"
                    : "Accident Detected"}
                </p>
                <p className="text-xs text-gray-600">
                  User confirmed they need assistance
                </p>
              </div>
            </div>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <User className="h-4 w-4 text-gray-600" /> User Information
              </h3>

              <div className="grid gap-3 rounded-lg border bg-white p-4">
                {isLoadingUser ? (
                  <p className="text-sm text-gray-500">Fetching user info...</p>
                ) : (
                  <>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>User ID</span>
                      <span className="text-right">{reporterId}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between gap-4 text-sm">
                      <span>Name</span>
                      <span className="text-right">{reporterName}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between gap-4 text-sm">
                      <span>Phone</span>
                      <span className="text-right">{reporterPhone}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between gap-4 text-sm">
                      <span>Email</span>
                      <span className="text-right">{reporterEmail}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between gap-4 text-sm">
                      <span>Emergency Contact</span>
                      <span className="text-right">{emergencyName}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between gap-4 text-sm">
                      <span>Emergency Number</span>
                      <span className="text-right">{emergencyNumber}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {(userData?.bloodType ||
              userData?.allergies?.length ||
              userData?.medicalInfo) && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Heart className="h-4 w-4 text-gray-600" /> Medical Information
                </h3>

                <div className="grid gap-3 rounded-lg border bg-red-50 p-4">
                  {userData?.bloodType && (
                    <div className="flex justify-between text-sm">
                      <span>Blood Type</span>
                      <Badge variant="destructive">{userData.bloodType}</Badge>
                    </div>
                  )}

                  {userData?.allergies?.length > 0 && (
                    <div className="text-sm">
                      <span>Allergies</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {userData.allergies.map((allergy: string, index: number) => (
                          <Badge key={index} variant="outline">
                            {allergy}
                          </Badge>
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

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <MapPin className="h-4 w-4 text-gray-600" /> Location
              </h3>

              <div className="space-y-2 rounded-lg border bg-white p-4 text-sm">
                <p>{locationText}</p>

                <p className="text-gray-600">
                  Coordinates:{" "}
                  {locationLat !== null && locationLng !== null
                    ? `${locationLat}, ${locationLng}`
                    : accident.coordinates || "—"}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={locationLat === null || locationLng === null}
                  onClick={() => {
                    if (locationLat === null || locationLng === null) return

                    window.open(
                      `https://www.google.com/maps?q=${locationLat},${locationLng}`,
                      "_blank",
                    )
                  }}
                >
                  View on Map
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-4 w-4 text-gray-600" /> Time Information
              </h3>

              <div className="space-y-2 rounded-lg border bg-white p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span>Detected</span>
                  <span className="text-right">
                    {formatFullTimestamp(accident.timestamp)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span>Detection Count</span>
                  <Badge variant="outline">{accident.detectionCount || 1}</Badge>
                </div>
              </div>
            </section>

            {accident.status === "pending" && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-4 w-4 text-gray-600" /> Dispatch Personnel
                </h3>

                <div className="space-y-3 rounded-lg border bg-white p-4">
                  <Select
                    onValueChange={(value) =>
                      setSelectedPersonnel([...selectedPersonnel, value])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select personnel to dispatch" />
                    </SelectTrigger>

                    <SelectContent>
                      {availablePersonnel.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} - {person.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedPersonnel.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPersonnel.map((id) => {
                        const person = personnel.find((p) => p.id === id)
                        return (
                          <Badge key={id} variant="secondary">
                            {person?.name || id}
                          </Badge>
                        )
                      })}
                    </div>
                  )}

                  <Textarea
                    placeholder="Add additional notes..."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                  />

                  <Button
                    onClick={handleDispatch}
                    disabled={!selectedPersonnel.length || isDispatching}
                    className="w-full"
                  >
                    {isDispatching
                      ? "Dispatching..."
                      : `Dispatch ${selectedPersonnel.length} Personnel`}
                  </Button>

                  <Button
                    onClick={handleMarkAsFalseAlarm}
                    disabled={isUpdatingStatus}
                    variant="outline"
                    className="w-full"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {isUpdatingStatus ? "Updating..." : "Mark as False Alarm"}
                  </Button>
                </div>
              </section>
            )}

            {accident.status === "dispatched" && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-4 w-4 text-gray-600" /> Complete Response
                </h3>

                <div className="space-y-3 rounded-lg border bg-white p-4">
                  {!policeReport && (
                    <Button
                      variant="outline"
                      onClick={() => setShowPoliceReport(true)}
                      className="w-full"
                    >
                      <FileText className="mr-2 h-4 w-4" /> Add Police Report
                    </Button>
                  )}

                  {policeReport && (
                    <div className="rounded-lg border border-green-300 bg-green-50 p-3">
                      <CheckCircle className="mr-2 inline-block text-green-600" />
                      Police Report Completed
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPoliceReport(true)}
                      >
                        Edit Report
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={handleMarkAsResolved}
                    disabled={isUpdatingStatus || !policeReport}
                    className="w-full bg-green-600 text-white hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isUpdatingStatus ? "Updating..." : "Mark as Resolved"}
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