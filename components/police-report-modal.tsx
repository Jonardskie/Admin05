"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { savePoliceReport } from "@/lib/firebase-service"

interface PoliceReportModalProps {
  open: boolean
  onClose: () => void
  accidentId: string
  onFinish: (report: string) => void
  officerName?: string
}

export function PoliceReportModal({
  open,
  onClose,
  accidentId,
  onFinish,
  officerName,
}: PoliceReportModalProps) {
  const [report, setReport] = useState("")
  const [personnel, setPersonnel] = useState(officerName || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFinish = async () => {
    if (!report.trim()) {
      alert("Please enter a police report statement")
      return
    }
    if (!personnel.trim()) {
      alert("Please enter the personnel/officer name")
      return
    }

    setIsSubmitting(true)
    try {
      await savePoliceReport(accidentId, report, personnel)
      onFinish(report)
      setReport("")
      setPersonnel("")
      onClose()
    } catch (error) {
      console.error("Error saving police report:", error)
      alert("Failed to save police report. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentDate = new Date().toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ✅ Accessibility fix */}
        <VisuallyHidden>
          <DialogTitle>Police Report Modal</DialogTitle>
        </VisuallyHidden>

        <DialogHeader>
          <DialogTitle>Police Report</DialogTitle>
        </DialogHeader>

        {/* Header with Logo */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Police Report</h2>
                <p className="text-sm text-muted-foreground">
                  Accident ID: {accidentId}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {currentDate}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Report Content Section */}
        <div className="space-y-4 mt-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Incident Statement</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a detailed statement of what happened during this
              accident. Include relevant details such as the sequence of events,
              conditions at the time, and any observations.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Personnel / Officer Name
            </label>
            {officerName ? (
              <div className="w-full px-3 py-2 rounded-md border border-input bg-muted text-sm">
                {personnel}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Enter your name or officer ID"
                value={personnel}
                onChange={(e) => setPersonnel(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Statement Report</label>
            <Textarea
              placeholder="Enter your detailed police report statement here. Include all relevant information about the accident..."
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={10}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {report.length} characters
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleFinish}
            disabled={isSubmitting || !report.trim() || !personnel.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "Finish Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
