import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'

import homeImg from '../images/home1.png'
import { createApiClient } from '../lib/apiClient.js'
import { useAuth } from '../state/auth/AuthProvider.jsx'
import { Map, Route, ShieldCheck, Send } from 'lucide-react'

const travelerQuotes = [
  'Travel is the only thing you buy that makes you richer.',
  'Adventure is out there" (Up) and "Travel more, worry less',
  'Life is either a daring adventure or nothing at all.',
  'Take only memories, leave only footprints.',
  'Stop worrying about the potholes in the road and celebrate the journey.',
  'It is only in adventure that some people succeed in knowing themselves - in finding themselves.',
  'A good traveler has no fixed plans, and is not intent on arriving.'
]

function SectionShell({ id, title, children }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">{title}</h2>
        <div className="mt-2 text-sm text-[color:var(--text-muted)]"> </div>
      </div>
      {children}
    </section>
  )
}

function GlassCard({ icon, title, body }) {
  return (
    <motion.div
      className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl transition hover:bg-[color:var(--glass-hover)]"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--glass)] ring-1 ring-[color:var(--glass-border)]">
          {icon}
        </div>
        <div className="text-lg font-semibold">{title}</div>
      </div>
      <div className="text-sm text-[color:var(--text-muted)]">{body}</div>
    </motion.div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  // Remove authentication requirements
  const api = useMemo(() => createApiClient(), [])
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [videoUrl, setVideoUrl] = useState('')
  const [shareSuccess, setShareSuccess] = useState(null)
  const [sharing, setSharing] = useState(false)

  const socialVideoRegex = useMemo(() => {
    return new RegExp(
      String.raw`^(https?:\/\/)?([a-z0-9-]+\.)*` +
      String.raw`(facebook\.com|fb\.com|fb\.watch|instagram\.com|instagr\.am|x\.com|twitter\.com|tiktok\.com|snapchat\.com|linkedin\.com|youtube\.com|youtu\.be|pinterest\.com|pin\.it|reddit\.com|whatsapp\.com|wa\.me|telegram\.org|t\.me|telegram\.me|discord\.com|discord\.gg|discordapp\.com|vimeo\.com|threads\.net|medium\.com)` +
      String.raw`($|\/.*)`,
      'i'
    )
  }, [])

  const canShare = useMemo(() => socialVideoRegex.test(videoUrl.trim()), [socialVideoRegex, videoUrl])

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i) => (i + 1) % travelerQuotes.length), 3500)
    return () => clearInterval(t)
  }, [])

  const { user, openAuthModal } = useAuth()

  const quote = useMemo(() => travelerQuotes[quoteIdx], [quoteIdx])

  const handleStartPlanning = () => {
    if (user) {
      navigate('/plan')
      return
    }
    openAuthModal('signin')
  }

  return (
    <main>
      <section
        id="home"
        className="relative min-h-[92vh] overflow-hidden"
        style={{
          backgroundImage: `url(${homeImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-center px-4 pb-16 pt-28 md:pt-24 text-white">
          <h1 className="mt-6 max-w-2xl text-5xl font-extrabold leading-[1.03] text-white drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
            <span className="text-emerald-300">Plan your next adventure with</span>{' '}
            <span className="text-orange-300">TripAdvisor</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm text-slate-200/90">“{quote}”</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <motion.button
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:brightness-110"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartPlanning}
            >
              <Send size={18} />
              Start Planning Trip →
            </motion.button>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl">
            <div className="flex items-center gap-3 rounded-2xl bg-black/40 backdrop-blur-md p-3 pr-6 ring-1 ring-white/10 transition hover:bg-black/50">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-orange-200">
                <Map size={24} />
              </div>
              <div className="text-left leading-tight">
                <div className="text-sm font-bold text-white">AI-Powered</div>
                <div className="text-xs text-slate-300">Recommendations</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 rounded-2xl bg-black/40 backdrop-blur-md p-3 pr-6 ring-1 ring-white/10 transition hover:bg-black/50">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-orange-200">
                <Route size={24} />
              </div>
              <div className="text-left leading-tight">
                <div className="text-sm font-bold text-white">Custom</div>
                <div className="text-xs text-slate-300">Itineraries</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/40 backdrop-blur-md p-3 pr-6 ring-1 ring-white/10 transition hover:bg-black/50">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-orange-200">
                <ShieldCheck size={24} />
              </div>
              <div className="text-left leading-tight">
                <div className="text-sm font-bold text-white">Smart & Hassle</div>
                <div className="text-xs text-slate-300">Free Planning</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionShell id="about" title="About TripAdvisor">
        <p className="mb-8 max-w-2xl text-sm text-[color:var(--text-muted)]">
          TripAdvisor is your smart AI travel companion that creates personalized itineraries using weather, transport, budget, and local insights. With AI-powered planning, smart recommendations, and a built-in chat assistant, it helps travelers save time and enjoy seamless trips with ease.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard icon="🧠" title="AI-powered planning" body="Smart AI models create reliable and optimized travel itineraries instantly." />
          <GlassCard icon="⏱️" title="Time-saving" body="Plan complete multi-day trips within seconds." />
          <GlassCard icon="💸" title="Budget optimization" body="Track and manage transport, hotels, food, and activity costs easily." />
          <GlassCard icon="🧭" title="Smart recommendations" body="Discover personalized attractions, hidden gems, and local experiences." />
          <GlassCard icon="❤️" title="Personalized" body="Tailored plans for solo travelers, couples, families, or groups." />
          <GlassCard icon="💬" title="RAG chat assistant" body="Chat with an AI assistant that understands your itinerary and answers travel questions contextually." />
        </div>
      </SectionShell>

      <SectionShell id="how-it-works" title="How It Works">
        <p className="mb-8 max-w-2xl text-sm text-[color:var(--text-muted)]">A smooth four-step journey from your travel idea to a complete smart itinerary :</p>

        <div className="grid gap-4 md:grid-cols-4">
          <motion.div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-6 backdrop-blur-xl" whileHover={{ y: -4 }}>
            <div className="text-3xl font-extrabold text-orange-400">01</div>
            <div className="mt-2 text-sm font-semibold">Enter trip details</div>
            <div className="mt-1 text-xs text-[color:var(--text-muted)]">Add your origin, destination, travel dates, budget, and preferences.</div>
          </motion.div>
          <motion.div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-6 backdrop-blur-xl" whileHover={{ y: -4 }}>
            <div className="text-3xl font-extrabold text-orange-400">02</div>
            <div className="mt-2 text-sm font-semibold">AI processes data</div>
            <div className="mt-1 text-xs text-[color:var(--text-muted)]">Our AI processes weather, transport options, travel trends, and predictions.</div>
          </motion.div>
          <motion.div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-6 backdrop-blur-xl" whileHover={{ y: -4 }}>
            <div className="text-3xl font-extrabold text-orange-400">03</div>
            <div className="mt-2 text-sm font-semibold">Get smart itinerary</div>
            <div className="mt-1 text-xs text-[color:var(--text-muted)]">Receive a personalized day-wise travel plan with hotel suggestions and estimated costs.</div>
          </motion.div>
          <motion.div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-6 backdrop-blur-xl" whileHover={{ y: -4 }}>
            <div className="text-3xl font-extrabold text-orange-400">04</div>
            <div className="mt-2 text-sm font-semibold">Explore & customize</div>
            <div className="mt-1 text-xs text-[color:var(--text-muted)]">Modify your itinerary anytime and chat with the AI assistant for recommendations and answers.</div>
          </motion.div>
        </div>

      </SectionShell>

      <SectionShell id="share" title="Share Your Trip">
        <motion.div
          className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-6 text-sm text-[color:var(--text-muted)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-3 font-semibold">Share your trip link</div>
          <div className="text-xs text-[color:var(--text-muted)]">
            Share a link from Facebook, Youtube, Instagram, X, TikTok, Snapchat, LinkedIn, Vimo, Pinterest, Reddit, WhatsApp, Telegram, Discord. Other URLs are blocked for safety.
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="flex-1 rounded-2xl bg-[color:var(--glass)] px-4 py-3 text-sm outline-none ring-1 ring-[color:var(--glass-border)] placeholder:text-[color:var(--text-muted)] disabled:opacity-50"
              value={videoUrl}
              onChange={(e) => {
                setShareSuccess(null)
                setVideoUrl(e.target.value)
              }}
              placeholder={user ? "Social media link's only......" : "Please sign in to share your trip"}
              disabled={!user}
            />
            <motion.button
              type="button"
              className="rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
              disabled={!user || !canShare || sharing}
              whileHover={{ y: -1 }}
              onClick={async () => {
                if (!user) {
                  openAuthModal('signin')
                  return
                }

                setSharing(true)
                setShareSuccess(null)
                try {
                  await api.post('/api/share-video', { videoUrl: videoUrl.trim() })
                  setShareSuccess('Thanks! We sent your submission to the team.')
                  setVideoUrl('')
                } catch (e) {
                  setShareSuccess(e?.response?.data?.detail || e?.message || 'Could not submit this video link.')
                } finally {
                  setSharing(false)
                }
              }}
            >
              {sharing ? 'Sharing...' : 'Share'}
            </motion.button>
          </div>

          {shareSuccess ? (
            <div className="mt-3 text-xs text-[color:var(--text-soft)]">
              <span className="text-orange-300">• </span>
              {shareSuccess}
            </div>
          ) : null}
        </motion.div>
      </SectionShell>

      <SectionShell id="contact" title="Get in touch">
        <div className="grid gap-6 md:grid-cols-3">
          <motion.div
            className="group rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-orange-300/30 hover:bg-white/15"
            whileHover={{ y: -4 }}
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-400/15 ring-1 ring-orange-400/30">
              <span className="text-3xl">✉️</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200/90">Email</div>
            <div className="mt-4 text-base font-semibold text-white">binoddattkapadi@gmail.com</div>
          </motion.div>
          <motion.div
            className="group rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/15"
            whileHover={{ y: -4 }}
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/15 ring-1 ring-cyan-400/30">
              <span className="text-3xl">📞</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/90">Phone</div>
            <div className="mt-4 text-base font-semibold text-white">+977 9840047473</div>
          </motion.div>
          <motion.div
            className="group rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/15"
            whileHover={{ y: -4 }}
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-violet-400/15 ring-1 ring-violet-400/30">
              <span className="text-3xl">📍</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-200/90">Location</div>
            <div className="mt-4 text-base font-semibold text-white">Kathmandu, Nepal</div>
          </motion.div>
        </div>
      </SectionShell>
    </main>
  )
}

