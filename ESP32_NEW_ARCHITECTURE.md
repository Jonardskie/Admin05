# ESP32 New Architecture Guide

## Overview
The ESP32 device has been updated to use a simpler Firebase structure with a trigger-based system.

## Firebase Structure

### Device Path: `device/`
\`\`\`json
{
  "status": "Normal" | "Accident Detected",
  "accel": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0
  },
  "battery": 100.0,
  "online": true,
  "lastSeen": 1234567890
}
\`\`\`

### Trigger Flag: `triggered`
\`\`\`json
{
  "triggered": true | false
}
\`\`\`

## How It Works

### 1. Accident Detection (ESP32)
- ESP32 continuously monitors accelerometer
- When acceleration > 25 m/s², sets `device/status` to "Accident Detected"
- Checks if `triggered` flag is false
- If false, sets `triggered` to true and sends alert
- If true, waits for admin to reset it

### 2. Admin Dashboard Response
- Dashboard listens to `device/` path
- When `device/status` = "Accident Detected" AND `triggered` = true:
  - Creates accident record in admin system
  - Shows accident in pending list
  - Displays on map with real-time data

### 3. Admin Actions
When admin takes action (dispatch, resolve, delete):
- Updates accident status in admin system
- **Resets `triggered` flag to false**
- ESP32 can now detect new accidents

## Key Benefits

1. **Simpler Structure**: No complex accident collections
2. **Real-time Sync**: Direct device status monitoring
3. **Prevents Duplicates**: Trigger flag prevents re-detection
4. **Admin Control**: Admin must acknowledge before new detection
5. **Clean Data**: No orphaned accident records

## Migration Notes

- Old accidents in `accidents/` collection are still supported
- System reads from both old and new structures
- New ESP32 devices use the simplified `device/` path
- Legacy devices continue to work with old structure

## Testing

1. **Trigger Accident**: Shake ESP32 to exceed 25 m/s²
2. **Check Dashboard**: Accident should appear in pending
3. **Dispatch/Resolve**: Take action on accident
4. **Verify Reset**: `triggered` flag should be false
5. **Test Again**: ESP32 should detect new accidents
