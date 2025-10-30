"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, Eye, Mail, Phone, MapPin, AlertCircle, ExternalLink } from "lucide-react"
import { getAllFirestoreUsers } from "@/lib/firebase-service"

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      console.log("[v0] Fetching all Firestore users")
      try {
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

    fetchData()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading users from Firestore...</p>
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
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2 bg-transparent">
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
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)} title="View details">
                          <Eye className="h-4 w-4" />
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
