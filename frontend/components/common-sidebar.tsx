"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  Bot,
  MessageSquare,
  Settings,
  Plus,
  Clock,
  SunMoon,
  Menu,
  X,
  LogIn,
  LogOut,
  Loader2,
  MoreHorizontal,
  Trash2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import SynergiLogo from "@/components/synergi-logo"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"
import { useSidebar } from "@/context/sidebar-context"
import { useRouter } from "next/navigation"

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage?: {
    content: string
    createdAt: string
  }
}

interface CommonSidebarProps {
  // Page identification
  currentPage: "chat" | "agents"

  // Chat-specific props
  conversations?: Conversation[]
  currentConversationId?: string | null
  isLoadingConversations?: boolean
  selectConversation?: (conversation: Conversation) => void
  startNewChat?: () => void
  deleteConversation?: (conversationId: string) => void

  // View switching (for unified page)
  onSwitchToChat?: () => void
  onSwitchToAgents?: () => void
}

export default function CommonSidebar({
  currentPage,
  conversations = [],
  currentConversationId = null,
  isLoadingConversations = false,
  selectConversation,
  startNewChat,
  deleteConversation,
  onSwitchToChat,
  onSwitchToAgents
}: CommonSidebarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const { isSidebarOpen, isMobileSidebarOpen, setIsSidebarOpen, setIsMobileSidebarOpen } = useSidebar()
  const router = useRouter()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  const handleNavigation = (page: "chat" | "agents") => {
    if (page === "chat") {
      if (onSwitchToChat) {
        onSwitchToChat()
      } else {
        router.push('/chat')
      }
    } else if (page === "agents") {
      if (onSwitchToAgents) {
        onSwitchToAgents()
      } else {
        // Fallback for when we still have separate pages
        router.push('/agents')
      }
    }
  }

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 shadow-lg transition-all duration-500 ease-in-out z-50 ${
        isMobileSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0 md:w-16"
      } ${!isMobileSidebarOpen && isSidebarOpen ? "md:w-64" : ""} ${
        !isMobileSidebarOpen && !isSidebarOpen ? "md:cursor-ew-resize md:hover:bg-gray-100/50 md:dark:hover:bg-neutral-700/50" : ""
      }`}
      onClick={() => {
        if (!isMobileSidebarOpen && !isSidebarOpen) {
          setIsSidebarOpen(true);
        }
      }}
      title={!isMobileSidebarOpen && !isSidebarOpen ? "Click to expand sidebar" : ""}
    >
      <div
        className="flex flex-col h-full"
        onClick={(e) => {
          if (!isMobileSidebarOpen && isSidebarOpen) {
            e.stopPropagation();
          }
        }}
      >
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white dark:bg-neutral-700 rounded-lg shadow-sm">
                <SynergiLogo width={24} height={24} className="flex-shrink-0" />
              </div>
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Synergi</h2>
                  <p className="text-xs text-muted-foreground">Multi-Agent Chat</p>
                </div>
              )}
            </div>
            {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
              <div className="flex items-center gap-1">
                {isMobileSidebarOpen && (
                  <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md" onClick={() => setIsMobileSidebarOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {!isMobileSidebarOpen && isSidebarOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-ew-resize hidden md:flex h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md"
                    onClick={() => setIsSidebarOpen(false)}
                    title="Collapse sidebar"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {currentPage === "chat" ? (
          <>
            {/* Navigation Items */}
            <div className="px-4 py-2 space-y-1">
              {/* New Chat Button */}
              <Button
                className={`${isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen) ? "w-full justify-start px-3 py-2 h-auto" : "w-10 h-10 p-0"}
                      bg-teal-50 hover:bg-teal-100 text-gray-800 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white border-0 rounded-lg transition-all duration-200`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (startNewChat) startNewChat();
                }}
              >
                <Plus className="w-4 h-4" />
                {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                  <span className="ml-2 text-sm font-medium">New Chat</span>
                )}
              </Button>

              {/* Agents Button */}
              <Button
                variant="ghost"
                className={`${isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen) ? "w-full justify-start px-3 py-2 h-auto" : "w-10 h-10 p-0"}
                      hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-all duration-200`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSwitchToAgents) {
                    onSwitchToAgents();
                  } else {
                    handleNavigation("agents");
                  }
                }}
              >
                <Bot className="w-4 h-4" />
                {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                  <span className="ml-2 text-sm">Agents</span>
                )}
              </Button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <div className="px-4 pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">Recent Chats</h3>
                    {isLoadingConversations && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                  </div>
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                                          <div
                      key={conversation.id}
                      className={`group px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200 hover:shadow-sm relative ${
                        currentConversationId === conversation.id
                          ? "bg-teal-50 dark:bg-teal-900/20"
                          : "hover:bg-teal-50/60 dark:hover:bg-teal-900/10"
                      }`}
                      onClick={() => selectConversation && selectConversation(conversation)}
                      title={conversation.title || 'New Conversation'}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-medium truncate pr-2 transition-colors duration-200 ${
                          currentConversationId === conversation.id
                            ? "text-teal-700 dark:text-teal-300"
                            : "text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400"
                        }`}>
                          {conversation.title || 'New Conversation'}
                        </h4>
                        <div className="flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (deleteConversation) deleteConversation(conversation.id)
                                }}
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/20"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                        {/* Right side teal gradient highlight indicator */}
                        <div className={`absolute top-0 right-0 w-full h-full rounded-md transition-all duration-200 pointer-events-none ${
                          currentConversationId === conversation.id
                            ? "bg-gradient-to-l from-teal-500/20 via-teal-500/10 to-transparent"
                            : "opacity-0 group-hover:opacity-100 group-hover:bg-gradient-to-l group-hover:from-teal-400/15 group-hover:via-teal-400/8 group-hover:to-transparent"
                        }`} />
                      </div>
                    ))}
                    {conversations.length === 0 && !isLoadingConversations && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No conversations yet.<br />Start a new chat to begin!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Agents Page Navigation */
          <div className="flex-1 px-4 py-2 space-y-1">
            {/* Chat Button */}
            <Button
              variant="ghost"
              className={`${isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen) ? "w-full justify-start px-3 py-2 h-auto" : "w-10 h-10 p-0"}
                    hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-all duration-200`}
              onClick={(e) => {
                e.stopPropagation();
                if (onSwitchToChat) {
                  onSwitchToChat();
                } else {
                  handleNavigation("chat");
                }
              }}
            >
              <MessageSquare className="w-4 h-4" />
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <span className="ml-2 text-sm">Chat</span>
              )}
            </Button>

            {/* Agents Button - Active */}
            <Button
              variant="ghost"
              className={`${isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen) ? "w-full justify-start px-3 py-2 h-auto" : "w-10 h-10 p-0"}
                    bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded-lg transition-all duration-200`}
              onClick={(e) => {
                e.stopPropagation();
                // Already on agents page
              }}
            >
              <Bot className="w-4 h-4" />
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <span className="ml-2 text-sm font-medium">Agents</span>
              )}
            </Button>

            {/* Settings Button */}
            <Button
              variant="ghost"
              className={`${isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen) ? "w-full justify-start px-3 py-2 h-auto" : "w-10 h-10 p-0"}
                    hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-all duration-200`}
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Navigate to settings
              }}
            >
              <Settings className="w-4 h-4" />
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <span className="ml-2 text-sm">Settings</span>
              )}
            </Button>
          </div>
        )}

        {/* User Controls */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-full justify-end">
              {mounted && (
                <>
                  {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                    isAuthenticated && user ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-center w-full bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-800 dark:text-gray-200 font-medium"
                        onClick={logout}
                        title="Sign out"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                      </Button>
                    ) : (
                      <AuthModal>
                        <Button
                          variant="default"
                          size="sm"
                          className="justify-center w-full bg-neutral-700 hover:bg-neutral-600 text-white dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600 font-medium shadow-sm"
                          title="Sign in to your account"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Login
                        </Button>
                      </AuthModal>
                    )
                  )}
                  {!isMobileSidebarOpen && !isSidebarOpen && isAuthenticated && user && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2"
                        onClick={logout}
                        title="Sign out"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
