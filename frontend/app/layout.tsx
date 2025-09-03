import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"
import { SidebarProvider } from "@/context/sidebar-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Synergi | Talk to Multiple Agents",
  description:
    "Experience seamless conversations with specialized AI agents. Get instant, accurate answers from weather, code, translation, and more AI experts in one chat.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
    other: {
      rel: "icon",
      url: "/favicon.ico",
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <AuthProvider>
          <SidebarProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              storageKey="synergi-theme"
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
