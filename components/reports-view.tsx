"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowUpDown, X, Printer, Eye, FileText, ChevronUp, ChevronDown } from "lucide-react"
import { ReportDetailsModal } from "./report-details-modal"
import type { FirebaseAccident } from "@/lib/types"
import { format } from "date-fns"

interface ReportsViewProps {
  accidents: FirebaseAccident[]
}

export function ReportsView({ accidents }: ReportsViewProps) {
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")
  const [locationFilter, setLocationFilter] = useState<string>("")
  const [reporterFilter, setReporterFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedAccident, setSelectedAccident] = useState<FirebaseAccident | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [filtersVisible, setFiltersVisible] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  const sortedAccidents = useMemo(() => {
    return [...accidents].sort((a, b) => {
      if (sortOrder === "desc") {
        return b.timestamp.getTime() - a.timestamp.getTime()
      } else {
        return a.timestamp.getTime() - b.timestamp.getTime()
      }
    })
  }, [accidents, sortOrder])

  const filteredAccidents = useMemo(() => {
    return sortedAccidents.filter((acc) => {
      const accDate = new Date(acc.timestamp)
      accDate.setHours(0, 0, 0, 0)

      // Date range filter
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        if (accDate < start) return false
      }

      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        if (accDate > end) return false
      }

      // Time range filter
      if (startTime || endTime) {
        const accTime = format(acc.timestamp, "HH:mm")
        if (startTime && accTime < startTime) return false
        if (endTime && accTime > endTime) return false
      }

      // Location filter (case-insensitive partial match)
      if (locationFilter) {
        if (!acc.location.address.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false
        }
      }

      // Reporter filter (case-insensitive partial match)
      if (reporterFilter) {
        if (!acc.user.name.toLowerCase().includes(reporterFilter.toLowerCase())) {
          return false
        }
      }

      // Status filter
      if (statusFilter && acc.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [sortedAccidents, startDate, endDate, startTime, endTime, locationFilter, reporterFilter, statusFilter])

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setStartTime("")
    setEndTime("")
    setLocationFilter("")
    setReporterFilter("")
    setStatusFilter("")
  }

  const handlePrint = () => {
    window.print()
  }

  const handleViewDetails = (accident: FirebaseAccident) => {
    setSelectedAccident(accident)
    setDetailsModalOpen(true)
  }

  const hasActiveFilters =
    startDate || endDate || startTime || endTime || locationFilter || reporterFilter || statusFilter

  return (
    <div className="space-y-6">
      <div className="print-header hidden print:block">
        <div className="mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-4xl font-bold">Accident Management System</h1>
          <p className="mt-2 text-lg text-gray-600">Accident Reports</p>
          {hasActiveFilters && (
            <p className="mt-1 text-sm text-gray-500">
              Filtered from {startDate && format(new Date(startDate), "MMM d, yyyy")} to{" "}
              {endDate && format(new Date(endDate), "MMM d, yyyy")}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
        </div>
      </div>

      <div className="print:hidden">
        <h2 className="text-3xl font-bold tracking-tight">Accident Reports</h2>
        <p className="text-muted-foreground">View and filter accident records</p>
      </div>

      {filtersVisible && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
            <CardDescription>Filter accident records by date, time, location, reporter, and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Date Range */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="start-date" className="mb-2 block text-sm font-medium">
                    From Date
                  </label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || today}
                  />
                </div>

                <div className="flex-1">
                  <label htmlFor="end-date" className="mb-2 block text-sm font-medium">
                    To Date
                  </label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    max={today}
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="start-time" className="mb-2 block text-sm font-medium">
                    From Time
                  </label>
                  <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>

                <div className="flex-1">
                  <label htmlFor="end-time" className="mb-2 block text-sm font-medium">
                    To Time
                  </label>
                  <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              {/* Location and Reporter */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="location-filter" className="mb-2 block text-sm font-medium">
                    Location
                  </label>
                  <Input
                    id="location-filter"
                    type="text"
                    placeholder="Search by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>

                <div className="flex-1">
                  <label htmlFor="reporter-filter" className="mb-2 block text-sm font-medium">
                    Reporter
                  </label>
                  <Input
                    id="reporter-filter"
                    type="text"
                    placeholder="Search by reporter name..."
                    value={reporterFilter}
                    onChange={(e) => setReporterFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="status-filter" className="mb-2 block text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="resolved">Resolved</option>
                    <option value="false-alarm">False Alarm</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="w-fit bg-transparent">
                  <X className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredAccidents.length}</span> of{" "}
          <span className="font-semibold text-foreground">{sortedAccidents.length}</span> total accidents
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFiltersVisible(!filtersVisible)} className="w-fit">
            {filtersVisible ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide Filters
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show Filters
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="w-fit"
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} className="w-fit">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {filteredAccidents.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <p className="text-muted-foreground">No accidents found for the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
                <th className="px-4 py-3 text-left font-semibold">Reporter</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Details</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAccidents.map((accident) => (
                <tr key={accident.id} className="hover:bg-muted/50 transition-colors print:break-inside-avoid">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium">{format(accident.timestamp, "MMM d, yyyy")}</span>
                      <span className="text-xs text-muted-foreground">{format(accident.timestamp, "h:mm a")}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{accident.user.name}</span>
                      <span className="text-xs text-muted-foreground">{accident.user.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">{accident.location.address}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge
                        className={
                          accident.status === "pending"
                            ? "bg-destructive text-white"
                            : accident.status === "dispatched"
                              ? "bg-blue-500 text-white"
                              : accident.status === "resolved"
                                ? "bg-green-500 text-white"
                                : "bg-muted text-muted-foreground"
                        }
                      >
                        {accident.status.toUpperCase()}
                      </Badge>
                      {accident.policeReport && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 w-fit">
                          <FileText className="h-3 w-3 mr-1" />
                          Police Report
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      <span>
                        Detections: <span className="font-semibold">{accident.detectionCount}</span>
                      </span>
                      {accident.dispatchedPersonnel && accident.dispatchedPersonnel.length > 0 && (
                        <span>
                          Personnel: <span className="font-semibold">{accident.dispatchedPersonnel.length}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center print:hidden">
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(accident)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReportDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        accident={selectedAccident}
      />

      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            margin: 1.5cm;
          }
          
          .print-header {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
