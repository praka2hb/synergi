"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
  isSidebarOpen: boolean
  isMobileSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  setIsMobileSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

interface SidebarProviderProps {
  children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev)
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(prev => !prev)

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        isMobileSidebarOpen,
        setIsSidebarOpen,
        setIsMobileSidebarOpen,
        toggleSidebar,
        toggleMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
