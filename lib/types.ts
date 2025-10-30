// ---------------------------------------------------
// ✅ Accident Types
// ---------------------------------------------------

export type AccidentStatus = "pending" | "dispatched" | "resolved" | "false_alarm"
export type AccidentSeverity = "low" | "medium" | "high" | "critical"

// ---------------------------------------------------
// ✅ User Information
// ---------------------------------------------------

export interface User {
  id: string
  name: string
  phone: string
  email: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  medicalInfo?: string
  bloodType?: string
  allergies?: string[]
}

// ---------------------------------------------------
// ✅ Location Information
// ---------------------------------------------------

export interface Location {
  latitude: number
  longitude: number
  address: string
}

// ---------------------------------------------------
// ✅ Unified FirebaseAccident Interface (merged correctly)
// ---------------------------------------------------

export interface FirebaseAccident {
  id: string
  deviceId: string
  userId: string
  firebaseUserId?: string

  timestamp: Date
  coordinates: string
  status: AccidentStatus
  adminStatus?: string
  severity?: AccidentSeverity

  // ✅ Verification / Confirmation Flags
  confirmed?: boolean
  manualConfirmed?: boolean
  autoConfirmed?: boolean
  verified?: boolean
  falseAlarm?: boolean

  // ✅ Sensor & Device Data
  accelerometerData?: {
    x: number
    y: number
    z: number
  }
  battery?: number
  lastSeen?: number

  // ✅ Police / Report Details
  policeReport?: string
  policeReportDate?: number
  policeReportPersonnel?: string

  // ✅ Miscellaneous Info
  locationName?: string

  // ✅ Flexible field expansion (for backward compatibility)
  [key: string]: any
}

// ---------------------------------------------------
// ✅ Personnel Information
// ---------------------------------------------------

export interface Personnel {
  id: string
  name: string
  role: string
  status: "available" | "on-duty" | "off-duty"
  currentAssignment?: string
}

// ---------------------------------------------------
// ✅ Analytics Data
// ---------------------------------------------------

export interface AnalyticsData {
  totalAccidents: number
  activeAccidents: number
  resolvedToday: number
  averageResponseTime: number
  accidentsByHour: { hour: number; count: number }[]
  accidentsBySeverity: { severity: AccidentSeverity; count: number }[]
}

// ---------------------------------------------------
// ✅ Firebase User Device Data
// ---------------------------------------------------

export interface FirebaseUserData {
  accel: {
    x: number
    y: number
    z: number
  }
  battery: number
  lastSeen: number
  location: {
    latitude: number
    longitude: number
    timestamp: number
  }
  online: boolean
  rescueRequest?: {
    latitude: number
    longitude: number
    timestamp: number
  }
  status: string
  wifi: {
    credentials: {
      password: string
      ssid: string
    }
    password: string
    ssid: string
  }
  wifiStatus: boolean
  dispatchedPersonnel?: string[]
  dispatchedAt?: number
}
