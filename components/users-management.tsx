"use client"

import { useState, useEffect } from "react"
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, getIdTokenResult } from "firebase/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Search, Download, Eye, Mail, Phone, MapPin, AlertCircle, ExternalLink, Edit3, Trash2, Plus } from "lucide-react"
import { getAllFirestoreUsers, createFirestoreUser, updateFirestoreUser, deleteFirestoreUser } from "@/lib/firebase-service"

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
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [formData, setFormData] = useState<Omit<UserData, "id" | "uid" | "createdAt" | "emailVerified">>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    emergencyName: "",
    emergencyNumber: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [authUser, setAuthUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [isAdminClaim, setIsAdminClaim] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("[v0] Fetching all Firestore users")
      const fetchedUsers = await getAllFirestoreUsers()
      console.log("[v0] Received users from Firestore:", fetchedUsers.length)

      if (fetchedUsers.length === 0) {
        setError(
          "No users found. Please check: 1) Firestore 'user' collection has documents, 2) Security rules allow reading (update in Firebase Console), or 3) Users exist in Realtime Database under 'users' path",
        )
      }

      setUsers(fetchedUsers)
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      setError("Failed to fetch users. Check browser console for details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user)
      setAuthLoading(false)
      if (user) {
        fetchUsers()
      } else {
        setUsers([])
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phoneNumber.includes(searchQuery) ||
      user.address.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

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
      const auth = getAuth()
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
        const createdUser = await createFirestoreUser({
          ...formData,
        })
        setUsers((prev) => [
          ...prev,
          {
            id: createdUser.id,
            uid: createdUser.uid || createdUser.id,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            email: createdUser.email,
            phoneNumber: createdUser.phoneNumber,
            address: createdUser.address,
            emergencyName: createdUser.emergencyName,
            emergencyNumber: createdUser.emergencyNumber,
            createdAt: createdUser.createdAt,
            emailVerified: createdUser.emailVerified,
          },
        ])
      } else if (formMode === "edit" && selectedUser) {
        await updateFirestoreUser(selectedUser.id, {
          ...formData,
        })
        setUsers((prev) =>
          prev.map((user) =>
            user.id === selectedUser.id
              ? {
                  ...user,
                  ...formData,
                }
              : user,
          ),
        )
      }

      closeForm()
    } catch (operationError) {
      console.error("[v0] Firestore CRUD operation error:", operationError)
      setError("Unable to save user. Please check console and Firebase rules.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return

    setIsProcessing(true)
    try {
      await deleteFirestoreUser(userId)
      setUsers((prev) => prev.filter((user) => user.id !== userId))
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
      }
    } catch (deleteError) {
      console.error("[v0] Delete user failed:", deleteError)
      setError("Failed to delete user. Verify Firestore write rules and try again.")
    } finally {
      setIsProcessing(false)
    }
  }

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

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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

      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Registered Users</h2>
          <p className="text-muted-foreground">View all registered users from your Firestore database</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="w-fit">
            {filteredUsers.length} / {users.length} Users
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

      {/* User Create/Edit Modal Dialog */}
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

      {/* Empty State or Users Table continues below... */}

      {/* Empty State */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "No registered users in the database"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Registered Users</CardTitle>
            <CardDescription>Complete list of users from your Firestore database</CardDescription>
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
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
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
                      <td className="py-3 px-4 flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(user)} title="Edit user">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
