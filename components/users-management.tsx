"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signInAnonymously, getIdTokenResult } from "firebase/auth"
import { auth } from "@/lib/firebase-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Download, Eye, Mail, Phone, MapPin, AlertCircle, ExternalLink, Edit3, Trash2, Plus } from "lucide-react"
import {
  getAllFirestoreUsers,
  createFirestoreUser,
  updateFirestoreUser,
  deleteFirestoreUser,
} from "@/lib/firebase-service"

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
  status: "pending" | "approved"
  vehicleOrUrl: string
  vehicleCrUrl: string
  isAdmin?: boolean
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [formData, setFormData] = useState<
    Omit<UserData, "id" | "uid" | "createdAt" | "emailVerified" | "status" | "isAdmin">
  >({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    emergencyName: "",
    emergencyNumber: "",
    vehicleOrUrl: "",
    vehicleCrUrl: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [authUser, setAuthUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdminClaim, setIsAdminClaim] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Fetching users from Firestore 'users' collection")
      const fetchedUsers = await getAllFirestoreUsers()

      const normalizedUsers: UserData[] = fetchedUsers
        .filter((user: any) => user.isAdmin !== true)
        .map((user: any) => ({
          id: user.id,
          uid: user.uid || user.id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "N/A",
          phoneNumber: user.phoneNumber || "N/A",
          address: user.address || "N/A",
          emergencyName: user.emergencyName || "N/A",
          emergencyNumber: user.emergencyNumber || "N/A",
          createdAt: user.createdAt || new Date().toISOString(),
          emailVerified: user.emailVerified || false,
          status: user.status === "approved" ? "approved" : "pending",
          vehicleOrUrl: user.vehicleOrUrl || "",
          vehicleCrUrl: user.vehicleCrUrl || "",
          isAdmin: user.isAdmin || false,
        }))

      setUsers(normalizedUsers)

      if (normalizedUsers.length === 0) {
        setError("No non-admin users found in the Firestore 'users' collection.")
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      setError("Failed to fetch users. Check browser console for details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user)

      if (!user) {
        setUsers([])
        setLoading(false)
        setAuthLoading(false)
        setError("You must be signed in as an admin to view users.")
        return
      }

      try {
        const idTokenResult = await getIdTokenResult(user)
        console.log("[v0] Signed in UID:", user.uid)
        console.log("[v0] Token claims:", idTokenResult.claims)

        const { doc, getDoc } = await import("firebase/firestore")
        const { firestore } = await import("@/lib/firebase-config")

        const userRef = doc(firestore, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
          setUsers([])
          setLoading(false)
          setAuthLoading(false)
          setError("Your Firestore user record was not found.")
          return
        }

        const userData = userSnap.data()
        const isAdmin = userData?.isAdmin === true

        console.log("[v0] Firestore user data:", userData)

        if (!isAdmin) {
          setUsers([])
          setLoading(false)
          setAuthLoading(false)
          setError("Access denied. Admin only.")
          return
        }

        setIsAdminClaim(true)
        await fetchUsers()
      } catch (error) {
        console.error("[v0] Failed admin check:", error)
        setUsers([])
        setLoading(false)
        setError("Failed to verify admin access.")
      } finally {
        setAuthLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const filterUsers = (list: UserData[]) => {
    return list.filter((user) => {
      return (
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phoneNumber.includes(searchQuery) ||
        user.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }

  const pendingUsers = users.filter((user) => user.status === "pending")
  const approvedUsers = users.filter((user) => user.status === "approved")

  const filteredPendingUsers = filterUsers(pendingUsers)
  const filteredApprovedUsers = filterUsers(approvedUsers)
  const filteredAllUsers = filterUsers(users)

  const openCreateForm = () => {
    setFormMode("create")
    setSelectedUser(null)
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: "",
      emergencyName: "",
      emergencyNumber: "",
      vehicleOrUrl: "",
      vehicleCrUrl: "",
    })
  }

  const openEditForm = (user: UserData) => {
    setFormMode("edit")
    setSelectedUser(user)
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      emergencyName: user.emergencyName,
      emergencyNumber: user.emergencyNumber,
      vehicleOrUrl: user.vehicleOrUrl,
      vehicleCrUrl: user.vehicleCrUrl,
    })
  }

  const closeForm = () => {
    setFormMode(null)
    setSelectedUser(null)
  }

  const handleSignInAnonymously = async () => {
    setError(null)
    try {
      setLoading(true)
      await signInAnonymously(auth)
    } catch (signInError) {
      console.error("[v0] Anonymous sign-in failed:", signInError)
      setError("Unable to sign in anonymously. Please check your Firebase auth settings.")
      setLoading(false)
    }
  }

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFormSubmit = async () => {
    if (!formMode) return

    setIsProcessing(true)
    try {
      if (formMode === "create") {
        await createFirestoreUser({
          ...formData,
          status: "pending",
        })
      } else if (formMode === "edit" && selectedUser) {
        await updateFirestoreUser(selectedUser.id, {
          ...formData,
        })
      }

      await fetchUsers()
      closeForm()
    } catch (operationError) {
      console.error("[v0] Firestore CRUD operation error:", operationError)
      setError("Unable to save user. Please check console and Firebase rules.")
    } finally {
      setIsProcessing(false)
    }
  }

        //reject user by deleting from Firestore and Firebase Auth, and send rejection email before deletion
        const handleRejectUser = async (user: UserData) => {
        if (!confirm(`Reject ${user.firstName} ${user.lastName}? This will remove their account completely.`)) return

        setIsProcessing(true)
        setError(null)

        try {
          const currentUser = auth.currentUser
          if (!currentUser) {
            throw new Error("No authenticated admin user found.")
          }

          const idToken = await currentUser.getIdToken()

          const response = await fetch("/admin/api/reject-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid: user.uid }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || "Failed to reject user")
          }

          await fetchUsers()

          if (selectedUser?.id === user.id) {
            setSelectedUser(null)
          }
        } catch (error: any) {
          console.error("[v0] Reject user failed:", error)
          setError(error.message || "Failed to reject user.")
        } finally {
          setIsProcessing(false)
        }
      }

      //delete user permanently from Firestore and Firebase Auth, and send rejection email before deletion
      const handleDeleteUser = async (user: UserData) => {
        if (!confirm(`Delete ${user.firstName} ${user.lastName}? This will permanently remove the account.`)) return

        setIsProcessing(true)
        setError(null)

        try {
          const currentUser = auth.currentUser
          if (!currentUser) {
            throw new Error("No authenticated admin user found.")
          }

          const idToken = await currentUser.getIdToken()

          const response = await fetch("/admin/api/delete-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid: user.uid }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || "Failed to delete user")
          }

          await fetchUsers()

          if (selectedUser?.id === user.id) {
            setSelectedUser(null)
          }
        } catch (error: any) {
          console.error("[v0] Delete user failed:", error)
          setError(error.message || "Failed to delete user.")
        } finally {
          setIsProcessing(false)
        }
      }

    const handleApproveUser = async (user: UserData) => {
  if (!confirm(`Approve ${user.firstName} ${user.lastName}?`)) return

  setIsProcessing(true)
  setError(null)

  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("No authenticated admin user found.")
    }

    const idToken = await currentUser.getIdToken()

    const response = await fetch("/admin/api/approve-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ uid: user.uid }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to approve user")
    }

    await fetchUsers()

    if (selectedUser?.id === user.id) {
      setSelectedUser({
        ...selectedUser,
        status: "approved",
      })
    }
  } catch (error: any) {
    console.error("[v0] Approve user failed:", error)
    setError(error.message || "Failed to approve user.")
  } finally {
    setIsProcessing(false)
  }
}
  const handleExportCSV = () => {
    const source =
      activeTab === "pending"
        ? filteredPendingUsers
        : activeTab === "approved"
          ? filteredApprovedUsers
          : filteredAllUsers

    const headers = [
      "No.",
      "First Name",
      "Last Name",
      "Email",
      "Address",
      "Emergency Name",
      "Emergency Number",
      "Status",
      "Vehicle OR",
      "Vehicle CR",
    ]

    const rows = source.map((user, index) => [
      index + 1,
      user.firstName,
      user.lastName,
      user.email,
      user.address,
      user.emergencyName,
      user.emergencyNumber,
      user.status,
      user.vehicleOrUrl,
      user.vehicleCrUrl,
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell ?? ""}"`).join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-export-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderStatusBadge = (status: "pending" | "approved") => {
    return status === "approved" ? (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        Pending
      </Badge>
    )
  }

  const renderTable = (list: UserData[], showStatus = false) => {
    if (list.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "No registered users in this section"}
            </p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "pending"
              ? "Pending Users"
              : activeTab === "approved"
                ? "Approved Users"
                : "All Registered Users"}
          </CardTitle>
          <CardDescription>
            {activeTab === "pending"
              ? "Users waiting for admin approval"
              : activeTab === "approved"
                ? "Users already approved"
                : "Complete list of all users with approval status"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold">No.</th>
                  <th className="text-left py-3 px-4 font-semibold">First Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Address</th>
                  <th className="text-left py-3 px-4 font-semibold">Emergency Contact</th>
                  {showStatus && <th className="text-left py-3 px-4 font-semibold">Status</th>}
                  <th className="text-left py-3 px-4 font-semibold">Vehicle OR</th>
                  <th className="text-left py-3 px-4 font-semibold">Vehicle CR</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((user, index) => (
                  <tr key={`${user.status}-${user.id}`} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-muted-foreground">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">{user.firstName}</td>
                    <td className="py-3 px-4">{user.lastName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate text-sm">{user.address}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{user.emergencyName}</p>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{user.emergencyNumber}</span>
                        </div>
                      </div>
                    </td>

                    {showStatus && <td className="py-3 px-4">{renderStatusBadge(user.status)}</td>}

                    <td className="py-3 px-4">
                      {user.vehicleOrUrl ? (
                        <a
                          href={user.vehicleOrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View OR
                        </a>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {user.vehicleCrUrl ? (
                        <a
                          href={user.vehicleCrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View CR
                        </a>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {user.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApproveUser(user)}
                            disabled={isProcessing}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectUser(user)}
                            disabled={isProcessing}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditForm(user)} title="Edit user">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading users from Firestore...</p>
        </div>
      </div>
    )
  }

  if (!authUser) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-warning" />
            <h3 className="text-xl font-semibold">Authentication required</h3>
            <p className="text-muted-foreground">
              You must sign in (anonymous auth or via your app sign-in flow) to view registered users.
            </p>
            <Button onClick={handleSignInAnonymously} disabled={isProcessing}>
              {isProcessing ? "Signing in..." : "Sign in anonymously"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAdminClaim) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-warning" />
            <h3 className="text-xl font-semibold">Admin access required</h3>
            <p className="text-muted-foreground">
              You must be signed in with an admin account to view registered users.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Setup Required</p>
                <p className="text-sm text-destructive/80 mt-2">{error}</p>
                <div className="mt-3 flex gap-2">
                  <a
                    href="https://console.firebase.google.com/project/accident-detection-4db90/firestore/rules"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline"
                  >
                    Go to Firebase Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Registered Users</h2>
          <p className="text-muted-foreground">View and manage pending, approved, and all users</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="w-fit">
            Pending: {filteredPendingUsers.length}
          </Badge>
          <Badge variant="secondary" className="w-fit">
            Approved: {filteredApprovedUsers.length}
          </Badge>
          <Badge variant="secondary" className="w-fit">
            All: {filteredAllUsers.length}
          </Badge>
          <Button onClick={openCreateForm} variant="secondary" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Dialog open={formMode !== null} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Create New User" : "Edit User"}</DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Fill in user details and save to Firestore."
                : "Update the selected user and save changes to Firestore."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 py-4">
            <Input
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => handleFormChange("firstName", e.target.value)}
            />
            <Input
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => handleFormChange("lastName", e.target.value)}
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
            />
            <Input
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
            />
            <Input
              placeholder="Address"
              value={formData.address}
              onChange={(e) => handleFormChange("address", e.target.value)}
            />
            <Input
              placeholder="Emergency Contact Name"
              value={formData.emergencyName}
              onChange={(e) => handleFormChange("emergencyName", e.target.value)}
            />
            <Input
              placeholder="Emergency Contact Number"
              value={formData.emergencyNumber}
              onChange={(e) => handleFormChange("emergencyNumber", e.target.value)}
            />
            <Input
              placeholder="Vehicle OR URL"
              value={formData.vehicleOrUrl}
              onChange={(e) => handleFormChange("vehicleOrUrl", e.target.value)}
            />
            <Input
              placeholder="Vehicle CR URL"
              value={formData.vehicleCrUrl}
              onChange={(e) => handleFormChange("vehicleCrUrl", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={isProcessing}>
              {isProcessing ? "Saving..." : formMode === "create" ? "Create User" : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Users</TabsTrigger>
          <TabsTrigger value="approved">Approved Users</TabsTrigger>
          <TabsTrigger value="all">All Users</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">{renderTable(filteredPendingUsers, false)}</TabsContent>
        <TabsContent value="approved">{renderTable(filteredApprovedUsers, false)}</TabsContent>
        <TabsContent value="all">{renderTable(filteredAllUsers, true)}</TabsContent>
      </Tabs>
    </div>
  )
}