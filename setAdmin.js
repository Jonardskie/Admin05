// setAdmin.js
import admin from "firebase-admin";

// Path to your downloaded service account JSON
import serviceAccount from "./accident-detection-4db90-firebase-adminsdk-fbsvc-29429e2f6b.json" assert { type: "json" };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Replace with the UID of the user you want to make admin
const uid = "NTpDGjYfbCg4j3ikiD9aA1v9xwO2";

async function makeAdmin() {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ User ${uid} is now an admin!`);
  } catch (error) {
    console.error("❌ Error assigning admin claim:", error);
  }
}

makeAdmin();
