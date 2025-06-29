'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Bot, User, Loader2, BarChart3, TrendingUp, Users, Package } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  formattedTime: string
  type: 'text' | 'analytics' | 'error'
  data?: any
}

interface AnalyticsData {
  type: 'orders' | 'revenue' | 'products' | 'customers'
  title: string
  value: string | number
  change?: number
  details?: any
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant. I can help you with analytics, orders, products, and customer insights. What would you like to know?",
      role: 'assistant',
      timestamp: new Date(),
      formattedTime: '',
      type: 'text'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastProduct, setLastProduct] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Utility: Extract product name from analytics data or message content
  const extractProductName = (msg: Message): string | null => {
    // Check analytics data
    if (msg.type === 'analytics' && msg.data) {
      for (const item of msg.data) {
        if (item.type === 'products' && item.details && Array.isArray(item.details)) {
          // Use the first product name in details
          if (item.details[0]?.name) return item.details[0].name
        }
        if (item.type === 'products' && typeof item.value === 'string' && item.value) {
          // Try to use the value if it looks like a product name
          return item.value
        }
      }
    }
    // Fallback: try to extract from message content (simple heuristic)
    const match = msg.content.match(/\b([A-Z][a-zA-Z0-9\- ]{2,})\b/)
    if (match) return match[1]
    return null
  }

  // Set the formatted time for the initial message after mount
  useEffect(() => {
    setMessages(prev => prev.map(msg => 
      msg.id === '1' 
        ? { ...msg, formattedTime: msg.timestamp.toLocaleTimeString() }
        : msg
    ))
  }, [])

  // Track last mentioned product after each assistant message
  useEffect(() => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistantMsg) {
      const product = extractProductName(lastAssistantMsg)
      if (product) setLastProduct(product)
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const now = new Date()
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: now,
      formattedTime: now.toLocaleTimeString(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.post('/admin/chatbot/query', {
        message: input.trim(),
        contextProductName: lastProduct || undefined
      })

      const now2 = new Date()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.data.response,
        role: 'assistant',
        timestamp: now2,
        formattedTime: now2.toLocaleTimeString(),
        type: response.data.type || 'text',
        data: response.data.data
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const now2 = new Date()
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: now2,
        formattedTime: now2.toLocaleTimeString(),
        type: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to get response from chatbot')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user'
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <Card className={`${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            <CardContent className="p-4">
              {message.type === 'analytics' && message.data ? (
                <div className="space-y-3">
                  <p className="text-sm opacity-80">{message.content}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {message.data.map((item: AnalyticsData, index: number) => (
                      <div key={index} className="bg-background/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {item.type === 'orders' && <Package className="w-4 h-4" />}
                          {item.type === 'revenue' && <TrendingUp className="w-4 h-4" />}
                          {item.type === 'customers' && <Users className="w-4 h-4" />}
                          {item.type === 'products' && <BarChart3 className="w-4 h-4" />}
                          <span className="text-sm font-medium">{item.title}</span>
                        </div>
                        <div className="text-lg font-bold">{item.value}</div>
                        {item.change !== undefined && (
                          <div className={`text-xs ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {item.change >= 0 ? '+' : ''}{item.change}% from last period
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </CardContent>
          </Card>
          <div className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {message.formattedTime}
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    )
  }

  const suggestedQueries = [
    "Show me today's orders",
    "What's our total revenue this month?",
    "Which products are selling best?",
    "How many customers do we have?",
    "Show low stock products",
    "What's our average order value?"
  ]

  return (
    <div className="p-6 bg-background h-screen flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Analytics Assistant</h1>
          <p className="text-muted-foreground">Ask me anything about your business data</p>
        </div>
      </div>

      {/* Suggested Queries */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
        <div className="flex flex-wrap gap-2">
          {suggestedQueries.map((query, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setInput(query)}
              className="text-xs"
            >
              {query}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/20 rounded-lg">
        {messages.map(renderMessage)}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <Card className="bg-muted">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about orders, revenue, products, customers..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
} 