# 📱 Mobile App Integration Instructions

## Overview
Your mobile app needs to tell the admin system which user is currently using the shared ESP32 device. This is done by writing the user's ID to Firebase Realtime Database.

## Step-by-Step Setup

### 1. Create the Device Service

Create a new file: `lib/device-service.ts` in your mobile app

Copy the code from `MOBILE_APP_INTEGRATION_CODE.tsx` (FILE 1)

### 2. Update Your Sign-In Page

Find your sign-in page (where users log in with email/password)

After successful authentication, add:

\`\`\`typescript
import { DeviceService } from "@/lib/device-service"

// After signInWithEmailAndPassword succeeds:
await DeviceService.assignUserToDevice(user.uid)
\`\`\`

### 3. Update Your Sign-Out Function

In your user profile page (or wherever you handle sign out), update the sign-out function:

\`\`\`typescript
import { DeviceService } from "@/lib/device-service"

const handleSignOut = async () => {
  // Remove user from device BEFORE signing out
  await DeviceService.removeUserFromDevice()
  await logout()
  router.push("/auth/signin")
}
\`\`\`

### 4. Optional: Auto-Assign on App Load

If you want to automatically assign the user when they open the app (if already signed in), add this to your dashboard or main layout:

\`\`\`typescript
useEffect(() => {
  if (user) {
    DeviceService.assignUserToDevice(user.uid)
  }
}, [user])
\`\`\`

## Testing

1. **Sign in** on your mobile app
2. **Check Firebase Realtime Database** → You should see:
   \`\`\`
   device/
     currentUserId: "abc123xyz"
     lastAssigned: "2025-01-14T10:30:00.000Z"
   \`\`\`
3. **Trigger an accident** on the ESP32
4. **Check admin dashboard** → The accident should show YOUR user information (name, phone, email, emergency contacts) instead of "device"
5. **Sign out** → Check Firebase → `currentUserId` should be removed

## How It Works

1. User signs in on mobile app → Mobile app writes their user ID to `device/currentUserId`
2. ESP32 detects accident → Writes to `device/status = "Accident Detected"`
3. Admin system reads `device/currentUserId` → Fetches that user's profile from Firestore
4. Admin dashboard displays the user's actual information in the accident details

## Troubleshooting

**Problem:** Admin still shows "device" instead of user info
- Check Firebase Realtime Database → Is `device/currentUserId` set?
- Check Firestore → Does a user document exist with that ID?
- Check browser console → Any errors fetching user data?

**Problem:** Permission denied when writing to device
- Check Firebase Realtime Database rules → Make sure authenticated users can write to `device/`
- Suggested rule:
  \`\`\`json
  {
    "rules": {
      "device": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
  \`\`\`

## Firebase Security Rules

Make sure your Realtime Database rules allow authenticated users to write to the device path:

\`\`\`json
{
  "rules": {
    "device": {
      ".read": true,
      ".write": "auth != null",
      "currentUserId": {
        ".validate": "newData.isString()"
      }
    }
  }
}
\`\`\`

## Next Steps

Once this is set up, the admin dashboard will automatically display the correct user's information when an accident is detected, including:
- Full name
- Phone number
- Email
- Address
- Emergency contact name and number
- Any medical information (if you add it to Firestore later)
