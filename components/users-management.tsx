"use client"

import { useEffect, useRef, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Search,
  Download,
  MapPin,
  Phone,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { db, auth } from "@/lib/firebase"
import { collection, onSnapshot, doc, getDoc,setDoc,updateDoc, deleteDoc } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

interface UserData {
  id: string
  uid: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address: string
  emergencyName: string
  emergencyNumber: string
  createdAt: string
  emailVerified: boolean
  status?: string
  isAdmin?: boolean
  vehicleCrUrl?: string
  vehicleOrUrl?: string
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Lightbox state (single source of truth for preview)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Zoom & drag state for lightbox (images)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending")
  const { toast } = useToast()

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserData))
        setUsers(usersData)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError("Failed to fetch users. Check console.")
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const [actionLoading, setActionLoading] = useState(false);

        async function handleApprove(userId: string) {
      if (actionLoading) return;
      setActionLoading(true);

      try {
        if (!userId) throw new Error("Missing user ID");

        // --- Check admin from Firestore ---
        const currentUserRef = doc(db, "users", auth.currentUser!.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.data();

        if (!currentUserData?.isAdmin) {
          alert("You don’t have permission to approve users.");
          setActionLoading(false);
          return;
        }

        // Move user from pending_users → approved_users
        const pendingRef = doc(db, "pending_users", userId);
        const approvedRef = doc(db, "approved_users", userId);
        const pendingSnap = await getDoc(pendingRef);

        if (!pendingSnap.exists()) {
          alert("User not found in pending list.");
          setActionLoading(false);
          return;
        }

        const userData = pendingSnap.data();
        await setDoc(approvedRef, {
          ...userData,
          status: "approved",
          approvedAt: new Date().toISOString(),
        });

        await deleteDoc(pendingRef);

        alert("✅ User approved successfully!");
        setSelectedUser(null);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error("Error approving user:", err);
        alert("❌ Failed to approve user. Check console for details.");
      } finally {
        setActionLoading(false);
      }
    }

    async function handleReject(userId: string) {
      if (actionLoading) return;
      if (!confirm("Are you sure you want to reject this user?")) return;
      setActionLoading(true);

      try {
        // --- Check admin from Firestore ---
        const currentUserRef = doc(db, "users", auth.currentUser!.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.data();

        if (!currentUserData?.isAdmin) {
          alert("You don’t have permission to reject users.");
          setActionLoading(false);
          return;
        }

        // Delete from pending_users
        const pendingRef = doc(db, "pending_users", userId);
        await deleteDoc(pendingRef);

        alert("❌ User rejected and removed from pending list.");
        setSelectedUser(null);
        setIsModalOpen(false);
      } catch (err: any) {
        console.error("Error rejecting user:", err);
        alert("Failed to reject user. Check console for details.");
      } finally {
        setActionLoading(false);
      }
    }


  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase()
    return (
      (user.firstName?.toLowerCase() || "").includes(q) ||
      (user.lastName?.toLowerCase() || "").includes(q) ||
      (user.email?.toLowerCase() || "").includes(q) ||
      (user.phoneNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.address?.toLowerCase() || "").includes(q)
    )
  })

  const approvedUsers = filteredUsers.filter((u) => u.status === "approved" && !u.isAdmin)
  const pendingUsers = filteredUsers.filter((u) => (!u.status || u.status === "pending") && !u.isAdmin)

  const handleExportCSV = () => {
    const headers = ["No.", "First Name", "Last Name", "Email", "Address", "Emergency Name", "Emergency Number"]
    const rows = filteredUsers.map((user, index) => [
      index + 1,
      user.firstName,
      user.lastName,
      user.email,
      user.address,
      user.emergencyName,
      user.emergencyNumber,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Lightbox helpers
  useEffect(() => {
    // close on Escape
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false)
        setLightboxUrl(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // wheel zoom handler
  const onWheelZoom = (e: React.WheelEvent) => {
    if (!isLightboxOpen) return
    e.preventDefault()
    // adjust zoom, clamp between 0.5 and 4
    setZoom((z) => {
      const next = Math.max(0.5, Math.min(z + -e.deltaY * 0.0015, 4))
      return next
    })
  }

  // pointer drag handlers (for image drift inside container)
  const onPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    setIsDragging(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setOffset({ x: dx, y: dy })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    dragStartRef.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Approve or review all registered users.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="w-fit">
            {filteredUsers.length} / {users.length} Users
          </Badge>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "approved")} className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Pending Users</TabsTrigger>
          <TabsTrigger value="approved">Approved Users</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <UserTable
            users={pendingUsers}
            type="pending"
            onView={(user) => {
              setSelectedUser(user)
              setIsModalOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="approved">
          <UserTable users={approvedUsers} type="approved" />
        </TabsContent>
      </Tabs>

      {/* Main Modal */}
      {selectedUser && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-full max-w-md max-h-[80vh] rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-900 dark:text-gray-100 flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold mb-4">User Details</DialogTitle>
              <DialogDescription id="dialog-desc">View and manage user details</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {selectedUser.firstName} {selectedUser.lastName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                <span className="text-gray-800 dark:text-gray-200">{selectedUser.email}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Phone:</span>
                <span className="text-gray-800 dark:text-gray-200">{selectedUser.phoneNumber}</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Address:</span>
                <span className="text-gray-800 dark:text-gray-200">{selectedUser.address}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Emergency Contact:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {selectedUser.emergencyName} ({selectedUser.emergencyNumber})
                </span>
              </div>

              {/* Vehicle CR */}
              <div className="flex flex-col gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Vehicle CR:</span>
                {selectedUser.vehicleCrUrl ? (
                  <button
                    onClick={() => {
                      if (selectedUser.vehicleCrUrl) {
                        setLightboxUrl(selectedUser.vehicleCrUrl)
                        setIsLightboxOpen(true)
                        // reset view
                        setZoom(1)
                        setOffset({ x: 0, y: 0 })
                      }
                    }}
                    className="text-blue-500 hover:underline"
                  >
                    View CR
                  </button>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">N/A</span>
                )}
              </div>

              {/* Vehicle OR */}
              <div className="flex flex-col gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Vehicle OR:</span>
                {selectedUser.vehicleOrUrl ? (
                  <button
                    onClick={() => {
                      if (selectedUser.vehicleOrUrl) {
                        setLightboxUrl(selectedUser.vehicleOrUrl)
                        setIsLightboxOpen(true)
                        setZoom(1)
                        setOffset({ x: 0, y: 0 })
                      }
                    }}
                    className="text-blue-500 hover:underline"
                  >
                    View OR
                  </button>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">N/A</span>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4 flex justify-end gap-3">
              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  // guard check
                  if (selectedUser) handleReject(selectedUser.id)
                }}
              >
                Reject
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => {
                  if (selectedUser) handleApprove(selectedUser.id)
                }}
              >
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox Dialog (accessible) - zoomable + draggable for images */}
      {isLightboxOpen && lightboxUrl && (
        <Dialog open={isLightboxOpen} onOpenChange={(open) => { if (!open) { setIsLightboxOpen(false); setLightboxUrl(null) } }}>
          <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-hidden p-4 bg-background rounded-xl shadow-lg">
            {/* hidden title for screen readers */}
            <DialogHeader>
              <DialogTitle className="sr-only">Document Lightbox Preview</DialogTitle>
            </DialogHeader>

            <div
              ref={containerRef}
              onWheel={onWheelZoom}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="flex-1 overflow-auto bg-gray-900/5 dark:bg-gray-800 rounded-md relative flex items-center justify-center"
              style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
              aria-label="Document preview area"
            >
              {/* If PDF - show iframe (browser will handle scroll/zoom). If image - show image element with transform */}
              {lightboxUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={lightboxUrl}
                  title="PDF Preview"
                  className="w-full h-[85vh] rounded-md bg-white"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={lightboxUrl}
                  alt="Document preview"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transition: isDragging ? "none" : "transform 0.12s ease-out",
                    maxWidth: "98%",
                    maxHeight: "85vh",
                  }}
                  className="select-none"
                  onClick={(e) => e.stopPropagation()}
                  draggable={false}
                />
              )}
            </div>

            <DialogFooter className="mt-3 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsLightboxOpen(false)
                  setLightboxUrl(null)
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ---------------- UserTable component (unchanged layout) ----------------

function UserTable({
  users,
  type,
  onView,
}: {
  users: UserData[]
  type: "pending" | "approved"
  onView?: (user: UserData) => void
}) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12 text-muted-foreground">
          No {type} users found.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === "pending" ? "Pending Approvals" : "Approved Users"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {users.map((user, index) => (
          <div
            key={user.id}
            className="border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
          >
            {/* Header with Avatar */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {/* Avatar with initials */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-semibold">
                  {user.firstName?.[0] || ""}{user.lastName?.[0] || ""}
                </div>

                <div>
                  <p className="font-semibold text-lg">
                    {index + 1}. {user.firstName} {user.lastName}
                  </p>
                  <p className={`text-sm font-medium ${user.emailVerified ? "text-green-500" : "text-red-500"}`}>
                    {user.emailVerified ? "Verified" : "Not Verified"}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Action button for pending users */}
              {type === "pending" && (
                <Button size="sm" variant="outline" onClick={() => onView?.(user)}>
                  View
                </Button>
              )}
            </div>

            {/* Details Grid */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phoneNumber}</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{user.address}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium">Emergency Contact:</span>
                <span>{user.emergencyName} ({user.emergencyNumber})</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium">Vehicle CR:</span>
                {user.vehicleCrUrl ? (
                  <a
                    href={user.vehicleCrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View CR
                  </a>
                ) : (
                  <span>N/A</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium">Vehicle OR:</span>
                {user.vehicleOrUrl ? (
                  <a
                    href={user.vehicleOrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View OR
                  </a>
                ) : (
                  <span>N/A</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
