"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, User, Plus, Clock, SunMoon, Menu, X, LogIn, LogOut, PanelRightClose, Sparkles, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import SynergiLogo from "@/components/synergi-logo"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"
import config from "@/lib/config"

interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  isStreaming?: boolean
}

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

interface EventStreamData {
  event: string
  data: any
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use next-themes for theme management
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Auth state
  const { user, isAuthenticated, logout, token } = useAuth()
  
  // Modal state to prevent sidebar interactions
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Ensure component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load conversations when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadConversations()
    }
  }, [isAuthenticated, token])

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
  }, [messages, streamingContent])

  const loadConversations = async () => {
    if (!token) return
    
    setIsLoadingConversations(true)
    try {
      const response = await fetch(config.getApiUrl(config.endpoints.chat.conversations), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadConversationMessages = async (conversationId: string) => {
    if (!token) return
    
    setIsLoadingMessages(true)
    try {
      const response = await fetch(config.getApiUrl(config.endpoints.chat.messages(conversationId)), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.role.toLowerCase(),
          timestamp: new Date(msg.createdAt),
        })))
        setCurrentConversationId(conversationId)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming || !token) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsStreaming(true)
    setStreamingContent("")

    try {
      const response = await fetch(config.getApiUrl(config.endpoints.chat.send), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: inputValue,
          conversationId: currentConversationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let streamingMessageId = (Date.now() + 1).toString()
      let fullContent = ""
      let currentEvent = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.substring(6).trim()
              continue
            }
            
            if (line.startsWith('data:')) {
              try {
                const dataStr = line.substring(5).trim()
                if (!dataStr) continue
                
                const data = JSON.parse(dataStr)
                
                switch (currentEvent) {
                  case 'conversation':
                    if (data.conversationId && !currentConversationId) {
                      setCurrentConversationId(data.conversationId)
                    }
                    break
                    
                  case 'ai_start':
                    // Add streaming message placeholder
                    setMessages(prev => [...prev, {
                      id: streamingMessageId,
                      content: "",
                      sender: "assistant",
                      timestamp: new Date(),
                      isStreaming: true,
                    }])
                    break
                    
                  case 'ai_chunk':
                    if (data.chunk) {
                      fullContent += data.chunk
                      setStreamingContent(fullContent)
                      
                      // Update the streaming message
                      setMessages(prev => 
                        prev.map(msg => 
                          msg.id === streamingMessageId 
                            ? { ...msg, content: fullContent }
                            : msg
                        )
                      )
                    }
                    break
                    
                  case 'ai_complete':
                    // Finalize the message
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === streamingMessageId 
                          ? { 
                              ...msg, 
                              id: data.id || streamingMessageId,
                              content: data.content || fullContent,
                              isStreaming: false 
                            }
                          : msg
                      )
                    )
                    break
                    
                  case 'title_generated':
                    // Refresh conversations to show new title
                    loadConversations()
                    break
                    
                  case 'done':
                    setIsStreaming(false)
                    setStreamingContent("")
                    // Refresh conversations list
                    loadConversations()
                    break
                    
                  case 'error':
                    console.error('Stream error:', data)
                    setIsStreaming(false)
                    setStreamingContent("")
                    break
                }
              } catch (e) {
                // Ignore parsing errors for malformed data
                console.warn('Failed to parse SSE data:', line)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setIsStreaming(false)
      setStreamingContent("")
    }
  }, [inputValue, isStreaming, token, currentConversationId])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    setStreamingContent("")
    setIsMobileSidebarOpen(false)
  }

  const selectConversation = (conversation: Conversation) => {
    loadConversationMessages(conversation.id)
    setIsMobileSidebarOpen(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-neutral-800">
              <div className="text-center space-y-6">
        <SynergiLogo width={48} height={48} className="mx-auto" />
        <div className="space-y-4">
          <h1 className="text-xl font-medium text-gray-800 dark:text-white">Welcome to Synergi</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Please sign in to start chatting.</p>
          <AuthModal>
            <Button className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-gray-100 text-white dark:text-gray-900">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </AuthModal>
        </div>
      </div>
      </div>
    )
  }

  return (
    <div
      className="h-screen relative flex bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-white transition-colors overflow-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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
            if (!isMobileSidebarOpen && isSidebarOpen) {
              e.stopPropagation();
            }
          }}
        >
          {/* Header */}
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

          {/* New Chat Button */}
          <div className="px-4 py-3 border-t border-gray-200/50 dark:border-neutral-700/50">
            <Button
              className={`${isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen) ? "w-full justify-start" : "w-10 h-10 p-0"} 
                    bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-gray-100 text-white dark:text-gray-900 border-0`}
              onClick={(e) => {
                e.stopPropagation();
                startNewChat();
              }}
            >
              <Plus className="w-4 h-4" />
              {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
                <span className="ml-2">New Chat</span>
              )}
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
              <div className="px-4 pb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Chats
                  {isLoadingConversations && <Loader2 className="w-3 h-3 animate-spin" />}
                </h3>
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                        currentConversationId === conversation.id
                          ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700"
                          : "bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 hover:border-gray-400/40"
                      }`}
                      onClick={() => selectConversation(conversation)}
                    >
                      <h4 className="text-sm font-medium text-foreground truncate">{conversation.title}</h4>
                      {conversation.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{conversation.lastMessage.content}</p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </p>
                        <span className="text-xs bg-gray-200 dark:bg-neutral-600 px-2 py-1 rounded-full">
                          {conversation.messageCount}
                        </span>
                      </div>
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

          {/* User Controls */}
          <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-full justify-end">
                {mounted && (
                  <>
                    {(isMobileSidebarOpen || (!isMobileSidebarOpen && isSidebarOpen)) && (
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
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-30 md:hidden bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-gray-200 dark:border-neutral-700"
        onClick={() => setIsMobileSidebarOpen(true)}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-gray-200 dark:border-neutral-700"
            onClick={toggleTheme}
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            <SunMoon className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 relative z-10 h-screen flex p-2 sm:p-4 pt-16 md:pt-4 transition-all duration-300 ${
        !isMobileSidebarOpen ? (isSidebarOpen ? "md:ml-80" : "md:ml-16") : ""
      }`}>
        <div className="w-full h-full flex flex-col bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
          <div className="flex-1 flex flex-col px-2 sm:px-4 md:px-8 py-4 sm:py-8 min-h-0">
            {messages.length === 0 && !isLoadingMessages ? (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center overflow-y-auto">
                <div className="text-center space-y-6 sm:space-y-8 w-full max-w-3xl mx-auto">
                  <div className="space-y-4">
                    <div className="inline-flex">
                      <SynergiLogo width={48} height={48} className="sm:w-16 sm:h-16" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-white mb-1">
                        Welcome to Synergi
                      </h1>
                      <p className="text-sm text-muted-foreground">Multi-Agent AI Assistant</p>
                    </div>
                  </div>

                  <div className="grid max-w-4xl mx-auto">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything..."
                      className="[grid-area:1/1] w-full pr-12 sm:pr-14 pb-12 sm:pb-14 pt-4 sm:pt-6 text-sm rounded-xl focus:outline-none text-gray-900 dark:text-white resize-none min-h-[3.5rem] sm:min-h-[4rem] max-h-[8rem] sm:max-h-[10rem] overflow-y-auto placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-colors bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 focus:border-teal-500 dark:focus:border-teal-400"
                      disabled={isStreaming}
                    />
                    <div className="[grid-area:1/1] pointer-events-none flex items-end justify-end p-3 sm:p-4">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isStreaming}
                        className="pointer-events-auto bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-gray-100 text-white dark:text-gray-900 h-8 w-8 sm:h-10 sm:w-10 rounded-lg transition-all duration-200"
                      >
                        {isStreaming ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="flex-1 flex flex-col items-center min-h-0">
                {isLoadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading conversation...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 w-full max-w-4xl overflow-y-auto space-y-4 sm:space-y-6 py-2 sm:py-4 px-1 sm:px-2 min-h-0">
                    {messages.map((message) => (
                      <div key={message.id}>
                        {message.sender === "user" ? (
                          <div className="flex justify-end">
                            <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 px-3 py-2 rounded-lg max-w-[85%] sm:max-w-[70%] text-sm">
                              <p className="leading-relaxed">{message.content}</p>
                              <div className="text-xs opacity-60 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 sm:gap-3">
                            <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border border-gray-300 dark:border-neutral-600 mt-1 flex-shrink-0">
                              <AvatarFallback className="bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300">
                                <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">Synergi</span>
                                <span className="text-xs text-muted-foreground">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                                {message.isStreaming && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-teal-500 rounded-full animate-pulse" />
                                    <div className="w-1 h-1 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                                    <div className="w-1 h-1 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                                  </div>
                                )}
                              </div>
                              <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                                <div 
                                  className="whitespace-pre-wrap"
                                  dangerouslySetInnerHTML={{
                                    __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  }}
                                />
                                {message.isStreaming && (
                                  <span className="inline-block w-0.5 h-4 bg-teal-500 ml-0.5 animate-pulse" />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <div ref={messagesEndRef} />
                    </div>
                  )}

                {/* Chat Input */}
                <div className="flex-shrink-0 py-2 sm:py-3 w-full flex justify-center border-t border-gray-100 dark:border-neutral-800">
                  <div className="grid w-full max-w-4xl px-2 sm:px-0">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={isStreaming ? "Synergi is responding..." : "Type your message..."}
                      className="[grid-area:1/1] w-full pt-2 sm:pt-3 pr-8 sm:pr-10 pb-2 sm:pb-3 text-sm rounded-lg focus:outline-none text-gray-900 dark:text-white resize-none min-h-[2.5rem] sm:min-h-[3rem] max-h-[5rem] sm:max-h-[6rem] overflow-y-auto placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-colors bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 focus:border-teal-500 dark:focus:border-teal-400"
                      disabled={isStreaming}
                    />
                    <div className="[grid-area:1/1] pointer-events-none flex items-end justify-end p-1.5 sm:p-2">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isStreaming}
                        className="pointer-events-auto bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-md h-6 w-6 sm:h-7 sm:w-7 p-0 transition-all duration-200"
                      >
                        {isStreaming ? (
                          <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        )}
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