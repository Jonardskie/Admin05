"use client"

// ============================================
// 📱 MOBILE APP INTEGRATION CODE
// ============================================
// Add these files to your mobile app to link users to the device

// ============================================
// FILE 1: lib/device-service.ts
// ============================================
// Create this new file in your mobile app

import { ref, set, remove } from "firebase/database"
import { rtdb } from "@/lib/firebase" // Your existing Firebase config

export class DeviceService {
  private static deviceRef = ref(rtdb, "device")

  /**
   * Assigns the current user to the shared device
   * Call this when user signs in or starts using the device
   */
  static async assignUserToDevice(userId: string): Promise<void> {
    try {
      await set(ref(rtdb, "device/currentUserId"), userId)
      await set(ref(rtdb, "device/lastAssigned"), new Date().toISOString())
      console.log(`✅ User ${userId} assigned to device`)
    } catch (error) {
      console.error("❌ Error assigning user to device:", error)
      throw error
    }
  }

  /**
   * Removes the current user from the device
   * Call this when user signs out
   */
  static async removeUserFromDevice(): Promise<void> {
    try {
      await remove(ref(rtdb, "device/currentUserId"))
      await set(ref(rtdb, "device/lastAssigned"), new Date().toISOString())
      console.log("✅ User removed from device")
    } catch (error) {
      console.error("❌ Error removing user from device:", error)
      throw error
    }
  }

  /**
   * Check if a user is currently assigned to the device
   */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const { get } = await import("firebase/database")
      const snapshot = await get(ref(rtdb, "device/currentUserId"))
      return snapshot.exists() ? snapshot.val() : null
    } catch (error) {
      console.error("❌ Error getting current user:", error)
      return null
    }
  }
}
