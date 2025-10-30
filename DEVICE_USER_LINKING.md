# Device-to-User Linking Guide

## Overview
To display actual user information in accident details, your ESP32 device needs to include a `userId` field that links the device to a specific user in your Firestore database.

## ESP32 Code Update

Add a `userId` field to your device data in the ESP32 code:

\`\`\`cpp
// In your ESP32 setup, define the user ID for this device
String userId = "USER_ID_HERE"; // Replace with actual user ID from your mobile app

// When writing device data to Firebase
Firebase.setString(firebaseData, "/device/userId", userId);
\`\`\`

## Complete ESP32 Example

\`\`\`cpp
void setup() {
  // ... existing WiFi and Firebase setup ...
  
  // Set the user ID for this device
  // This should match a user document ID in your Firestore "users" collection
  String userId = "abc123"; // Get this from your mobile app during device pairing
  Firebase.setString(firebaseData, "/device/userId", userId);
}

void loop() {
  // ... existing accident detection code ...
  
  if (accidentDetected) {
    // Write device status
    Firebase.setString(firebaseData, "/device/status", "Accident Detected");
    Firebase.setString(firebaseData, "/device/userId", userId); // Include userId
    Firebase.setBool(firebaseData, "triggered", true);
    
    // ... rest of your code ...
  }
}
\`\`\`

## Firestore User Document Structure

Your Firestore database should have a `users` collection with documents structured like:

\`\`\`
users/
  abc123/  (user ID)
    name: "John Doe"
    phone: "+1234567890"
    email: "john@example.com"
    bloodType: "O+"
    allergies: ["Penicillin"]
    medicalInfo: "Diabetic, requires insulin"
    emergencyContact: {
      name: "Jane Doe"
      phone: "+1234567891"
      relationship: "Spouse"
    }
\`\`\`

## How It Works

1. **Device Pairing**: When a user pairs their device in your mobile app, store the user's ID in the device
2. **Accident Detection**: When the ESP32 detects an accident, it includes the `userId` in the device data
3. **Admin Dashboard**: The admin system reads the `userId` and fetches the user's profile from Firestore
4. **Display**: The accident details show the user's actual name, contact info, and medical information

## Testing

To test with your current setup:

1. Manually add a `userId` field to your device data in Firebase Realtime Database:
   \`\`\`
   device/
     userId: "test-user-123"
     status: "Normal"
     accel: {...}
     battery: 100
     ...
   \`\`\`

2. Create a matching user document in Firestore:
   \`\`\`
   users/
     test-user-123/
       name: "Test User"
       phone: "+1234567890"
       email: "test@example.com"
   \`\`\`

3. Trigger an accident on your ESP32

4. The admin dashboard will now display "Test User" instead of "device"

## Firestore Security Rules

Make sure your Firestore security rules allow the admin to read user data:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow admin dashboard to read user data
      allow read: if true;
      
      // Only allow users to write their own data
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

## Notes

- The `userId` should be set during device pairing in your mobile app
- Each device should be linked to one user
- If no `userId` is found, the system falls back to showing "device" as the user name
- Make sure the `userId` matches a document ID in your Firestore `users` collection
