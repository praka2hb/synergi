"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, User, Zap, Code, Search, Plus, Clock, SunMoon, Menu, X, LogIn, LogOut, PanelRightClose } from "lucide-react"

import { useTheme } from "next-themes"
import SynergiLogo from "@/components/synergi-logo"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"

interface Message {
  id: string
  content: string
  sender: "user" | "agent"
  agentType?: string
  agentName?: string
  timestamp: Date
}

interface Agent {
  id: string
  name: string
  icon: React.ReactNode
  keywords: string[]
  description: string
}

const agents: Agent[] = [
  {
    id: "general",
    name: "General AI",
    icon: <Bot className="w-4 h-4" />,
    keywords: ["general", "help", "question", "what", "how", "why", "explain"],
    description: "General purpose assistant",
  },
  {
    id: "creative",
    name: "Creative AI",
    icon: <Zap className="w-4 h-4" />,
    keywords: ["write", "creative", "story", "poem", "design", "art", "brainstorm", "idea"],
    description: "Creative writing and ideas",
  },
  {
    id: "technical",
    name: "Technical AI",
    icon: <Code className="w-4 h-4" />,
    keywords: ["code", "programming", "debug", "technical", "software", "development", "api", "function"],
    description: "Code and technical help",
  },
  {
    id: "research",
    name: "Research AI",
    icon: <Search className="w-4 h-4" />,
    keywords: ["research", "analyze", "data", "study", "information", "facts", "statistics", "compare"],
    description: "Research and analysis",
  },
]

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

