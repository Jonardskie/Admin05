"use client"

import { mockPersonnel, mockAccidents } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, UserCheck, UserX, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function PersonnelView() {
  const availablePersonnel = mockPersonnel.filter((p) => p.status === "available")
  const onDutyPersonnel = mockPersonnel.filter((p) => p.status === "on-duty")
  const offDutyPersonnel = mockPersonnel.filter((p) => p.status === "off-duty")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
      case "on-duty":
        return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
      case "off-duty":
        return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Personnel Management</h2>
        <p className="text-muted-foreground">Monitor and manage emergency response personnel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availablePersonnel.length}</div>
            <p className="text-xs text-muted-foreground">Ready to respond</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Duty</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onDutyPersonnel.length}</div>
            <p className="text-xs text-muted-foreground">Currently assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Off Duty</CardTitle>
            <UserX className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offDutyPersonnel.length}</div>
            <p className="text-xs text-muted-foreground">Not available</p>
          </CardContent>
        </Card>
      </div>

      {/* Personnel List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Personnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockPersonnel.map((person) => {
              const assignment = person.currentAssignment
                ? mockAccidents.find((acc) => acc.id === person.currentAssignment)
                : null

              return (
                <div key={person.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-sm text-muted-foreground">{person.role}</p>
                      {assignment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned to: {assignment.user.name} ({assignment.id})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={cn("text-xs", getStatusColor(person.status))}>
                      {person.status.replace("-", " ")}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
