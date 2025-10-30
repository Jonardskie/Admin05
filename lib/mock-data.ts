import type { Accident, Personnel, AnalyticsData } from "./types"

// Mock accidents data
export const mockAccidents: Accident[] = [
  {
    id: "ACC001",
    userId: "USER001",
    user: {
      id: "USER001",
      name: "John Martinez",
      phone: "+1 (555) 123-4567",
      email: "john.martinez@email.com",
    },
    location: {
      latitude: 14.5995,
      longitude: 120.9842,
      address: "123 Rizal Avenue, Manila, Philippines",
    },
    timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
    status: "pending",
    severity: "high",
    userConfirmed: true,
    detectionCount: 1,
  },
  {
    id: "ACC002",
    userId: "USER002",
    user: {
      id: "USER002",
      name: "Maria Santos",
      phone: "+1 (555) 234-5678",
      email: "maria.santos@email.com",
    },
    location: {
      latitude: 14.6091,
      longitude: 121.0223,
      address: "456 Quezon Boulevard, Quezon City, Philippines",
    },
    timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
    status: "dispatched",
    severity: "critical",
    userConfirmed: true,
    detectionCount: 1,
    dispatchedPersonnel: ["PER001", "PER002"],
  },
  {
    id: "ACC003",
    userId: "USER003",
    user: {
      id: "USER003",
      name: "Carlos Reyes",
      phone: "+1 (555) 345-6789",
      email: "carlos.reyes@email.com",
    },
    location: {
      latitude: 14.5547,
      longitude: 121.0244,
      address: "789 Makati Avenue, Makati, Philippines",
    },
    timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
    status: "resolved",
    severity: "medium",
    userConfirmed: true,
    detectionCount: 1,
    dispatchedPersonnel: ["PER003"],
    notes: "Minor injuries, transported to hospital",
  },
]

// Mock personnel data
export const mockPersonnel: Personnel[] = [
  {
    id: "PER001",
    name: "Officer David Chen",
    role: "Paramedic",
    status: "on-duty",
    currentAssignment: "ACC002",
  },
  {
    id: "PER002",
    name: "Officer Sarah Johnson",
    role: "EMT",
    status: "on-duty",
    currentAssignment: "ACC002",
  },
  {
    id: "PER003",
    name: "Officer Michael Brown",
    role: "Paramedic",
    status: "available",
  },
  {
    id: "PER004",
    name: "Officer Lisa Anderson",
    role: "EMT",
    status: "available",
  },
  {
    id: "PER005",
    name: "Officer James Wilson",
    role: "Paramedic",
    status: "off-duty",
  },
]

// Mock analytics data
export const mockAnalytics: AnalyticsData = {
  totalAccidents: 47,
  activeAccidents: 2,
  resolvedToday: 12,
  averageResponseTime: 8.5,
  accidentsByHour: [
    { hour: 0, count: 2 },
    { hour: 1, count: 1 },
    { hour: 2, count: 0 },
    { hour: 3, count: 1 },
    { hour: 4, count: 2 },
    { hour: 5, count: 3 },
    { hour: 6, count: 5 },
    { hour: 7, count: 8 },
    { hour: 8, count: 12 },
    { hour: 9, count: 10 },
    { hour: 10, count: 7 },
    { hour: 11, count: 6 },
    { hour: 12, count: 9 },
    { hour: 13, count: 8 },
    { hour: 14, count: 11 },
    { hour: 15, count: 13 },
    { hour: 16, count: 15 },
    { hour: 17, count: 18 },
    { hour: 18, count: 14 },
    { hour: 19, count: 10 },
    { hour: 20, count: 8 },
    { hour: 21, count: 6 },
    { hour: 22, count: 4 },
    { hour: 23, count: 3 },
  ],
  accidentsBySeverity: [
    { severity: "low", count: 15 },
    { severity: "medium", count: 18 },
    { severity: "high", count: 10 },
    { severity: "critical", count: 4 },
  ],
}
