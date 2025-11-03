"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
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
  Eye,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { getAllFirestoreUsers } from "@/lib/firebase-service"
import { db } from "@/lib/firebase"
import { doc, updateDoc, deleteDoc } from "firebase/firestore"

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
  approvalStatus?: string
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getAllFirestoreUsers()
      setUsers(fetchedUsers)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to fetch users. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "users", id), { approvalStatus: "approved" })
    fetchUsers()
  }

  const handleReject = async (id: string) => {
    await deleteDoc(doc(db, "users", id))
    fetchUsers()
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phoneNumber.includes(searchQuery) ||
      user.address.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const approvedUsers = filteredUsers.filter(
    (u) => u.approvalStatus === "approved"
  )
  const pendingUsers = filteredUsers.filter(
    (u) => !u.approvalStatus || u.approvalStatus === "pending"
  )

  const handleExportCSV = () => {
    const headers = [
      "No.",
      "First Name",
      "Last Name",
      "Email",
      "Address",
      "Emergency Name",
      "Emergency Number",
    ]
    const rows = filteredUsers.map((user, index) => [
      index + 1,
      user.firstName,
      user.lastName,
      user.email,
      user.address,
      user.emergencyName,
      user.emergencyNumber,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-export-${new Date()
      .toISOString()
      .split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
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
                    href="https://console.firebase.google.com"
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
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Approve or review all registered users.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="w-fit">
            {filteredUsers.length} / {users.length} Users
          </Badge>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
          >
            <Download className="h-4 w-4" />
            Export CSV
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

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Pending Users</TabsTrigger>
          <TabsTrigger value="approved">Approved Users</TabsTrigger>
        </TabsList>

        {/* Pending Users */}
        <TabsContent value="pending">
          <UserTable
            users={pendingUsers}
            onApprove={handleApprove}
            onReject={handleReject}
            type="pending"
          />
        </TabsContent>

        {/* Approved Users */}
        <TabsContent value="approved">
          <UserTable users={approvedUsers} type="approved" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UserTable({
  users,
  type,
  onApprove,
  onReject,
}: {
  users: UserData[]
  type: "pending" | "approved"
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
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
        <CardTitle>
          {type === "pending" ? "Pending Approvals" : "Approved Users"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">No.</th>
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Address</th>
                <th className="text-left py-3 px-4 font-semibold">
                  Emergency Contact
                </th>
                {type === "pending" && (
                  <th className="text-left py-3 px-4 font-semibold text-center">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr
                  key={user.id}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">{index + 1}</td>
                  <td className="py-3 px-4">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="py-3 px-4 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {user.email}
                  </td>
                  <td className="py-3 px-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {user.address}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium">{user.emergencyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.emergencyNumber}
                    </p>
                  </td>
                  {type === "pending" && (
                    <td className="py-3 px-4 text-center space-x-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => onApprove?.(user.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject?.(user.id)}
                      >
                        Reject
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
