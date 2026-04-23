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
import { Loader2, ArrowRight, User } from "lucide-react"
import { Toaster, toast } from "react-hot-toast"
import Link from "next/link"

interface UserData {
  uid: string
  isAdmin?: boolean
}

interface FormErrors {
  email?: string
  password?: string
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const router = useRouter()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validateForm = () => {
    const newErrors: FormErrors = {}
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      newErrors.email = "Email is required."
    } else if (!emailRegex.test(cleanEmail)) {
      newErrors.email = "Please enter a valid email address."
    }

    if (!password) {
      newErrors.password = "Password is required."
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return
    setResetMessage("")

    const isValid = validateForm()
    if (!isValid) {
      toast.error("Please fix the highlighted fields.")
      return
    }

    setLoading(true)

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
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later."
          break
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (loading) return

    const cleanEmail = email.trim().toLowerCase()
    setResetMessage("")
    setErrors((prev) => ({ ...prev, email: undefined }))

    if (!cleanEmail) {
      setErrors((prev) => ({ ...prev, email: "Email is required." }))
      toast.error("Please enter your email first.")
      return
    }

    if (!emailRegex.test(cleanEmail)) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address.",
      }))
      toast.error("Please enter a valid email address.")
      return
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail)
      setResetMessage("Password reset link sent! Please check your email.")
      toast.success("Password reset email sent!")
    } catch (error: any) {
      let errorMessage = "Failed to send password reset email."

      switch (error?.code) {
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address."
          break
        case "auth/user-not-found":
          errorMessage = "No account found with that email."
          break
        case "auth/too-many-requests":
          errorMessage = "Too many requests. Please try again later."
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

        <form onSubmit={handleSignIn} className="space-y-4" noValidate>
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
              onChange={(e) => {
                setEmail(e.target.value.replace(/\s/g, ""))
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }))
                }
              }}
              autoComplete="email"
              required
              disabled={loading}
              aria-invalid={!!errors.email}
              className="h-12 rounded-xl"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }))
                }
              }}
              autoComplete="current-password"
              required
              disabled={loading}
              aria-invalid={!!errors.password}
              className="h-12 rounded-xl"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}

            <div className="text-right mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-blue-600 text-sm font-semibold hover:underline disabled:opacity-50"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#173C94] hover:bg-[#1E4ABF] text-white font-semibold shadow-sm"
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

          <div className="pt-2">
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 font-medium tracking-wider">
                  OR
                </span>
              </div>
            </div>

            <Link
              href="https://insta-aid.vercel.app/auth/signin"
              className="group mt-4 flex w-full items-center justify-between rounded-xl border border-[#173C94]/20 bg-[#173C94]/5 px-4 py-3.5 text-[#173C94] font-semibold transition-all duration-200 hover:border-[#173C94] hover:bg-[#173C94]/10 hover:shadow-sm"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#173C94]/10">
                  <User className="h-5 w-5" />
                </span>
                <span>Sign in as User</span>
              </span>

              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}