const sampleChatHistory: ChatHistory[] = [
  {
    id: "1",
    title: "Code Review Help",
    lastMessage: "Can you review my React component?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "2",
    title: "Creative Writing",
    lastMessage: "Help me write a short story about...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "3",
    title: "Data Analysis",
    lastMessage: "Analyze this dataset for trends",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
]

const selectAgentForQuery = (query: string): Agent => {
  const lowerQuery = query.toLowerCase()

  for (const agent of agents) {
    if (agent.keywords.some((keyword) => lowerQuery.includes(keyword))) {
      return agent
    }
  }

  return agents[0] // Default to general AI
}


export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use next-themes for theme management
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Auth state
  const { user, isAuthenticated, logout } = useAuth()
  
  // Modal state to prevent sidebar interactions
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Ensure component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const selectedAgent = selectAgentForQuery(inputValue)

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I'm ${selectedAgent.name}, automatically selected to help with your query. ${selectedAgent.description}. I'd be happy to assist you with: "${userMessage.content}". This is a demo response showing how I would help you.`,
        sender: "agent",
        agentType: selectedAgent.id,
        agentName: selectedAgent.name,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, agentMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getAgentInfo = (agentType?: string) => {
    return agents.find((agent) => agent.id === agentType) || agents[0]
  }

  return (
    <div
      className="h-screen relative flex bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-white transition-colors overflow-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      <div
        className={`fixed left-0 top-0 h-full bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 shadow-lg transition-all duration-300 z-50 ${
          isMobileSidebarOpen ? "w-80 translate-x-0" : "w-80 -translate-x-full md:translate-x-0 md:w-16"
        } ${!isMobileSidebarOpen && isSidebarOpen ? "md:w-80" : ""} ${
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
            // Prevent click from bubbling up when sidebar is expanded
            if (!isMobileSidebarOpen && isSidebarOpen) {
              e.stopPropagation();
            }
          }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center relative">
                <SynergiLogo width={36} height={36} className="flex-shrink-0" />
              </div>
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground">Synergi AI</h2>
                  <p className="text-xs text-muted-foreground">Multi-Agent Chat</p>
                </div>
              )}
              {isMobileSidebarOpen && (
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMobileSidebarOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              {!isMobileSidebarOpen && isSidebarOpen && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="cursor-ew-resize hidden md:flex"
                  onClick={() => setIsSidebarOpen(false)}
                  title="Collapse sidebar"
                >
                  <PanelRightClose className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-gray-200/50 dark:border-neutral-700/50">
            <Button
              className={`${isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen) ? "w-full justify-start" : "w-10 h-10 p-0"} 
                    bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-neutral-600 hover:border-gray-400/40 transition-colors`}
              variant="outline"
              onClick={(e) => {
                e.stopPropagation(); // Prevent sidebar expansion when clicking the button
                // Add new chat logic here
              }}
            >
              <Plus className="w-4 h-4" />
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <span className="ml-2">New Chat</span>
              )}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
              <div className="px-4 pb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Chats
                </h3>
                <div className="space-y-2">
                  {sampleChatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className="p-3 rounded-lg bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 hover:border-gray-400/40 cursor-pointer transition-colors"
                    >
                      <h4 className="text-sm font-medium text-foreground truncate">{chat.title}</h4>
                      <p className="text-xs text-muted-foreground truncate mt-1">{chat.lastMessage}</p>
                      <p className="text-xs text-muted-foreground mt-1">{chat.timestamp.toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
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
                        <AuthModal onOpenChange={setIsModalOpen}>
                          <Button
                            variant="default"
                            size="sm"
                            className={`justify-center w-full bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 font-medium shadow-sm ${!isSidebarOpen && !isMobileSidebarOpen ? 'px-0' : ''}`}
                            title="Sign in to your account"
                          >
                            <LogIn className="w-4 h-4 ${isSidebarOpen || isMobileSidebarOpen ? 'mr-2' : ''}" />
                            {(isMobileSidebarOpen || isSidebarOpen) && <span>Login</span>}
                          </Button>
                        </AuthModal>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-30 md:hidden bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-gray-200 dark:border-neutral-700"
        onClick={() => setIsMobileSidebarOpen(true)}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Top-right fixed controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-transparent hover:bg-transparent focus-visible:ring-0 focus:outline-none text-gray-800 dark:text-gray-100"
            onClick={toggleTheme}
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            <SunMoon className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className={`flex-1 relative z-10 h-screen flex p-2 sm:p-4 pt-16 md:pt-4 transition-all duration-300 ${
        !isMobileSidebarOpen ? (isSidebarOpen ? "md:ml-80" : "md:ml-16") : ""
      }`}>
        <div className="w-full h-full flex flex-col bg-gray-200 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
          <div className="flex-1 flex flex-col px-2 sm:px-4 md:px-8 py-4 sm:py-8 min-h-0">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center overflow-y-auto">
                <div className="text-center space-y-6 sm:space-y-8 w-full max-w-3xl mx-auto">
                  <div className="space-y-4">
                    <div className="inline-flex">
                      <SynergiLogo width={48} height={48} className="sm:w-16 sm:h-16" />
                    </div>
                    {/* <p className="text-base sm:text-lg text-muted-foreground">How can I help you today?</p> */}
                  </div>

                  <div className="grid max-w-4xl mx-auto">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                      className="[grid-area:1/1] w-full pr-12 sm:pr-14 pb-12 sm:pb-14 pt-4 sm:pt-5 text-sm sm:text-base rounded-xl sm:rounded-2xl focus:outline-none text-gray-900 dark:text-white resize-none min-h-[4rem] sm:min-h-[5rem] max-h-[10rem] sm:max-h-[12rem] overflow-y-auto placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-colors bg-white dark:bg-neutral-800"
                      disabled={isTyping}
                    />
                    <div className="[grid-area:1/1] pointer-events-none flex items-end justify-end p-2 sm:p-3">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isTyping}
                        className="pointer-events-auto text-white bg-accent-foreground h-4 w-4 sm:h-8 sm:w-8 hover:bg-accent-foreground cursor-pointer"
                      >
                        <Send className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-4">
                    <p>I'll automatically choose the best AI agent for your question</p>
                    {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-2xl mx-auto mt-6 sm:mt-8">
                      <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 mx-auto mb-1 sm:mb-2" />
                        <p className="text-xs text-muted-foreground">Creative AI</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <Code className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 mx-auto mb-1 sm:mb-2" />
                        <p className="text-xs text-muted-foreground">Technical AI</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 mx-auto mb-1 sm:mb-2" />
                        <p className="text-xs text-muted-foreground">Research AI</p>
                      </div>
                      <div className="text-center p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 mx-auto mb-1 sm:mb-2" />
                        <p className="text-xs text-muted-foreground">General AI</p>
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center min-h-0">
                <div className="flex-1 w-full max-w-3xl overflow-y-auto space-y-3 sm:space-y-4 py-2 sm:py-4 px-1 sm:px-2 min-h-0">
                  {messages.map((message) => {
                    const agentInfo = getAgentInfo(message.agentType)
                    return (
                      <div key={message.id}>
                        {message.sender === "user" ? (
                          <div className="flex gap-2 sm:gap-3 justify-end items-end">
                            <div className="bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-white px-3 py-2 rounded-2xl rounded-tr-md max-w-[85%] sm:max-w-[70%] text-sm border border-gray-200/70 dark:border-gray-600">
                              <p className="leading-relaxed">{message.content}</p>
                            </div>
                            <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-gray-400/30">
                              <AvatarFallback className="bg-gray-900 text-white">
                                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        ) : (
                          <div className="flex gap-2 sm:gap-3">
                            <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-gray-400/30 mt-1">
                              <AvatarFallback className="bg-gray-700 text-white">{agentInfo.icon}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-muted-foreground text-sm">{message.agentName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="py-1 pr-2 sm:pr-4 text-gray-800 dark:text-gray-100">
                                <p className="text-sm leading-relaxed">{message.content}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {isTyping && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 border-2 border-gray-400/30 mt-1">
                        <AvatarFallback className="bg-gray-700 text-white">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="py-1 pr-4 text-gray-800 dark:text-gray-100">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                          <div
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="flex-shrink-0 py-2 sm:py-3 w-full flex justify-center">
                  <div className="grid w-full max-w-3xl">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                      className="[grid-area:1/1] w-full pt-3 sm:pt-4 pr-10 sm:pr-12 pb-3 sm:pb-4 text-sm rounded-xl sm:rounded-2xl focus:outline-none text-gray-900 dark:text-white resize-none min-h-[2.5rem] sm:min-h-[3rem] max-h-[6rem] sm:max-h-[8rem] overflow-y-auto placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-colors bg-white dark:bg-neutral-800"
                      disabled={isTyping}
                    />
                    <div className="[grid-area:1/1] pointer-events-none flex items-end justify-end p-1.5 sm:p-2">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isTyping}
                        className="pointer-events-auto text-gray-700 dark:text-gray-300 bg-accent-foreground hover:bg-accent-foreground cursor-pointer rounded-xl h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
