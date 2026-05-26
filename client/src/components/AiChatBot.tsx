import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Bot, Trash2 } from 'lucide-react'
import { chatbotService } from '../services/api'
import { useToast } from '../contexts/ToastContext'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const AiChatBot: React.FC = () => {
  const { addToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI assistant. Ask me anything about SocialHub or get help with your posts!', timestamp: new Date() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }])
    setLoading(true)
    try {
      const response = await chatbotService.sendMessage(userMsg)
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.message, timestamp: new Date(response.data.timestamp) }])
    } catch {
      addToast('Failed to get AI response', 'error')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await chatbotService.clearHistory()
      setMessages([{ role: 'assistant', content: 'Conversation cleared. How can I help you?', timestamp: new Date() }])
      addToast('Conversation history cleared', 'info')
    } catch {
      addToast('Failed to clear history', 'error')
    }
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 p-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-glow pulse-glow card-press"
        aria-label="Open AI Chatbot"
      >
        <Bot size={24} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-20 left-4 z-50 w-80 sm:w-96 h-[500px] glass-heavy bg-surface/95 rounded-2xl border border-border/20 shadow-[0_25px_70px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="AI Chatbot"
          >
            <div className="p-3 border-b border-border/20 flex items-center justify-between bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <span className="text-text font-semibold text-sm gradient-text">AI Assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleClear}
                  className="p-1.5 rounded-lg hover:bg-surface/60 text-text-muted hover:text-text transition-all card-press" aria-label="Clear conversation">
                  <Trash2 size={15} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface/60 text-text-muted hover:text-text transition-all card-press" aria-label="Close chatbot">
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-primary to-accent text-white rounded-br-md'
                      : 'glass-card rounded-bl-md text-text'
                  }`}>
                    <p>{msg.content}</p>
                    <span className={`text-xs mt-1 block ${msg.role === 'user' ? 'text-white/50' : 'text-text-subtle'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="glass-card px-4 py-3 rounded-xl rounded-bl-md">
                    <div className="flex space-x-1.5">
                      {[0, 150, 300].map((delay, i) => (
                        <motion.span key={i}
                          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border/20">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                  className="flex-1 px-3 py-2 input-glass rounded-xl text-text placeholder-text-muted text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="px-3 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl shadow-glow-sm disabled:opacity-50 card-press"
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AiChatBot