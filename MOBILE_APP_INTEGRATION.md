# Mobile App Integration Guide

## Overview
This admin system works with ONE physical ESP32 device shared by MULTIPLE users who register in your mobile app.

## How It Works

### 1. User Registration (Mobile App)
Users register in your mobile app with their profile information:
- Name, phone, email
- Emergency contacts
- Medical information (blood type, allergies, conditions)

This data is stored in **Firestore** under the `users` collection:
\`\`\`
users/
  {userId}/
    name: "John Doe"
    phone: "+1234567890"
    email: "john@example.com"
    emergencyContact: {...}
    medicalInfo: {...}
    bloodType: "O+"
    allergies: [...]
\`\`\`

### 2. Device Check-In (Mobile App)
When a user starts using the ESP32 device, your mobile app must write their userId to the Realtime Database:

\`\`\`javascript
// In your mobile app (React Native, Flutter, etc.)
import { getDatabase, ref, update } from 'firebase/database';

async function checkInUser(userId) {
  const db = getDatabase();
  const deviceRef = ref(db, 'device');
  
  await update(deviceRef, {
    currentUserId: userId  // Set the current user
  });
  
  console.log('User checked in:', userId);
}
\`\`\`

### 3. Accident Detection (ESP32)
The ESP32 detects an accident and writes to Firebase:
\`\`\`
device/
  status: "Accident Detected"
  currentUserId: "user123"  // Set by mobile app
  accel: {x, y, z}
  battery: 100
  online: true
  lastSeen: timestamp
\`\`\`

### 4. Admin Dashboard (This App)
The admin system:
1. Reads the `currentUserId` from the device data
2. Creates an accident record with that userId
3. Fetches the user's profile from Firestore
4. Displays the user's actual information in the accident details

## Required Mobile App Changes

### Set currentUserId When User Starts Using Device
\`\`\`javascript
// When user logs in or starts a session
await checkInUser(currentUser.uid);
\`\`\`

### Clear currentUserId When User Stops Using Device
\`\`\`javascript
// When user logs out or ends session
const deviceRef = ref(db, 'device');
await update(deviceRef, {
  currentUserId: null
});
\`\`\`

## Firestore Security Rules

Update your Firestore security rules to allow the admin to read user data:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow users to read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow admin to read all user data (for accident details)
      allow read: if request.auth != null;
    }
  }
}
\`\`\`

## Testing

1. Register a user in your mobile app
2. Have the mobile app set `device/currentUserId` to that user's ID
3. Trigger an accident on the ESP32
4. Check the admin dashboard - it should show the user's actual information

## Troubleshooting

**Problem:** Accident shows "device" instead of user name
- **Solution:** Make sure your mobile app is writing `currentUserId` to `device/` path

**Problem:** "Missing or insufficient permissions" error
- **Solution:** Update Firestore security rules to allow admin read access

**Problem:** User data not showing
- **Solution:** Verify the userId in the accident matches a document in Firestore `users` collection
