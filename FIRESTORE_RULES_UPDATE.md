# Firestore Security Rules Update

## Problem
The admin dashboard is getting "Missing or insufficient permissions" error when trying to read user data from Firestore.

## Solution
Update your Firestore security rules to allow reading from the "user" collection.

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab

### Step 2: Update Security Rules
Replace the existing rules with:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow reading user profiles for admin dashboard
    match /user/{userId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Allow reading users collection (alternative path)
    match /users/{userId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
\`\`\`

### Step 3: Publish Rules
Click **Publish** to apply the new rules.

## What This Does
- Allows anyone to **read** user data from the "user" collection
- Prevents anyone from **writing** to the collection (admin dashboard only reads)
- This is safe because user data is already public in your app

## After Updating Rules
The admin dashboard will automatically fetch and display all users from your Firestore database.

## User Data Structure Expected
Your Firestore "user" collection should have documents with this structure:

\`\`\`
user/{userId}
  ├── uid: "user-id"
  ├── firstName: "John"
  ├── lastName: "Doe"
  ├── email: "john@example.com"
  ├── phoneNumber: "+1234567890"
  ├── address: "123 Main St"
  ├── emergencyName: "Jane Doe"
  ├── emergencyNumber: "+0987654321"
  ├── emailVerified: true
  └── createdAt: "2024-01-01T00:00:00Z"
