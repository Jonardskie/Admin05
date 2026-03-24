// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxMScPcc4pR_0cFwiQ_xqPHBVieuzq-HY",
  authDomain: "accident-detection-4db90.firebaseapp.com",
  databaseURL:
    "https://accident-detection-4db90-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "accident-detection-4db90",
  storageBucket: "accident-detection-4db90.firebasestorage.app",
  messagingSenderId: "241082823017",
  appId: "1:241082823017:web:54fb429894447691114df8",
  measurementId: "G-TED67F7VHD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (named `db` because your code expects `db` to be Firestore)
export const db = getFirestore(app);

// Initialize Realtime Database (exposed as `rtdb`)
export const rtdb = getDatabase(app);

// Initialize Auth
export const auth = getAuth(app);

// Analytics only in browser (optional)
let analytics;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    // ignore analytics initialization errors in non-supported environments
    console.warn("Analytics not initialized:", e);
  }
}

export default app;
