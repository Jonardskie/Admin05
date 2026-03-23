"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { getAuth } from "firebase/auth"
import { Bell, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface DashboardHeaderProps {
  onMenuClick: () => void
  activeAccidents: number
}

export function DashboardHeader({ onMenuClick, activeAccidents }: DashboardHeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const auth = getAuth()
      await signOut(auth)
      console.log("[v0] User signed out successfully")
      window.location.href = "http://localhost:3000"
    } catch (error) {
      console.error("[v0] Error signing out:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

          <div className="flex items-center gap-4">
                <div className="items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-sky-600 p-1">
                  <Image
                    src="/1.png"
                    alt="Logo"
                    width={50}
                    height={50}
                    className="object-contain rounded-full"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">InstaAid</h2>
                  <p className="text-xs text-muted-foreground">Admin Dashboard</p>
                </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {activeAccidents > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {activeAccidents}
              </Badge>
            )}
            <span className="sr-only">Notifications</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Admin User</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
                {isSigningOut ? "Signing out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
