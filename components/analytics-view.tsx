"use client"

import type { FirebaseAccident } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertTriangle, Send } from "lucide-react"
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

export function AnalyticsView({ accidents }: AnalyticsViewProps) {
  const totalAccidents = accidents.length
  const confirmedAccidents = accidents.filter((acc) => acc.status === "resolved").length
  const falseAlarms = accidents.filter((acc) => acc.status === "false-alarm").length
  const notConfirmed = accidents.filter((acc) => acc.status === "pending").length
  const dispatched = accidents.filter((acc) => acc.status === "dispatched").length

  // ✅ Accidents by Status
  const accidentsByStatus = [
    { status: "Confirmed", count: confirmedAccidents, color: "#16a34a" },
    { status: "Dispatched", count: dispatched, color: "#2563eb" },
    { status: "Not Confirmed", count: notConfirmed, color: "#ea580c" },
    { status: "False Alarm", count: falseAlarms, color: "#dc2626" },
  ]

  // ✅ Accidents Over Time (Trend)
  const accidentsByDate = accidents.reduce((acc, accident) => {
    const date = new Date(accident.timestamp).toISOString().split("T")[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const accidentTrendData = Object.entries(accidentsByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date > b.date ? 1 : -1))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 overflow-hidden">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Real-time insights on accident activity and response performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Confirmed", count: confirmedAccidents, color: "green", icon: CheckCircle2, desc: "Resolved successfully" },
          { title: "Dispatched", count: dispatched, color: "blue", icon: Send, desc: "Help on the way" },
          { title: "Not Confirmed", count: notConfirmed, color: "orange", icon: AlertTriangle, desc: "Awaiting confirmation" },
          { title: "False Alarms", count: falseAlarms, color: "red", icon: XCircle, desc: "No action needed" },
        ].map(({ title, count, color, icon: Icon, desc }) => (
          <Card key={title} className={`flex flex-col justify-between border-l-4 border-${color}-600`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium text-${color}-700`}>{title}</CardTitle>
              <Icon className={`h-5 w-5 text-${color}-600`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold text-${color}-600`}>{count}</div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        {/* Accidents by Status */}
        <Card className="flex flex-col justify-between h-full">
          <div className="h-1 bg-gradient-to-r from-green-500 via-blue-500 to-red-500 rounded-t-md" />
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-semibold">Accidents by Status</CardTitle>
            <CardDescription>Distribution of accident outcomes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col h-full justify-between">
            <div className="h-[320px] w-full">
              <ChartContainer
                config={{ count: { label: "Accidents", color: "hsl(var(--chart-1))" } }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accidentsByStatus} barSize={25}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="status" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
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
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {accidentsByStatus.map((s) => (
                <div key={s.status} className="flex items-center space-x-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-gray-700">{s.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accidents Over Time */}
        <Card className="flex flex-col justify-between h-full">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-t-md" />
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-semibold">Accidents Over Time</CardTitle>
            <CardDescription>Daily trend of reported accidents</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col h-full justify-between">
            <div className="h-[320px] w-full">
              <ChartContainer
                config={{ count: { label: "Accidents", color: "#2563eb" } }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accidentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#2563eb" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Summary Statistics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
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
