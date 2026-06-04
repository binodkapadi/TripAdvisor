import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Modal from '../ui/Modal.jsx'
import { useAuth } from '../state/auth/AuthProvider.jsx'
import { useTrip } from '../state/trip/TripProvider.jsx'
import { createApiClient } from '../lib/apiClient.js'

export default function ChatWidget() {
  const { user, getIdToken } = useAuth()
  const { trip } = useTrip()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => [])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)

  const canChat = useMemo(() => Boolean(trip?.itineraryId) && Boolean(user), [trip, user])

  async function sendMessage() {
    const q = question.trim()
    if (!q || sending) return

    setSending(true)
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])

    try {
      const token = await getIdToken()
      const api = createApiClient({ token })
      const res = await api.post('/api/ai/chat', {
        itineraryId: trip.itineraryId,
        question: q
      })

      const assistantText = res.data?.answer || 'Got it. How can I help further?'
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not answer that right now.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <motion.button
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg ring-1 ring-orange-300/50 flex items-center justify-center transition"
        onClick={() => setOpen(true)}
        whileHover={{ y: -6, scale: 1.1, boxShadow: '0 10px 30px rgba(255, 140, 0, 0.4)' }}
        whileTap={{ scale: 0.92 }}
        aria-label="Open travel assistant"
      >
        <span className="text-2xl">💬</span>
      </motion.button>

      <Modal open={open} onClose={() => setOpen(false)} title="TripAdvisor Assistant">
        {!canChat ? (
          <div className="text-sm text-white/80">
            Generate an itinerary first (and sign in) to start chatting.
          </div>
        ) : (
          <div className="flex h-[60vh] flex-col gap-3">
            <div className="flex-1 overflow-auto rounded-xl bg-black/20 p-3 ring-1 ring-white/10">
              {messages.length === 0 ? (
                <div className="text-sm text-white/60">
                  Ask questions about hotels, weather, day-by-day plans, or best routes.
                </div>
              ) : null}
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={[
                    'mb-3 whitespace-pre-wrap rounded-xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-white/10 text-white/90 ring-1 ring-white/10 self-end max-w-[90%]'
                      : 'bg-white/5 text-white/80 ring-1 ring-white/10 self-start max-w-[90%]'
                  ].join(' ')}
                >
                  {m.content}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/40"
                placeholder="Ask anything about your trip..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage()
                }}
              />
              <motion.button
                className="rounded-xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition disabled:opacity-60"
                onClick={sendMessage}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send'}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

