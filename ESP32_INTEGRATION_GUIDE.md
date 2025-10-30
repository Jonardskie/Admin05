#```markdown file="ESP32_INTEGRATION_GUIDE.md"
# ESP32 Integration Guide

## Problem Solved
This update fixes the issue where accidents kept resetting to "pending" status after being marked as dispatched or resolved. The admin system now properly reads from the ESP32's Firebase structure and persists status updates.

## Firebase Data Structure

### ESP32 Writes To:

\`\`\`
devices/
  DEVICE_001/
    status: "Normal" | "Accident Detected"
    accel: { x, y, z }
    battery: 100.0
    online: true
    lastSeen: timestamp
    triggered: true

accidents/
  [auto-generated-id]/
    deviceId: "DEVICE_001"
    timestamp: unix_timestamp
    coordinates: "14.675,-121.043"
    status: "pending"
    adminStatus: "Resolved" | "Help Dispatched" | "False Alarm" (added by admin)
    dispatchedPersonnel: ["PER001", "PER002"] (added by admin)
    dispatchedAt: timestamp (added by admin)
\`\`\`

## How It Works Now

1. **ESP32 Detects Accident**: Pushes new entry to `accidents/` collection
2. **Admin Reads**: Listens to `accidents/` and `devices/` collections in real-time
3. **Admin Updates Status**: Writes `adminStatus` field to the accident record
4. **Status Persists**: The `adminStatus` field overrides the original `status` field
5. **Manual Deletion**: Admin can delete accidents from any status (pending, dispatched, resolved)

## Key Changes

- Admin now reads from `accidents/` collection (ESP32 format)
- Status updates write to `adminStatus` field to prevent ESP32 from overwriting
- Delete function removes the entire accident record from Firebase
- Real-time listeners monitor both `accidents/` and `devices/` paths
- Backwards compatible with legacy root path format

## Testing

1. ESP32 detects accident → appears as "pending" in admin
2. Admin dispatches personnel → status changes to "dispatched" and stays
3. Admin marks resolved → status changes to "resolved" and stays
4. Refresh page → all statuses remain unchanged
5. Admin deletes accident → removed from Firebase completely

## Next Steps for ESP32 Code (Optional)

To prevent duplicate accident entries, you can modify the ESP32 to:
1. Check if an accident already exists before pushing a new one
2. Read the `adminStatus` field to see if accident has been processed
3. Only push new accidents if no unresolved accident exists for the device
