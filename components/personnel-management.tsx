"use client"

import { useState, useEffect } from "react"
import { listenToPersonnel, addPersonnel, updatePersonnel, deletePersonnel } from "@/lib/firebase-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Plus, Edit, Trash2, Phone, Mail, UserCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Personnel {
  id: string
  name: string
  role: string
  phone: string
  email: string
  status: "available" | "on-duty" | "off-duty"
  currentAssignment?: string
  createdAt?: number
  updatedAt?: number
}

const validatePhone = (phone: string): boolean => {
  if (!phone) return true // Optional field
  // Allow phone numbers with digits, spaces, dashes, parentheses, and + symbol
  const phoneRegex = /^[\d\s\-+$$$$]{7,}$/
  return phoneRegex.test(phone.replace(/\s/g, ""))
}

const validateEmail = (email: string): boolean => {
  if (!email) return true // Optional field
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateDate = (date: string): boolean => {
  if (!date) return true // Optional field
  // Check if it's a valid date format (YYYY-MM-DD or MM/DD/YYYY)
  const dateRegex = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/
  if (!dateRegex.test(date)) return false

  const parsedDate = new Date(date)
  return !isNaN(parsedDate.getTime())
}

export function PersonnelManagement() {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    status: "available" as "available" | "on-duty" | "off-duty",
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  useEffect(() => {
    console.log("[v0] Setting up personnel listener")
    const unsubscribe = listenToPersonnel((fetchedPersonnel) => {
      console.log("[v0] Received personnel:", fetchedPersonnel.length)
      setPersonnel(fetchedPersonnel)
      setLoading(false)
    })

    return () => {
      console.log("[v0] Cleaning up personnel listener")
      unsubscribe()
    }
  }, [])

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      phone: "",
      email: "",
      status: "available",
    })
    setValidationErrors({})
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name) {
      errors.name = "Name is required"
    }

    if (!formData.role) {
      errors.role = "Role is required"
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      errors.phone = "Please enter a valid phone number (at least 7 digits)"
    }

    if (formData.email && !validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      })
      return
    }

    try {
      await addPersonnel(formData)
      toast({
        title: "Personnel Added",
        description: `${formData.name} has been added successfully`,
      })
      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("[v0] Error adding personnel:", error)
      toast({
        title: "Error",
        description: "Failed to add personnel. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (person: Personnel) => {
    setEditingPersonnel(person)
    setFormData({
      name: person.name,
      role: person.role,
      phone: person.phone,
      email: person.email,
      status: person.status,
    })
    setValidationErrors({})
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingPersonnel) return

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      })
      return
    }

    try {
      await updatePersonnel(editingPersonnel.id, formData)
      toast({
        title: "Personnel Updated",
        description: `${formData.name} has been updated successfully`,
      })
      setIsEditDialogOpen(false)
      setEditingPersonnel(null)
      resetForm()
    } catch (error) {
      console.error("[v0] Error updating personnel:", error)
      toast({
        title: "Error",
        description: "Failed to update personnel. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (person: Personnel) => {
    if (!confirm(`Are you sure you want to delete ${person.name}?`)) return

    try {
      await deletePersonnel(person.id)
      toast({
        title: "Personnel Deleted",
        description: `${person.name} has been removed`,
      })
    } catch (error) {
      console.error("[v0] Error deleting personnel:", error)
      toast({
        title: "Error",
        description: "Failed to delete personnel. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500 hover:bg-green-600"
      case "on-duty":
        return "bg-blue-500 hover:bg-blue-600"
      case "off-duty":
        return "bg-gray-500 hover:bg-gray-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Available"
      case "on-duty":
        return "On Duty"
      case "off-duty":
        return "Off Duty"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading personnel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personnel Management</h1>
          <p className="text-muted-foreground">Manage emergency response personnel</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Personnel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personnel.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No Personnel Added</p>
              <p className="text-sm text-muted-foreground mb-4">Get started by adding your first personnel member</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Personnel
              </Button>
            </CardContent>
          </Card>
        ) : (
          personnel.map((person) => (
            <Card key={person.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{person.name}</CardTitle>
                      <CardDescription>{person.role}</CardDescription>
                    </div>
                  </div>
                  <Badge className={cn("text-xs", getStatusColor(person.status))}>
                    {getStatusLabel(person.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {person.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{person.phone}</span>
                    </div>
                  )}
                  {person.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{person.email}</span>
                    </div>
                  )}
                  {person.currentAssignment && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Assignment: </span>
                      <span className="font-medium">{person.currentAssignment}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(person)} className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(person)} className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Personnel Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Personnel</DialogTitle>
            <DialogDescription>Enter the details of the new personnel member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                placeholder="Paramedic, Firefighter, etc."
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={validationErrors.role ? "border-red-500" : ""}
              />
              {validationErrors.role && <p className="text-xs text-red-500">{validationErrors.role}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={validationErrors.phone ? "border-red-500" : ""}
              />
              {validationErrors.phone && <p className="text-xs text-red-500">{validationErrors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on-duty">On Duty</SelectItem>
                  <SelectItem value="off-duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1">
                Add Personnel
              </Button>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Personnel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Personnel</DialogTitle>
            <DialogDescription>Update the personnel member details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Input
                id="edit-role"
                placeholder="Paramedic, Firefighter, etc."
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={validationErrors.role ? "border-red-500" : ""}
              />
              {validationErrors.role && <p className="text-xs text-red-500">{validationErrors.role}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={validationErrors.phone ? "border-red-500" : ""}
              />
              {validationErrors.phone && <p className="text-xs text-red-500">{validationErrors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on-duty">On Duty</SelectItem>
                  <SelectItem value="off-duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdate} className="flex-1">
                Update Personnel
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
