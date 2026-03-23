import { database, firestore } from "./firebase-config"
import { ref, onValue, get, update, off, remove, set } from "firebase/database"
import { doc, getDoc, collection, getDocs, query, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import type { FirebaseUserData, AccidentSeverity, FirebaseAccident } from "./types"
import admin from 'firebase-admin'

// Calculate severity based on accelerometer data
function calculateSeverity(accel: { x: number; y: number; z: number }): AccidentSeverity {
  const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2)

  if (magnitude > 80) return "critical"
  if (magnitude > 60) return "high"
  if (magnitude > 40) return "medium"
  return "low"
}

function convertAccidentData(accidentId: string, accidentData: any, deviceData?: any): FirebaseAccident | null {
  try {
    // Skip if no valid accident data
    if (!accidentData) return null

    // Determine status
    const processedStatus = accidentData.adminStatus || accidentData.status
    let adminStatus: "pending" | "dispatched" | "resolved" | "false-alarm" = "pending"

    if (processedStatus === "resolved" || processedStatus === "Resolved") {
      adminStatus = "resolved"
    } else if (processedStatus === "dispatched" || processedStatus === "Help Dispatched") {
      adminStatus = "dispatched"
    } else if (processedStatus === "false-alarm" || processedStatus === "False Alarm") {
      adminStatus = "false-alarm"
    }

    // Parse coordinates - handle multiple formats
    let latitude = 0
    let longitude = 0

    if (accidentData.coordinates && accidentData.coordinates !== "Unknown") {
      const coords = accidentData.coordinates.split(",")
      latitude = Number.parseFloat(coords[0]) || 0
      longitude = Number.parseFloat(coords[1]) || 0
    } else if (accidentData.device?.location) {
      latitude = accidentData.device.location.latitude || 0
      longitude = accidentData.device.location.longitude || 0
    }

    // Skip accidents with invalid coordinates
    if (latitude === 0 && longitude === 0) {
      console.log(`[v0] Skipping accident ${accidentId} - invalid coordinates`)
      return null
    }

    // Get accelerometer data
    let accel = { x: 0, y: 0, z: 0 }
    if (deviceData?.accel) {
      accel = deviceData.accel
    } else if (accidentData.device?.accel) {
      accel = accidentData.device.accel
    } else if (accidentData.description) {
      // Parse from description if available (IoT sensor format)
      const match = accidentData.description.match(/X=([-\d.]+), Y=([-\d.]+), Z=([-\d.]+)/)
      if (match) {
        accel = {
          x: Number.parseFloat(match[1]) || 0,
          y: Number.parseFloat(match[2]) || 0,
          z: Number.parseFloat(match[3]) || 0,
        }
      }
    }

    const severity = calculateSeverity(accel)

    // Get device/user ID
    const deviceId = accidentData.deviceId || accidentData.devices?.[0] || accidentId

    const userId = accidentData.userId || deviceId

    // Get timestamp
    let timestamp = new Date()
    if (accidentData.timestamp) {
      // Handle both unix timestamp (seconds) and milliseconds
      const ts = accidentData.timestamp
      timestamp = new Date(ts > 10000000000 ? ts : ts * 1000)
    }

    return {
      id: accidentId,
      userId: userId,
      firebaseUserId: deviceId,
      user: {
        id: userId,
        name: userId,
        phone: "N/A",
        email: "N/A",
      },
      location: {
        latitude,
        longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      },
      timestamp,
      status: adminStatus,
      severity,
      userConfirmed: true,
      detectionCount: 1,
      accelerometerData: accel,
      battery: deviceData?.battery || accidentData.device?.battery || 0,
      lastSeen: deviceData?.lastSeen || accidentData.device?.lastSeen || Date.now(),
      dispatchedPersonnel: accidentData.dispatchedPersonnel || [],
      dispatchedAt: accidentData.dispatchedAt ? new Date(accidentData.dispatchedAt) : undefined,
      policeReport: accidentData.policeReport || undefined,
      policeReportDate: accidentData.policeReportDate ? new Date(accidentData.policeReportDate) : undefined,
    }
  } catch (error) {
    console.error(`[v0] Error converting accident ${accidentId}:`, error)
    return null
  }
}

