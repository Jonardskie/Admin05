# Complete Mobile App Integration Guide

This guide contains all the files and code you need to add to your mobile app to link users to the ESP32 device.

---

## File 1: Create `lib/device-service.ts`

Create this new file in your mobile app:

**Location:** `lib/device-service.ts`

\`\`\`typescript
import { getDatabase, ref, update, serverTimestamp } from 'firebase/database';
import { app } from './firebase-config'; // Adjust path to your Firebase config

class DeviceService {
  private static deviceRef = ref(getDatabase(app), 'device');

  /**
   * Assigns the current user to the shared device
   * Call this when a user signs in or starts using the device
   */
  static async assignUserToDevice(userId: string): Promise<void> {
    try {
      await update(this.deviceRef, {
        currentUserId: userId,
        lastAssigned: serverTimestamp(),
      });
      console.log('[DeviceService] User assigned to device:', userId);
    } catch (error) {
      console.error('[DeviceService] Error assigning user to device:', error);
      throw error;
    }
  }

  /**
   * Removes the current user from the device
   * Call this when a user signs out
   */
  static async removeUserFromDevice(): Promise<void> {
    try {
      await update(this.deviceRef, {
        currentUserId: null,
        lastAssigned: serverTimestamp(),
      });
      console.log('[DeviceService] User removed from device');
    } catch (error) {
      console.error('[DeviceService] Error removing user from device:', error);
      throw error;
    }
  }

  /**
   * Gets the current user assigned to the device
   */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const { get } = await import('firebase/database');
      const snapshot = await get(this.deviceRef);
      const data = snapshot.val();
      return data?.currentUserId || null;
    } catch (error) {
      console.error('[DeviceService] Error getting current user:', error);
      return null;
    }
  }
}

export default DeviceService;
\`\`\`

---

## File 2: Update Your Sign-In Page

Add this code to your sign-in page (wherever you handle user login):

\`\`\`typescript
import DeviceService from '@/lib/device-service';

// Inside your sign-in function, after successful authentication:
const handleSignIn = async (email: string, password: string) => {
  try {
    // Your existing sign-in code
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ADD THIS: Assign user to device
    await DeviceService.assignUserToDevice(user.uid);

    // Continue with your existing navigation/logic
    router.push('/profile'); // or wherever you navigate after login
  } catch (error) {
    console.error('Sign in error:', error);
    // Handle error
  }
};
\`\`\`

---

## File 3: Update Your Sign-Up Page

Add this code to your sign-up page after successful registration:

\`\`\`typescript
import DeviceService from '@/lib/device-service';

// Inside your sign-up function, after creating the user:
const handleSignUp = async (userData: any) => {
  try {
    // Your existing sign-up code
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    const user = userCredential.user;

    // Create user document in Firestore (your existing code)
    await setDoc(doc(db, 'users', user.uid), {
      // ... your user data
    });

    // ADD THIS: Assign user to device
    await DeviceService.assignUserToDevice(user.uid);

    // Continue with your existing logic
    router.push('/profile');
  } catch (error) {
    console.error('Sign up error:', error);
    // Handle error
  }
};
\`\`\`

---

## File 4: Update Your Sign-Out Function

Add this code wherever you handle user sign-out:

\`\`\`typescript
import DeviceService from '@/lib/device-service';

const handleSignOut = async () => {
  try {
    // ADD THIS FIRST: Remove user from device
    await DeviceService.removeUserFromDevice();

    // Then your existing sign-out code
    await signOut(auth);
    
    // Navigate to login page
    router.push('/login');
  } catch (error) {
    console.error('Sign out error:', error);
    // Handle error
  }
};
\`\`\`

---

## File 5: Update Your Profile Page (Optional)

If you want to show which user is currently assigned to the device on the profile page:

\`\`\`typescript
import DeviceService from '@/lib/device-service';
import { useEffect, useState } from 'react';

// Inside your profile component:
const [isAssignedToDevice, setIsAssignedToDevice] = useState(false);

useEffect(() => {
  const checkDeviceAssignment = async () => {
    const currentUserId = await DeviceService.getCurrentUserId();
    setIsAssignedToDevice(currentUserId === user?.uid);
  };
  
  checkDeviceAssignment();
}, [user]);

// Display in your UI:
{isAssignedToDevice && (
  <div className="bg-green-100 p-4 rounded">
    ✓ You are currently assigned to the device
  </div>
)}
\`\`\`

---

## File 6: Update Your App Layout (Optional - Auto-assign on app load)

If you want to automatically assign the user to the device when they open the app (if already logged in):

\`\`\`typescript
// In your root layout or app component:
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';
import DeviceService from '@/lib/device-service';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in, assign to device
      await DeviceService.assignUserToDevice(user.uid);
    } else {
      // User is signed out, remove from device
      await DeviceService.removeUserFromDevice();
    }
  });

  return () => unsubscribe();
}, []);
\`\`\`

---

## Testing the Integration

### Step 1: Verify Firebase Setup
Make sure your mobile app's Firebase config includes Realtime Database:

\`\`\`typescript
// lib/firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database'; // ADD THIS

const firebaseConfig = {
  // ... your config
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app); // ADD THIS
\`\`\`

### Step 2: Test the Flow
1. Sign in on your mobile app with a user account
2. Open Firebase Console → Realtime Database
3. You should see:
   \`\`\`
   device/
     currentUserId: "abc123xyz" (the user's Firebase Auth UID)
     lastAssigned: 1234567890
   \`\`\`
4. Trigger an accident on the ESP32
5. Check the admin dashboard - it should show the user's actual information

### Step 3: Verify User Data in Firestore
Make sure your Firestore has user documents at `users/{uid}` with fields like:
- firstName
- lastName
- email
- phoneNumber
- emergencyName
- emergencyNumber
- address

---

## Troubleshooting

### Issue: "Permission denied" error
**Solution:** Update your Firebase Realtime Database rules:
\`\`\`json
{
  "rules": {
    "device": {
      ".read": true,
      ".write": true
    }
  }
}
\`\`\`

### Issue: User data not showing in admin
**Solution:** 
1. Check that the user document exists in Firestore at `users/{uid}`
2. Verify the `currentUserId` in Realtime Database matches the Firestore document ID
3. Check Firestore security rules allow reading user documents

### Issue: currentUserId is null
**Solution:**
1. Make sure you're calling `DeviceService.assignUserToDevice()` after successful login
2. Check the Firebase Console to verify the data is being written
3. Check browser console for any errors

---

## Summary

**Files to create:**
1. `lib/device-service.ts` - The device service utility

**Files to modify:**
1. Sign-in page - Add `DeviceService.assignUserToDevice(user.uid)` after login
2. Sign-up page - Add `DeviceService.assignUserToDevice(user.uid)` after registration
3. Sign-out function - Add `DeviceService.removeUserFromDevice()` before sign out
4. Firebase config - Ensure Realtime Database is imported

Once implemented, the admin dashboard will automatically display the correct user's information when an accident is detected!
