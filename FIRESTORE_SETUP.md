# Firestore User Data Integration (Optional)

The admin system can optionally fetch user profile data from Firestore to display detailed information in accident details.

## Current Status

The system works without Firestore - it will show basic device information. Firestore integration is **optional** and only needed if you want to display user profiles.

## How It Works

When an accident is detected, the system tries to fetch user data from Firestore:
- If found: Displays user name, phone, email, emergency contacts, medical info
- If not found or permission denied: Falls back to basic device information

## Setting Up Firestore (Optional)

If you want to enable user profile display, you need to:

### 1. Update Firestore Security Rules

Go to Firebase Console → Firestore Database → Rules and add:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin dashboard to read user profiles
    match /users/{userId} {
      allow read: if true;  // Or add authentication if needed
      allow write: if false; // Admin dashboard only reads, doesn't write
    }
  }
}
\`\`\`

### 2. User Data Structure

Your mobile app should store user profiles in Firestore with this structure:

\`\`\`
users/{userId}/
  name: "John Doe"
  phone: "+1234567890"
  email: "john@example.com"
  emergencyContact: {
    name: "Jane Doe"
    phone: "+0987654321"
    relationship: "Spouse"
  }
  medicalInfo: {
    bloodType: "O+"
    allergies: ["Penicillin"]
    conditions: ["Diabetes"]
    medications: ["Insulin"]
  }
\`\`\`

### 3. Link Device to User

In your ESP32 or mobile app, set the userId in the accident data:

\`\`\`javascript
// When creating accident record
{
  deviceId: "DEVICE_001",
  userId: "actual-user-id-here",  // Link to Firestore user document
  timestamp: Date.now(),
  coordinates: "14.675,-121.043",
  status: "pending"
}
\`\`\`

## Without Firestore

The system works perfectly fine without Firestore setup. It will show:
- Device ID
- Coordinates
- Accelerometer data
- Battery level
- Timestamp

This is sufficient for basic accident monitoring.