// Convert Firebase user data to Accident object (legacy format support)
function convertToAccident(userId: string, data: FirebaseUserData): FirebaseAccident | null {
  if (!data.rescueRequest) {
    return null
  }

  let adminStatus: "pending" | "dispatched" | "resolved" | "false-alarm" = "pending"

  if (data.status === "Resolved") {
    adminStatus = "resolved"
  } else if (data.status === "Help Dispatched") {
    adminStatus = "dispatched"
  } else if (data.status === "False Alarm") {
    adminStatus = "false-alarm"
  } else if (data.status === "Accident Detected") {
    adminStatus = "pending"
  } else {
    adminStatus = "pending"
  }

  const severity = calculateSeverity(data.accel)

  return {
    id: `${userId}_${data.rescueRequest.timestamp}`,
    userId: userId,
    firebaseUserId: userId,
    user: {
      id: userId,
      name: userId,
      phone: "N/A",
      email: "N/A",
    },
    location: {
      latitude: data.rescueRequest.latitude,
      longitude: data.rescueRequest.longitude,
      address: `${data.rescueRequest.latitude.toFixed(6)}, ${data.rescueRequest.longitude.toFixed(6)}`,
    },
    timestamp: new Date(data.rescueRequest.timestamp),
    status: adminStatus,
    severity: severity,
    userConfirmed: true,
    detectionCount: 1,
    accelerometerData: data.accel,
    battery: data.battery,
    lastSeen: data.lastSeen,
    dispatchedPersonnel: data.dispatchedPersonnel || [],
    dispatchedAt: data.dispatchedAt ? new Date(data.dispatchedAt) : undefined,
  }
}

