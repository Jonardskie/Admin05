"use client"

import { useState } from "react"
import type React from "react"
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { Toaster, toast } from "react-hot-toast"
import Link from "next/link"

interface UserData {
  uid: string
  isAdmin?: boolean
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setResetMessage("")

  try {
    const cleanEmail = email.trim().toLowerCase()

    let userCredential
    try {
      userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      )
    } catch (err: any) {
      // prevent Next.js error overlay
      throw { code: err?.code || "auth/unknown" }
    }

    const user = userCredential.user

    const userDocRef = doc(db, "users", user.uid)
    const userDocSnap = await getDoc(userDocRef)

    if (!userDocSnap.exists()) {
      await signOut(auth)
      toast.error("User record not found in Firestore.")
      return
    }

    const userData = userDocSnap.data() as UserData

    if (userData.isAdmin !== true) {
      await signOut(auth)
      toast.error("Access denied. Admins only.")
      return
    }

    const token = await user.getIdToken()

    document.cookie = `token=${token}; path=/; max-age=3600; samesite=strict`
    document.cookie = `isAdmin=true; path=/; max-age=3600; samesite=strict`

    toast.success("Admin signed in successfully!")
    router.push("/admin")

  } catch (error: any) {
    let errorMessage = "Login failed. Please try again."

    switch (error?.code) {
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address."
        break
      case "auth/user-not-found":
        errorMessage = "No admin account found."
        break
      case "auth/wrong-password":
        errorMessage = "Incorrect password."
        break
      case "auth/invalid-credential":
        errorMessage = "Invalid email or password."
        break
    }

    toast.error(errorMessage)
  } finally {
    setLoading(false)
  }
}

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      toast.error("Please enter your email first.")
      return
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail)
      setResetMessage("Password reset link sent! Please check your email.")
      toast.success("Password reset email sent!")
    } catch (error: any) {
      console.error("Password reset error:", error)

      let errorMessage = "Failed to send password reset email."

      switch (error?.code) {
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address."
          break
        case "auth/user-not-found":
          errorMessage = "No account found with that email."
          break
      }

      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Toaster />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-sm text-gray-600 mt-1">
            Sign in to access the InstaAid admin panel
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          {resetMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-600 text-sm">{resetMessage}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email
            </label>
            <Input
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-blue-600 text-sm font-semibold hover:underline"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#173C94] hover:bg-[#1E4ABF] text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in as Admin"
            )}
          </Button>
            <div className="text-center mt-4">
                <Link
                  href="https://admin-instaaid.vercel.app/admin/login"
                  className="block w-full mt-4 text-center py-3 rounded-lg text-[#173C94] font-semibold hover:underline"
                >
                  Sign in as User
                </Link>
              </div>
        </form>
      </div>
    </div>
  )
}