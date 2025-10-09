"use client"

import { createContext, useState, useEffect, ReactNode, useCallback } from "react"
import { usePrivy } from '@privy-io/react-auth';
import { toast } from "sonner";

interface User {
  id: string
  email?: string
  name?: string
  walletAddress?: string
  privyId?: string
}

interface PrivyAuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => void
  syncUser: () => Promise<void>
}

export const PrivyAuthContext = createContext<PrivyAuthContextType | undefined>(undefined)

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user: privyUser, login: privyLogin, logout: privyLogout } = usePrivy();
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  // Sync Privy user to our database
  const syncUser = useCallback(async () => {
    if (!privyUser) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      // Extract user data from Privy (email only)
      const privyId = privyUser.id;
      const email = privyUser.email?.address;

      // Sync to our backend
      const response = await fetch(`${apiUrl}/api/privy/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId,
          email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("auth-token", data.token);
        toast.success("Successfully authenticated!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to sync user");
        privyLogout();
      }
    } catch (error) {
      console.error("Failed to sync user:", error);
      toast.error("Failed to sync user data");
      privyLogout();
    } finally {
      setIsLoading(false);
    }
  }, [privyUser, privyLogout]);

  // Sync user when Privy authentication changes
  useEffect(() => {
    if (ready) {
      if (authenticated && privyUser) {
        syncUser();
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem("auth-token");
        setIsLoading(false);
      }
    }
  }, [ready, authenticated, privyUser, syncUser]);

  // Restore token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth-token");
    if (storedToken && !authenticated) {
      setToken(storedToken);
      // We'll let Privy handle the authentication state
    }
  }, [authenticated]);

  const handleLogin = () => {
    privyLogin();
  };

  const handleLogout = () => {
    localStorage.removeItem("auth-token");
    setToken(null);
    setUser(null);
    privyLogout();
  };

  const value = {
    user,
    token,
    isLoading: !ready || isLoading,
    isAuthenticated: authenticated && !!user,
    login: handleLogin,
    logout: handleLogout,
    syncUser,
  }

  return <PrivyAuthContext.Provider value={value}>{children}</PrivyAuthContext.Provider>
}