// Fetch user data from Firestore
async function getUserDataFromFirestore(userId: string) {
  try {
    // Skip Firestore fetch for generic device IDs
    if (userId === "device" || userId.startsWith("device-") || userId === "N/A") {
      return null
    }

    console.log("[v0] Fetching user data from Firestore for userId:", userId)
    const userDocRef = doc(firestore, "users", userId)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      const userData = userDoc.data()
      console.log("[v0] Found user data in Firestore:", userData)

      const fullName =
        userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`.trim()
          : userData.name || userData.fullName || "Unknown User"

      const emergencyContact =
        userData.emergencyName || userData.emergencyNumber
          ? {
              name: userData.emergencyName || "Unknown",
              phone: userData.emergencyNumber || "N/A",
              relationship: userData.emergencyRelationship || "Emergency Contact",
            }
          : userData.emergencyContact

      return {
        id: userId,
        name: fullName,
        phone: userData.phoneNumber || userData.phone || "N/A",
        email: userData.email || "N/A",
        emergencyContact: emergencyContact,
        medicalInfo: userData.medicalInfo,
        bloodType: userData.bloodType,
        allergies: userData.allergies,
      }
    } else {
      console.log("[v0] No user data found in Firestore for userId:", userId)
      return null
    }
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
      // Don't log permission errors repeatedly - they're expected if Firestore rules aren't set up
      return null
    }
    console.error("[v0] Error fetching user data from Firestore:", error)
    return null
  }
}

export async function getAllFirebaseData() {
  try {
    console.log("[v0] Fetching all data from Firebase...")

    const accidentsRef = ref(database, "accidents")
    const devicesRef = ref(database, "devices")
    const deviceRef = ref(database, "device")
    const personnelRef = ref(database, "personnel")

    const [accidentsSnapshot, devicesSnapshot, deviceSnapshot, personnelSnapshot] = await Promise.all([
      get(accidentsRef),
      get(devicesRef),
      get(deviceRef),
      get(personnelRef),
    ])

    const accidentsData = accidentsSnapshot.val() || {}
    const devicesData = devicesSnapshot.val() || {}
    const deviceData = deviceSnapshot.val()
    const personnelData = personnelSnapshot.val() || {}

    // Convert accidents to user-like objects with all available data
    const users: any[] = []
    const processedIds = new Set<string>()

    // Process accidents collection
    Object.entries(accidentsData).forEach(([accidentId, accidentData]: [string, any]) => {
      const userId = accidentData.userId || accidentData.deviceId || accidentId

      if (!processedIds.has(userId)) {
        processedIds.add(userId)

        users.push({
          id: userId,
          name: accidentData.user?.name || userId,
          email: accidentData.user?.email || "N/A",
          phone: accidentData.user?.phone || "N/A",
          bloodType: accidentData.bloodType || "N/A",
          medicalInfo: accidentData.medicalInfo || "N/A",
          allergies: accidentData.allergies || [],
          emergencyContact: accidentData.emergencyContact || null,
          location: accidentData.location,
          lastAccident: accidentData.timestamp,
          accidentStatus: accidentData.status,
          battery: accidentData.battery || "N/A",
          lastSeen: accidentData.lastSeen,
          createdAt: accidentData.timestamp,
          source: "accidents",
        })
      }
    })

    // Process devices collection
    Object.entries(devicesData).forEach(([deviceId, deviceInfo]: [string, any]) => {
      if (!processedIds.has(deviceId)) {
        processedIds.add(deviceId)

        users.push({
          id: deviceId,
          name: deviceInfo.name || deviceId,
          email: deviceInfo.email || "N/A",
          phone: deviceInfo.phone || "N/A",
          bloodType: deviceInfo.bloodType || "N/A",
          medicalInfo: deviceInfo.medicalInfo || "N/A",
          allergies: deviceInfo.allergies || [],
          emergencyContact: deviceInfo.emergencyContact || null,
          location: deviceInfo.location,
          battery: deviceInfo.battery || "N/A",
          lastSeen: deviceInfo.lastSeen,
          createdAt: deviceInfo.createdAt,
          source: "devices",
        })
      }
    })

    // Process single device
    if (deviceData && !processedIds.has("device")) {
      processedIds.add("device")

      users.push({
        id: "device",
        name: deviceData.name || "ESP32 Device",
        email: deviceData.email || "N/A",
        phone: deviceData.phone || "N/A",
        bloodType: deviceData.bloodType || "N/A",
        medicalInfo: deviceData.medicalInfo || "N/A",
        allergies: deviceData.allergies || [],
        emergencyContact: deviceData.emergencyContact || null,
        location: deviceData.location,
        battery: deviceData.battery || "N/A",
        lastSeen: deviceData.lastSeen,
        createdAt: deviceData.createdAt,
        source: "device",
      })
    }

    console.log("[v0] Total users/devices fetched:", users.length)
    return users
  } catch (error) {
    console.error("[v0] Error fetching all Firebase data:", error)
    return []
  }
}

export function listenToDeviceStatus(callback: (deviceStatus: any) => void) {
  const deviceRef = ref(database, "device")

  const unsubscribe = onValue(deviceRef, (snapshot) => {
    const deviceData = snapshot.val()
    console.log("[v0] Device status update:", deviceData)

    if (deviceData) {
      callback(deviceData)
    }
  })

  return () => {
    off(deviceRef)
  }
}

export function listenToAccidents(callback: (accidents: FirebaseAccident[]) => void) {
  const accidentsRef = ref(database, "accidents")
  const devicesRef = ref(database, "devices")
  const deviceRef = ref(database, "device")
  const rootRef = ref(database, "/")

  const processData = async () => {
    const accidents: FirebaseAccident[] = []

    try {
      const accidentsSnapshot = await get(accidentsRef)
      const devicesSnapshot = await get(devicesRef)
      const deviceSnapshot = await get(deviceRef)
      const accidentsData = accidentsSnapshot.val()
      const devicesData = devicesSnapshot.val()
      const deviceData = deviceSnapshot.val()

      console.log("[v0] Firebase Database Contents:")
      console.log(
        "[v0] - accidents collection:",
        accidentsData ? Object.keys(accidentsData).length + " entries" : "EMPTY",
      )
      console.log("[v0] - devices collection:", devicesData ? Object.keys(devicesData).length + " entries" : "EMPTY")
      console.log("[v0] - device (new ESP32):", deviceData ? "EXISTS" : "EMPTY")

      if (accidentsData) {
        Object.entries(accidentsData).forEach(([accidentId, accidentData]: [string, any]) => {
          console.log(`[v0] Processing accident: ${accidentId}`, {
            confirmed: accidentData.confirmed,
            status: accidentData.status,
            coordinates: accidentData.coordinates,
          })

          const deviceId = accidentData.deviceId || accidentData.devices?.[0]
          const deviceDataOld = deviceId && devicesData ? devicesData[deviceId] : undefined

          const accident = convertAccidentData(accidentId, accidentData, deviceDataOld)
          if (accident) {
            accidents.push(accident)
          }
        })
      }

      // Also check legacy root path for backwards compatibility
      const rootSnapshot = await get(rootRef)
      const rootData = rootSnapshot.val()

      if (rootData) {
        Object.entries(rootData).forEach(([userId, userData]) => {
          if (userId === "devices" || userId === "accidents" || userId === "device" || userId === "triggered") return

          const accident = convertToAccident(userId, userData as FirebaseUserData)
          if (accident) {
            accidents.push(accident)
          }
        })
      }

      const accidentsWithUserData = await Promise.all(
        accidents.map(async (accident) => {
          const userData = await getUserDataFromFirestore(accident.userId)
          if (userData) {
            return {
              ...accident,
              user: userData,
            }
          }
          return accident
        }),
      )

      console.log("[v0] Total accidents processed:", accidentsWithUserData.length)
      if (accidentsWithUserData.length > 0) {
        console.log("[v0] Sample accident:", accidentsWithUserData[0])
      }
      callback(accidentsWithUserData)
    } catch (error) {
      console.error("[v0] Error processing accidents:", error)
      callback([])
    }
  }

  processData()

  // Listen to accidents collection for real-time updates
  const unsubscribeAccidents = onValue(accidentsRef, () => {
    console.log("[v0] Accidents collection changed - reprocessing")
    processData()
  })

  // Listen to devices collection
  const unsubscribeDevices = onValue(devicesRef, () => {
    console.log("[v0] Devices collection changed - reprocessing")
    processData()
  })

  const unsubscribeDevice = onValue(deviceRef, () => {
    console.log("[v0] Device status changed - reprocessing")
    processData()
  })

  // Listen to triggered flag
  const triggeredRef = ref(database, "triggered")
  const unsubscribeTriggered = onValue(triggeredRef, () => {
    console.log("[v0] Triggered flag changed - reprocessing")
    processData()
  })

  // Listen to root for legacy format
  const unsubscribeRoot = onValue(rootRef, () => {
    console.log("[v0] Root data changed - reprocessing")
    processData()
  })

  return () => {
    off(accidentsRef)
    off(devicesRef)
    off(deviceRef)
    off(triggeredRef)
    off(rootRef)
  }
}

// Get accidents once (no real-time updates)
export async function getAccidents(): Promise<FirebaseAccident[]> {
  const usersRef = ref(database, "/")
  const snapshot = await get(usersRef)
  const data = snapshot.val()
  const accidents: FirebaseAccident[] = []

  if (data) {
    Object.entries(data).forEach(([userId, userData]) => {
      const accident = convertToAccident(userId, userData as FirebaseUserData)
      if (accident) {
        accidents.push(accident)
      }
    })
  }

  return accidents
}

export async function updateAccidentStatus(
  accidentIdOrUserId: string,
  status: "pending" | "dispatched" | "resolved" | "false-alarm",
) {
  console.log("[v0] updateAccidentStatus called with:", { accidentIdOrUserId, status })

  let newStatus = "Accident Detected"
  if (status === "resolved") {
    newStatus = "Resolved"
  } else if (status === "dispatched") {
    newStatus = "Help Dispatched"
  } else if (status === "false-alarm") {
    newStatus = "False Alarm"
  } else if (status === "pending") {
    newStatus = "Accident Detected"
  }

  console.log("[v0] Updating Firebase status to:", newStatus)

  try {
    // Update in accidents collection (ESP32 format)
    const accidentRef = ref(database, `accidents/${accidentIdOrUserId}`)
    await update(accidentRef, {
      adminStatus: newStatus,
      status: status,
    })

    // Also update legacy format if exists
    const userRef = ref(database, `/${accidentIdOrUserId}`)
    const userSnapshot = await get(userRef)
    if (userSnapshot.exists()) {
      await update(userRef, {
        status: newStatus,
      })
    }

    if (
      (status === "resolved" || status === "dispatched" || status === "false-alarm") &&
      (accidentIdOrUserId === "device" || accidentIdOrUserId.startsWith("device-"))
    ) {
      const triggeredRef = ref(database, "triggered")
      await set(triggeredRef, false)
      console.log("[v0] Reset triggered flag to false - ESP32 can now detect new accidents")
    }

    console.log("[v0] Successfully updated status in Firebase")
  } catch (error) {
    console.error("[v0] Error updating status in Firebase:", error)
    throw error
  }
}

export async function dispatchPersonnel(accidentIdOrUserId: string, personnelIds: string[]) {
  console.log("[v0] dispatchPersonnel called with:", { accidentIdOrUserId, personnelIds })

  try {
    await updateAccidentStatus(accidentIdOrUserId, "dispatched")
    console.log("[v0] Status updated to dispatched")

    const accidentRef = ref(database, `accidents/${accidentIdOrUserId}`)
    await update(accidentRef, {
      dispatchedPersonnel: personnelIds,
      dispatchedAt: Date.now(),
    })

    // Also update legacy format if exists
    const userRef = ref(database, `/${accidentIdOrUserId}`)
    const userSnapshot = await get(userRef)
    if (userSnapshot.exists()) {
      await update(userRef, {
        dispatchedPersonnel: personnelIds,
        dispatchedAt: Date.now(),
      })
    }

    console.log("[v0] Successfully dispatched personnel")
  } catch (error) {
    console.error("[v0] Error dispatching personnel:", error)
    throw error
  }
}

// Get user location data
export async function getUserLocation(userId: string): Promise<{ latitude: number; longitude: number } | null> {
  const userRef = ref(database, `/${userId}/location`)
  const snapshot = await get(userRef)
  return snapshot.val()
}

export async function deleteAccident(accidentIdOrUserId: string) {
  console.log("[v0] deleteAccident called with accidentId:", accidentIdOrUserId)

  try {
    // Delete from accidents collection
    const accidentRef = ref(database, `accidents/${accidentIdOrUserId}`)
    await remove(accidentRef)

    // Also delete from legacy format if exists
    const userRef = ref(database, `/${accidentIdOrUserId}`)
    const userSnapshot = await get(userRef)
    if (userSnapshot.exists()) {
      await update(userRef, {
        rescueRequest: null,
        status: "Normal",
        dispatchedPersonnel: null,
        dispatchedAt: null,
      })
    }

    if (accidentIdOrUserId === "device" || accidentIdOrUserId.startsWith("device-")) {
      const triggeredRef = ref(database, "triggered")
      await set(triggeredRef, false)
      console.log("[v0] Reset triggered flag to false - ESP32 can now detect new accidents")
    }

    console.log("[v0] Successfully deleted accident")
  } catch (error) {
    console.error("[v0] Error deleting accident:", error)
    throw error
  }
}

export async function cleanupInvalidAccidents(): Promise<{ deleted: number; kept: number }> {
  console.log("[v0] Starting cleanup of invalid accidents...")

  const accidentsRef = ref(database, "accidents")
  const snapshot = await get(accidentsRef)
  const accidentsData = snapshot.val()

  let deleted = 0
  let kept = 0

  if (!accidentsData) {
    console.log("[v0] No accidents to clean up")
    return { deleted: 0, kept: 0 }
  }

  const deletePromises: Promise<void>[] = []

  Object.entries(accidentsData).forEach(([accidentId, accidentData]: [string, any]) => {
    // Check if accident has invalid coordinates
    let isInvalid = false

    if (!accidentData.coordinates || accidentData.coordinates === "Unknown") {
      isInvalid = true
    } else {
      const coords = accidentData.coordinates.split(",")
      const lat = Number.parseFloat(coords[0]) || 0
      const lng = Number.parseFloat(coords[1]) || 0

      if (lat === 0 && lng === 0) {
        isInvalid = true
      }
    }

    if (isInvalid) {
      console.log(`[v0] Deleting invalid accident: ${accidentId}`)
      const accidentRef = ref(database, `accidents/${accidentId}`)
      deletePromises.push(remove(accidentRef))
      deleted++
    } else {
      kept++
    }
  })

  await Promise.all(deletePromises)

  console.log(`[v0] Cleanup complete: deleted ${deleted}, kept ${kept}`)
  return { deleted, kept }
}

// Listen to personnel in real-time
export function listenToPersonnel(callback: (personnel: any[]) => void) {
  const personnelRef = ref(database, "personnel")

  const unsubscribe = onValue(personnelRef, (snapshot) => {
    const data = snapshot.val()
    const personnel: any[] = []

    if (data) {
      Object.entries(data).forEach(([id, personnelData]: [string, any]) => {
        personnel.push({
          id,
          ...personnelData,
        })
      })
    }

    console.log("[v0] Personnel updated:", personnel.length)
    callback(personnel)
  })

  return () => {
    off(personnelRef)
  }
}

// Get all personnel once
export async function getPersonnel() {
  const personnelRef = ref(database, "personnel")
  const snapshot = await get(personnelRef)
  const data = snapshot.val()
  const personnel: any[] = []

  if (data) {
    Object.entries(data).forEach(([id, personnelData]: [string, any]) => {
      personnel.push({
        id,
        ...personnelData,
      })
    })
  }

  return personnel
}

// Add new personnel
export async function addPersonnel(personnelData: {
  name: string
  role: string
  phone: string
  email: string
  status: "available" | "on-duty" | "off-duty"
}) {
  console.log("[v0] Adding new personnel:", personnelData)

  try {
    const personnelRef = ref(database, "personnel")
    const snapshot = await get(personnelRef)
    const existingPersonnel = snapshot.val() || {}

    // Generate new ID
    const personnelIds = Object.keys(existingPersonnel)
    const maxId =
      personnelIds.length > 0
        ? Math.max(
            ...personnelIds.map((id) => {
              const match = id.match(/PER(\d+)/)
              return match ? Number.parseInt(match[1]) : 0
            }),
          )
        : 0
    const newId = `PER${String(maxId + 1).padStart(3, "0")}`

    const newPersonnelRef = ref(database, `personnel/${newId}`)
    await set(newPersonnelRef, {
      ...personnelData,
      createdAt: Date.now(),
    })

    console.log("[v0] Successfully added personnel with ID:", newId)
    return newId
  } catch (error) {
    console.error("[v0] Error adding personnel:", error)
    throw error
  }
}

// Update personnel
export async function updatePersonnel(
  personnelId: string,
  updates: {
    name?: string
    role?: string
    phone?: string
    email?: string
    status?: "available" | "on-duty" | "off-duty"
    currentAssignment?: string
  },
) {
  console.log("[v0] Updating personnel:", personnelId, updates)

  try {
    const personnelRef = ref(database, `personnel/${personnelId}`)
    await update(personnelRef, {
      ...updates,
      updatedAt: Date.now(),
    })

    console.log("[v0] Successfully updated personnel")
  } catch (error) {
    console.error("[v0] Error updating personnel:", error)
    throw error
  }
}

// Delete personnel
export async function deletePersonnel(personnelId: string) {
  console.log("[v0] Deleting personnel:", personnelId)

  try {
    const personnelRef = ref(database, `personnel/${personnelId}`)
    await remove(personnelRef)

    console.log("[v0] Successfully deleted personnel")
  } catch (error) {
    console.error("[v0] Error deleting personnel:", error)
    throw error
  }
}

// Listen to users in real-time from Firestore
export function listenToUsers(callback: (users: any[]) => void) {
  try {
    console.log("[v0] Setting up Firebase listener for users")
    const usersCollection = collection(firestore, "users")
    const q = query(usersCollection)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users: any[] = []

        snapshot.forEach((doc) => {
          const userData = doc.data()
          users.push({
            id: doc.id,
            name: userData.name || userData.fullName || "Unknown",
            phone: userData.phone || userData.phoneNumber || "N/A",
            email: userData.email || "N/A",
            emergencyContact: userData.emergencyContact,
            medicalInfo: userData.medicalInfo,
            bloodType: userData.bloodType,
            allergies: userData.allergies,
            createdAt: userData.createdAt,
          })
        })

        console.log("[v0] Received users from Firestore:", users.length)
        callback(users)
      },
      (error) => {
        // Silently handle permission errors - Firestore rules may not be configured
        if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
          console.log("[v0] Firestore users collection requires authentication - returning empty list")
          callback([])
        } else {
          console.error("[v0] Error listening to users:", error)
          callback([])
        }
      },
    )

    return unsubscribe
  } catch (error: any) {
    // Handle setup errors gracefully
    if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
      console.log("[v0] Firestore users collection requires authentication - returning empty list")
    } else {
      console.error("[v0] Error setting up users listener:", error)
    }
    callback([])
    return () => {}
  }
}

// Get all users once from Firestore
export async function getUsers() {
  try {
    const usersCollection = collection(firestore, "users")
    const snapshot = await getDocs(usersCollection)
    const users: any[] = []

    snapshot.forEach((doc) => {
      const userData = doc.data()
      users.push({
        id: doc.id,
        name: userData.name || userData.fullName || "Unknown",
        phone: userData.phone || userData.phoneNumber || "N/A",
        email: userData.email || "N/A",
        emergencyContact: userData.emergencyContact,
        medicalInfo: userData.medicalInfo,
        bloodType: userData.bloodType,
        allergies: userData.allergies,
        createdAt: userData.createdAt,
      })
    })

    console.log("[v0] Fetched users from Firestore:", users.length)
    return users
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
      console.log("[v0] Firestore users collection requires authentication - returning empty list")
    } else {
      console.error("[v0] Error fetching users:", error)
    }
    return []
  }
}

export async function getAllFirestoreUsers() {
  try {
    console.log("[v0] Fetching all users from Firestore collection 'users'...")
    const usersCollection = collection(firestore, "users")
    const snapshot = await getDocs(usersCollection)
    const users: any[] = []

    snapshot.forEach((doc) => {
      const userData = doc.data()
      users.push({
        id: doc.id,
        uid: userData.uid || doc.id,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "N/A",
        phoneNumber: userData.phoneNumber || "N/A",
        address: userData.address || "N/A",
        emergencyName: userData.emergencyName || "N/A",
        emergencyNumber: userData.emergencyNumber || "N/A",
        createdAt: userData.createdAt || new Date().toISOString(),
        emailVerified: userData.emailVerified || false,
      })
    })

    console.log("[v0] Successfully fetched users from Firestore:", users.length)

    return users
  } catch (error: any) {
    if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
      console.error(
        "[v0] FIRESTORE PERMISSION DENIED: The 'users' collection is not readable. " +
          "Update your Firestore security rules to allow reading. " +
          "See FIRESTORE_RULES_UPDATE.md for instructions.",
      )
    } else if (error?.code === "not-found" || error?.message?.includes("not found")) {
      console.error("[v0] FIRESTORE COLLECTION NOT FOUND: The 'users' collection does not exist in Firestore.")
    } else {
      console.error("[v0] FIRESTORE ERROR:", error?.message || error)
    }

    console.log("[v0] Attempting fallback: fetching users from Realtime Database at 'users' path...")
    try {
      const usersRef = ref(database, "users")
      const snapshot = await get(usersRef)
      const data = snapshot.val()

      if (data) {
        const users: any[] = []
        Object.entries(data).forEach(([userId, userData]: [string, any]) => {
          users.push({
            id: userId,
            uid: userData.uid || userId,
            firstName: userData.firstName || userData.name || "",
            lastName: userData.lastName || "",
            email: userData.email || "N/A",
            phoneNumber: userData.phoneNumber || userData.phone || "N/A",
            address: userData.address || "N/A",
            emergencyName: userData.emergencyName || "N/A",
            emergencyNumber: userData.emergencyNumber || "N/A",
            createdAt: userData.createdAt || new Date().toISOString(),
            emailVerified: userData.emailVerified || false,
          })
        })
        console.log("[v0] Successfully fetched users from Realtime Database:", users.length)
        return users
      } else {
        console.log("[v0] No users found in Realtime Database 'users' path")
      }
    } catch (fallbackError) {
      console.error("[v0] Fallback to Realtime Database also failed:", fallbackError)
    }

    return []
  }
}

// Firestore CRUD helpers for user-management
export async function createFirestoreUser(user: {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address: string
  emergencyName: string
  emergencyNumber: string
  emailVerified?: boolean
}) {
  const usersCollection = collection(firestore, "users")
  const userRef = doc(usersCollection)

  const now = new Date().toISOString()
  const newUser = {
    uid: userRef.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    address: user.address,
    emergencyName: user.emergencyName,
    emergencyNumber: user.emergencyNumber,
    createdAt: now,
    emailVerified: user.emailVerified ?? false,
  }

  await setDoc(userRef, newUser)
  return { id: userRef.id, ...newUser }
}

export async function updateFirestoreUser(userId: string, user: {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  address?: string
  emergencyName?: string
  emergencyNumber?: string
  emailVerified?: boolean
}) {
  const userRef = doc(firestore, "users", userId)
  await updateDoc(userRef, user)
  return { id: userId, ...user }
}

export async function deleteFirestoreUser(userId: string) {
  const userRef = doc(firestore, "users", userId)
  await deleteDoc(userRef)
}

export async function savePoliceReport(accidentId: string, reportText: string, personnel: string) {
  console.log("[v0] Saving police report for accident:", accidentId)

  try {
    const accidentRef = ref(database, `accidents/${accidentId}`)
    await update(accidentRef, {
      policeReport: reportText,
      policeReportDate: Date.now(),
      policeReportPersonnel: personnel,
    })

    console.log("[v0] Successfully saved police report")
  } catch (error) {
    console.error("[v0] Error saving police report:", error)
    throw error
  }
}

export async function updateUserLocation(userId: string, latitude: number, longitude: number) {
  try {
    const userLocationRef = ref(database, `users/${userId}/location`)
    await set(userLocationRef, {
      latitude,
      longitude,
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString(),
    })

    console.log("[v0] Updated user location:", { userId, latitude, longitude })
  } catch (error) {
    console.error("[v0] Error updating user location:", error)
    throw error
  }
}

export function listenToUserLocation(userId: string, callback: (location: any) => void) {
  try {
    const userLocationRef = ref(database, `users/${userId}/location`)

    const unsubscribe = onValue(userLocationRef, (snapshot) => {
      const location = snapshot.val()
      if (location) {
        console.log("[v0] User location update:", { userId, location })
        callback(location)
      }
    })

    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to user location:", error)
    return () => {}
  }
}

export async function getAllUserLocations(): Promise<Map<string, any>> {
  try {
    const usersRef = ref(database, "users")
    const snapshot = await get(usersRef)
    const data = snapshot.val()
    const userLocations = new Map<string, any>()

    if (data) {
      Object.entries(data).forEach(([userId, userData]: [string, any]) => {
        if (userData.location) {
          userLocations.set(userId, {
            userId,
            ...userData.location,
            name:
              userData.firstName && userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : userData.name || userId,
            phone: userData.phoneNumber || userData.phone || "N/A",
            email: userData.email || "N/A",
            status: userData.status || "offline",
            lastSeen: userData.lastSeen || Date.now(),
          })
        }
      })
    }

    console.log("[v0] Fetched all user locations:", userLocations.size)
    return userLocations
  } catch (error) {
    console.error("[v0] Error fetching user locations:", error)
    return new Map()
  }
}

export async function updateUserStatus(userId: string, status: "online" | "offline" | "busy") {
  try {
    const userStatusRef = ref(database, `users/${userId}/status`)
    await set(userStatusRef, status)

    const userLastSeenRef = ref(database, `users/${userId}/lastSeen`)
    await set(userLastSeenRef, Date.now())

    console.log("[v0] Updated user status:", { userId, status })
  } catch (error) {
    console.error("[v0] Error updating user status:", error)
    throw error
  }
}

export function listenToUserStatus(userId: string, callback: (status: string) => void) {
  try {
    const userStatusRef = ref(database, `users/${userId}/status`)

    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const status = snapshot.val() || "offline"
      callback(status)
    })

    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to user status:", error)
    return () => {}
  }
}

