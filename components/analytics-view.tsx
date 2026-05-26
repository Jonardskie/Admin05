"use client"

import { useMemo, useState } from "react"
import type { FirebaseAccident } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertTriangle, Send, Filter, RotateCcw } from "lucide-react"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface AnalyticsViewProps {
  accidents: FirebaseAccident[]
}

type StatusFilter = "all" | "resolved" | "dispatched" | "pending" | "false-alarm"
type DateFilter = "all" | "today" | "week" | "month"

export function AnalyticsView({ accidents }: AnalyticsViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")

  const filteredAccidents = useMemo(() => {
    const now = new Date()

    return accidents.filter((accident) => {
      const accidentDate = new Date(accident.timestamp)
      const matchesStatus = statusFilter === "all" || accident.status === statusFilter

      let matchesDate = true

      if (dateFilter === "today") {
        matchesDate = accidentDate.toDateString() === now.toDateString()
      }

      if (dateFilter === "week") {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(now.getDate() - 7)
        matchesDate = accidentDate >= sevenDaysAgo && accidentDate <= now
      }

      if (dateFilter === "month") {
        matchesDate =
          accidentDate.getMonth() === now.getMonth() &&
          accidentDate.getFullYear() === now.getFullYear()
      }

      return matchesStatus && matchesDate
    })
  }, [accidents, statusFilter, dateFilter])

  const totalAccidents = filteredAccidents.length
  const confirmedAccidents = filteredAccidents.filter((acc) => acc.status === "resolved").length
  const falseAlarms = filteredAccidents.filter((acc) => acc.status === "false_alarm").length
  const notConfirmed = filteredAccidents.filter((acc) => acc.status === "pending").length
  const dispatched = filteredAccidents.filter((acc) => acc.status === "dispatched").length

  const accidentsByStatus = [
    { status: "Confirmed", count: confirmedAccidents, color: "#16a34a" },
    { status: "Dispatched", count: dispatched, color: "#2563eb" },
    { status: "Not Confirmed", count: notConfirmed, color: "#ea580c" },
    { status: "False Alarm", count: falseAlarms, color: "#dc2626" },
  ]

  const accidentsByDate = filteredAccidents.reduce((acc, accident) => {
    const date = new Date(accident.timestamp).toISOString().split("T")[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const accidentTrendData = Object.entries(accidentsByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date > b.date ? 1 : -1))

  const resetFilters = () => {
    setStatusFilter("all")
    setDateFilter("all")
  }

  const summaryCards = [
    {
      title: "Confirmed",
      count: confirmedAccidents,
      icon: CheckCircle2,
      desc: "Resolved successfully",
      cardClass: "border-l-4 border-green-600",
      titleClass: "text-green-700",
      iconClass: "text-green-600",
      countClass: "text-green-600",
    },
    {
      title: "Dispatched",
      count: dispatched,
      icon: Send,
      desc: "Help on the way",
      cardClass: "border-l-4 border-blue-600",
      titleClass: "text-blue-700",
      iconClass: "text-blue-600",
      countClass: "text-blue-600",
    },
    {
      title: "Not Confirmed",
      count: notConfirmed,
      icon: AlertTriangle,
      desc: "Awaiting confirmation",
      cardClass: "border-l-4 border-orange-600",
      titleClass: "text-orange-700",
      iconClass: "text-orange-600",
      countClass: "text-orange-600",
    },
    {
      title: "False Alarms",
      count: falseAlarms,
      icon: XCircle,
      desc: "No action needed",
      cardClass: "border-l-4 border-red-600",
      titleClass: "text-red-700",
      iconClass: "text-red-600",
      countClass: "text-red-600",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 overflow-hidden">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Real-time insights on accident activity and response performance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filter Analytics
          </CardTitle>
          <CardDescription>Filter accident analytics by status and date range</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="resolved">Confirmed</option>
                <option value="dispatched">Dispatched</option>
                <option value="pending">Not Confirmed</option>
                <option value="false-alarm">False Alarm</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ title, count, icon: Icon, desc, cardClass, titleClass, iconClass, countClass }) => (
          <Card key={title} className={`flex flex-col justify-between ${cardClass}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium ${titleClass}`}>{title}</CardTitle>
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </CardHeader>

            <CardContent>
              <div className={`text-3xl font-bold ${countClass}`}>{count}</div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <Card className="flex flex-col h-full overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 via-blue-500 to-red-500" />

          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-semibold">Accidents by Status</CardTitle>
            <CardDescription>Distribution of accident outcomes</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center px-6 pb-6">
            <div className="h-[320px] w-full">
              <ChartContainer
                config={{ count: { label: "Accidents", color: "hsl(var(--chart-1))" } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={accidentsByStatus}
                    barSize={28}
                    margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="status"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      allowDecimals={false}
                      domain={[0, "dataMax + 1"]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {accidentsByStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="flex min-h-[40px] flex-wrap justify-center gap-4 mt-4">
              {accidentsByStatus.map((s) => (
                <div key={s.status} className="flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-gray-700">{s.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-semibold">Accidents Over Time</CardTitle>
            <CardDescription>Daily trend of reported accidents</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center px-6 pb-6">
            <div className="h-[320px] w-full">
              <ChartContainer
                config={{ count: { label: "Accidents", color: "#2563eb" } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={accidentTrendData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      allowDecimals={false}
                      domain={[0, "dataMax + 1"]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#2563eb" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="h-[40px] mt-4" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Summary Statistics</CardTitle>
          <CardDescription>Key performance indicators based on current filters</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 md:grid-cols-3 text-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Accidents</p>
              <p className="text-2xl font-bold">{totalAccidents}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Confirmation Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {totalAccidents > 0 ? ((confirmedAccidents / totalAccidents) * 100).toFixed(1) : "0"}%
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">False Alarm Rate</p>
              <p className="text-2xl font-bold text-red-600">
                {totalAccidents > 0 ? ((falseAlarms / totalAccidents) * 100).toFixed(1) : "0"}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}