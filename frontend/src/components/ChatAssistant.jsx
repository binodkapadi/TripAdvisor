import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createApiClient } from '../lib/apiClient.js'
import { Bot, X, Send, User, ChevronDown, Trash2 } from 'lucide-react'
import { useAuth } from '../state/auth/AuthProvider.jsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatAssistant({ itineraryId }) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const defaultMessage = { type: 'assistant', content: "Hi! I'm your AI Travel Copilot. 🌍\nHow can I help you with your itinerary today?" }
  const [messages, setMessages] = useState([defaultMessage])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, user, itineraryId])

  // Fetch history from backend or clear if missing
  useEffect(() => {
    if (!user) {
      setIsOpen(false) // Close chat on logout
      setMessages([defaultMessage])
      return
    }
    if (!itineraryId) {
      setMessages([defaultMessage])
      return
    }

    let isMounted = true
    const fetchHistory = async () => {
      try {
        const api = createApiClient()
        const response = await api.get(`/api/ai/chat/history?itineraryId=${itineraryId}`)
        if (isMounted) {
          if (response.data && response.data.length > 0) {
            setMessages([defaultMessage, ...response.data])
          } else {
            setMessages([defaultMessage])
          }
        }
      } catch (e) {
        console.error('Failed to fetch chat history:', e)
      }
    }
    fetchHistory()

    return () => {
      isMounted = false
    }
  }, [user, itineraryId])

  const handleClearChat = async () => {
    if (!user || !itineraryId) return
    try {
      const api = createApiClient()
      await api.delete(`/api/ai/chat/history?itineraryId=${itineraryId}`)
      setMessages([defaultMessage])
    } catch (e) {
      console.error('Failed to clear chat history:', e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading || !itineraryId || !user) return

    const userMsg = input.trim()
    setInput('')

    const newMessages = [...messages, { type: 'user', content: userMsg }]
    setMessages([...newMessages, { type: 'assistant', content: '' }])
    setLoading(true)

    try {
      // Use standard fetch for streaming
      const token = localStorage.getItem('authToken') || ''
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/ai/chat/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itineraryId,
          question: userMsg,
          history: newMessages.slice(1) // exclude the initial greeting
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false
      let fullAssistantMsg = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          fullAssistantMsg += chunk
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { type: 'assistant', content: fullAssistantMsg }
            return updated
          })
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { type: 'assistant', content: "The AI service is temporarily busy (Network Error). Please try again in a few moments." }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const displayMessages = !user
    ? [{ type: 'assistant', content: "Please sign in to use the AI Travel Assistant." }]
    : !itineraryId
      ? [{ type: 'assistant', content: "Please generate a travel plan/itinerary first by clicking on Start Planning Trip to use this assistant." }]
      : messages

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 transition-shadow hover:shadow-orange-500/50 cursor-pointer"
          >
            <Bot size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-50 flex sm:w-[380px] flex-col overflow-hidden rounded-3xl border border-[color:var(--glass-border)] bg-transparent shadow-2xl backdrop-blur-2xl h-[600px] max-h-[calc(100vh-100px)]"
          >
            {/* Background Layers */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              {/* Light Mode Map Background */}
              <div
                className="absolute inset-0 bg-[url('/images/map_light_mode.png')] bg-cover bg-center opacity-30 dark:opacity-0 transition-opacity duration-1000"
              />
              {/* Dark Mode Map Background */}
              <div
                className="absolute inset-0 bg-[url('/images/map_dark_mode.png')] bg-cover bg-center opacity-0 dark:opacity-30 transition-opacity duration-1000"
              />
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[2px]" />
            </div>

            {/* Header Actions (Fixed inside the chat box) */}
            <button
              onClick={handleClearChat}
              title="Clear Chat"
              className="absolute top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white-forced transition-all duration-300 hover:bg-orange-500 hover:border-orange-500 hover:scale-110 cursor-pointer shadow-sm border border-white/30 backdrop-blur-md"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              title="Close Chat"
              className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white-forced transition-all duration-300 hover:bg-orange-500 hover:border-orange-500 hover:scale-110 cursor-pointer shadow-sm border border-white/30 backdrop-blur-md"
            >
              <X size={18} />
            </button>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 pt-20 space-y-4">
              {displayMessages.map((msg, idx) => {
                const isUser = msg.type === 'user'
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={idx}
                    className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-white shadow-sm">
                        <Bot size={16} />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md overflow-hidden relative z-10 backdrop-blur-md ${isUser
                        ? 'rounded-br-sm bg-gradient-to-r from-orange-500/90 to-red-500/90 text-white-forced border border-white/20'
                        : 'rounded-bl-sm border border-white/10 bg-black/60 text-white-forced prose prose-sm prose-invert'
                        }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed" {...props} />,
                            ul: ({ node, ...props }) => <ul className="mb-2 list-disc pl-4 text-sm" {...props} />,
                            ol: ({ node, ...props }) => <ol className="mb-2 list-decimal pl-4 text-sm" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-current" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="mb-2 mt-4 font-bold text-base" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="mb-2 mt-3 font-semibold text-sm" {...props} />,
                            a: ({ node, ...props }) => <a className="text-orange-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                          }}
                        >
                          {msg.content || ' '}
                        </ReactMarkdown>
                      )}
                    </div>
                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 shadow-sm dark:bg-gray-700 dark:text-gray-300">
                        <User size={16} />
                      </div>
                    )}
                  </motion.div>
                )
              })}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-end gap-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-white shadow-sm relative z-10">
                    <Bot size={16} />
                  </div>
                  <div className="relative z-10 flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-black/60 px-4 py-4 shadow-sm backdrop-blur-md">
                    <motion.div className="h-2 w-2 rounded-full bg-orange-400" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                    <motion.div className="h-2 w-2 rounded-full bg-orange-400" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                    <motion.div className="h-2 w-2 rounded-full bg-orange-400" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="relative z-10 border-t border-[color:var(--glass-border)] bg-white/50 dark:bg-black/40 p-4 backdrop-blur-md">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your trip..."
                  className="w-full rounded-full border border-white/20 bg-black/40 py-3 pl-5 pr-12 text-sm text-white-forced outline-none placeholder:text-white/50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all backdrop-blur-sm"
                  disabled={loading || !user || !itineraryId}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading || !user || !itineraryId}
                  className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-white shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
