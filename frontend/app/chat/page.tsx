"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, SunMoon, Menu, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import SynergiLogo from "@/components/synergi-logo"
import { usePrivyAuth } from "@/hooks/use-privy-auth"
import config from "@/lib/config"
import { MarkdownMessage } from "@/components/markdown-message"
import { AdvancedStreamingText } from "@/components/advanced-streaming-text"
import CommonSidebar from "@/components/common-sidebar"
import AgentsView from "@/components/agents-view"
import { useSidebar } from "@/context/sidebar-context"
import { useRouter } from "next/navigation"

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

  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [currentView, setCurrentView] = useState<'chat' | 'agents'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use next-themes for theme management
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Auth state - using Privy
  const { user, isAuthenticated, token } = usePrivyAuth()

  // Sidebar state from context
  const { isSidebarOpen, isMobileSidebarOpen, setIsMobileSidebarOpen } = useSidebar()

  const router = useRouter()

  // Ensure component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load conversations when authenticated, clear when not authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadConversations()
    } else {
      // Clear conversations when user logs out
      setConversations([])
      setCurrentConversationId(null)
      setMessages([])
      setStreamingContent("")
      // Reset to chat view if currently in agents view
      setCurrentView('chat')
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

  const deleteConversation = async (conversationId: string) => {
    if (!token) return
    
    try {
      const response = await fetch(config.getApiUrl(`/api/chat/conversations/${conversationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        // Remove from conversations list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        // If this was the current conversation, clear messages and reset
        if (currentConversationId === conversationId) {
          setMessages([])
          setCurrentConversationId(null)
        }
      } else {
        console.error('Failed to delete conversation')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return

    // If user is not authenticated, do nothing (they should use the login button in header)
    if (!isAuthenticated || !token) {
      return
    }

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

  const handleChatWithAgent = (agentId: string) => {
    // Switch to chat view and potentially start a conversation with the agent
    setCurrentView('chat')
    console.log(`Starting chat with agent: ${agentId}`)
    // In a real app, this would initialize a conversation with the specific agent
  }

  const handleSwitchToChat = () => {
    setCurrentView('chat')
  }

  return (
    <div
      className="h-screen relative flex bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-white transition-colors overflow-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* Common Sidebar */}
      <CommonSidebar
        currentPage={currentView}
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoadingConversations={isLoadingConversations}
        selectConversation={selectConversation}
        startNewChat={startNewChat}
        deleteConversation={deleteConversation}
        onSwitchToChat={handleSwitchToChat}
        onSwitchToAgents={() => setCurrentView('agents')}
      />

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
      <div className="fixed top-4 right-4 z-50">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-transparent hover:bg-transparent text-gray-800 dark:text-gray-200"
            onClick={toggleTheme}
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            <SunMoon className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 relative z-10 h-screen flex p-2 sm:p-4 pt-16 md:pt-4 transition-all duration-500 ease-in-out ${
        !isMobileSidebarOpen ? (isSidebarOpen ? "md:ml-64" : "md:ml-16") : ""
      }`}>
        <div className="w-full h-full flex flex-col bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {currentView === 'chat' ? (
              <div className="h-full flex flex-col px-2 sm:px-4 md:px-8 py-4 sm:py-8">
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
                            className="pointer-events-auto bg-transparent hover:bg-transparent text-neutral-800 dark:text-gray-200 h-8 w-8 sm:h-10 sm:w-10 rounded-lg transition-all duration-200 border-0 shadow-none focus:shadow-none focus:ring-0 focus:outline-none"
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
                  <>
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
                                  <div className="bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg max-w-[85%] sm:max-w-[70%] text-sm">
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
                                {message.sender === "assistant" ? (
                                  <AdvancedStreamingText
                                    content={message.content}
                                    isStreaming={message.isStreaming || false}
                                    className="text-sm"
                                  />
                                ) : (
                                  <div 
                                    className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                      __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    }}
                                  />
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
                    </div>

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
                        className="pointer-events-auto bg-transparent hover:bg-transparent text-gray-800 dark:text-gray-200 rounded-md h-6 w-6 sm:h-7 sm:w-7 p-0 transition-all duration-200 border-0 shadow-none focus:shadow-none focus:ring-0 focus:outline-none"
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
                  </>
                )}
              </div>
            ) : (
              <div className="h-full overflow-auto p-4 sm:p-6">
                <AgentsView onChatWithAgent={handleChatWithAgent} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}