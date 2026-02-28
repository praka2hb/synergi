"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Bot,
  Code,
  Search,
  BookOpen,
  Calculator,
  Globe,
  MessageSquare,
  Loader2,
  CloudSun
} from "lucide-react"
import config from "@/lib/config"

interface Agent {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  specialty: string
  isActive: boolean
}

interface AgentsViewProps {
  onChatWithAgent?: (agentId: string) => void
}

export default function AgentsView({ onChatWithAgent }: AgentsViewProps) {
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false)
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentDescription, setNewAgentDescription] = useState("")
  const [newAgentSpecialty, setNewAgentSpecialty] = useState("")
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Map agent IDs to icons
  const agentIconMap: Record<string, React.ReactNode> = {
    web_search: <Globe className="w-6 h-6" />,
    weather: <CloudSun className="w-6 h-6" />,
    general: <Bot className="w-6 h-6" />,
    code: <Code className="w-6 h-6" />,
    research: <Search className="w-6 h-6" />,
    writing: <BookOpen className="w-6 h-6" />,
    math: <Calculator className="w-6 h-6" />,
  }

  // Map agent IDs to specialties
  const agentSpecialtyMap: Record<string, string> = {
    web_search: "Web Search",
    weather: "Weather",
    general: "General",
    code: "Development",
    research: "Research",
    writing: "Writing",
    math: "Mathematics",
  }

  // Fetch agents from API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch(config.getApiUrl(config.endpoints.chat.agents))
        if (response.ok) {
          const data = await response.json()
          const mappedAgents: Agent[] = data.agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: agentIconMap[a.id] || <Bot className="w-6 h-6" />,
            specialty: agentSpecialtyMap[a.id] || "General",
            isActive: a.isActive,
          }))
          setAgents(mappedAgents)
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error)
        // Fallback to default agents
        setAgents([
          {
            id: "web_search",
            name: "Web Search Agent",
            description: "Searches the web for current, real-time information, latest news, and up-to-date facts",
            icon: <Globe className="w-6 h-6" />,
            specialty: "Web Search",
            isActive: true,
          },
          {
            id: "general",
            name: "General Assistant",
            description: "Handles general conversation, coding help, creative writing, analysis, and knowledge-based questions",
            icon: <Bot className="w-6 h-6" />,
            specialty: "General",
            isActive: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const handleAddAgent = () => {
    if (newAgentName.trim() && newAgentDescription.trim() && newAgentSpecialty) {
      // In a real app, this would make an API call to create the agent
      console.log("Adding agent:", {
        name: newAgentName,
        description: newAgentDescription,
        specialty: newAgentSpecialty
      })

      // Reset form
      setNewAgentName("")
      setNewAgentDescription("")
      setNewAgentSpecialty("")
      setIsAddAgentOpen(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Synergi Agents</h1>
            <p className="text-sm text-muted-foreground">Manage and interact with your specialized AI agents</p>
          </div>

          {/* Add Agent Button */}
          <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 h-8 px-3"
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm p-6">
              <DialogHeader className="pb-3">
                <DialogTitle className="text-lg">Add New Agent</DialogTitle>
                <DialogDescription className="text-sm">
                  Create a specialized AI agent.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="agent-name" className="text-sm font-medium">Name</Label>
                  <Input
                    id="agent-name"
                    placeholder="e.g., Code Reviewer"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-specialty" className="text-sm font-medium">Specialty</Label>
                  <Select value={newAgentSpecialty} onValueChange={setNewAgentSpecialty}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="writing">Writing</SelectItem>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="translation">Translation</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="agent-description"
                    placeholder="Brief description..."
                    value={newAgentDescription}
                    onChange={(e) => setNewAgentDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddAgentOpen(false)
                    setNewAgentName("")
                    setNewAgentDescription("")
                    setNewAgentSpecialty("")
                  }}
                  className="h-8 px-3"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddAgent}
                  disabled={!newAgentName.trim() || !newAgentDescription.trim() || !newAgentSpecialty}
                  className="bg-teal-600 hover:bg-teal-700 text-white h-8 px-3"
                >
                  Add Agent
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Agents List */}
      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-md border border-gray-200 dark:border-neutral-700 hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all duration-200 bg-white dark:bg-neutral-900"
          >
            {/* Agent Avatar */}
            <Avatar className="w-8 h-8 bg-teal-100 dark:bg-teal-900/20 flex-shrink-0">
              <AvatarFallback className="text-teal-600 dark:text-teal-400 bg-transparent">
                {agent.icon}
              </AvatarFallback>
            </Avatar>

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-sm text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {agent.name}
                </h3>
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 rounded">
                  {agent.specialty}
                </span>
                {agent.isActive && (
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Active" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {agent.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="border-teal-200 dark:border-teal-700 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 px-2 py-1 h-7 text-xs"
                onClick={() => onChatWithAgent && onChatWithAgent(agent.id)}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                <span className="sm:hidden">Chat</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-gray-100 dark:hover:bg-neutral-700 px-2 py-1 h-7"
              >
                <Bot className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State for when no agents */}
      {agents.length === 0 && (
        <div className="text-center py-8">
          <Bot className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No Agents Yet</h3>
          <p className="text-sm text-muted-foreground mb-3">Get started by adding your first AI agent</p>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Agent
          </Button>
        </div>
      )}
    </div>
  )
}
