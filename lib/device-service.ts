// This is a reference implementation for the admin system
// The mobile app will write to device/currentUserId
// This file documents the expected structure

import { ref, get } from "firebase/database"
import { rtdb } from "./firebase-config"

/**
 * Expected structure in Realtime Database after mobile app integration:
 *
 * device/
 *   currentUserId: "abc123xyz" (Firebase Auth UID of current user)
 *   lastAssigned: "2025-01-14T10:30:00.000Z"
 *   status: "Normal" or "Accident Detected"
 *   accelX: 0.5
 *   accelY: 0.3
 *   accelZ: 9.8
 *   latitude: 14.6750
 *   longitude: 121.0430
 *   battery: 85
 *   online: true
 *   lastSeen: "2025-01-14T10:30:00.000Z"
 */

export async function getCurrentDeviceUserId(): Promise<string | null> {
  try {
    const snapshot = await get(ref(rtdb, "device/currentUserId"))
    return snapshot.exists() ? snapshot.val() : null
  } catch (error) {
    console.error("Error getting current device user:", error)
    return null
  }
}
