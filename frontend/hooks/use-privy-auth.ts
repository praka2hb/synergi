"use client"

import { useContext } from "react"
import { PrivyAuthContext } from "@/context/privy-auth-context"

export function usePrivyAuth() {
  const context = useContext(PrivyAuthContext)
  if (context === undefined) {
    throw new Error("usePrivyAuth must be used within a PrivyAuthProvider")
  }
  return context
}

