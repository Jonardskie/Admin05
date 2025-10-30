import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAxMScPcc4pR_0cFwiQ_xqPHBVieuzq-HY",
  authDomain: "accident-detection-4db90.firebaseapp.com",
  databaseURL: "https://accident-detection-4db90-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "accident-detection-4db90",
  storageBucket: "accident-detection-4db90.firebasestorage.app",
  messagingSenderId: "241082823017",
  appId: "1:241082823017:web:54fb429894447691114df8",
  measurementId: "G-TED67F7VHD",
}

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const database = getDatabase(app)
const firestore = getFirestore(app)

const rtdb = database
const db = firestore

export { app, database, firestore, rtdb, db }
