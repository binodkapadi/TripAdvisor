import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { createApiClient } from '../lib/apiClient.js'
import { useAuth } from '../state/auth/AuthProvider.jsx'
import { useTrip } from '../state/trip/TripProvider.jsx'


function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-[color:var(--glass)] ${className}`} />
}

function daysArrayFromItinerary(itinerary) {
  if (!itinerary) return []
  if (Array.isArray(itinerary)) return itinerary
  if (Array.isArray(itinerary.days)) return itinerary.days
  if (typeof itinerary === 'string') return itinerary.split('\n').filter(Boolean)
  return []
}

function parseCurrencyValue(text) {
  if (!text) return undefined
  const normalized = text.replace(/,/g, '')

  const explicitMoney = [...normalized.matchAll(/(?:\$|usd|dollars|bucks|eur|€|£|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)/gi)]
  if (explicitMoney.length) return Number(explicitMoney[0][1])

  const explicitAfter = [...normalized.matchAll(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:usd|dollars|bucks|eur|€|£|₹)/gi)]
  if (explicitAfter.length) return Number(explicitAfter[0][1])

  const numberMatches = [...normalized.matchAll(/([0-9]+(?:\.[0-9]{1,2})?)/g)].map((m) => Number(m[1])).filter((n) => !Number.isNaN(n))
  if (numberMatches.length === 0) return undefined

  const lower = text.toLowerCase()
  const disqualifyingWords = /(night|nights|day|days|person|people|traveler|travel|group|hour|hours|minute|minutes|km|kilometer|mile)/
  if (numberMatches.length === 1 && !disqualifyingWords.test(lower)) return numberMatches[0]

  const filtered = numberMatches.filter((value) => {
    const index = normalized.indexOf(String(value))
    if (index === -1) return false
    const segment = lower.slice(Math.max(0, index - 12), index + String(value).length + 12)
    return !disqualifyingWords.test(segment)
  })
  if (filtered.length) return filtered[0]

  return undefined
}

function extractCostValue(lines, labels) {
  const cleanedLabels = labels.map((label) => label.toLowerCase())
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (cleanedLabels.some((label) => lower.includes(label))) {
      const value = parseCurrencyValue(line)
      if (typeof value === 'number' && !Number.isNaN(value)) return value
    }
  }
  return undefined
}

function formatCurrency(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return `$${value.toLocaleString('en-US')}`
}

function deriveBudgetCategory(total, budget, days, people) {
  if (!budget || !days || !people) return 'Standard'
  const perPersonPerDay = budget / (days * people)
  if (perPersonPerDay <= 70) return 'Budget/Compact'
  if (perPersonPerDay <= 150) return 'Standard'
  if (perPersonPerDay <= 300) return 'Premium'
  return 'Luxury'
}

function generateBudgetAnalysis(total, budget, remaining, days, people) {
  if (!budget) return 'Your budget summary is ready.'
  const remainingRatio = remaining / budget
  const category = deriveBudgetCategory(total, budget, days, people)

  if (remaining < 0) {
    return `This cost is not enough; you need an additional ${formatCurrency(Math.abs(remaining))} to enjoy this trip as planned.`
  }

  if (remainingRatio <= 0.1) {
    return `Your budget is tight; consider reducing luxury activities or accommodation costs.`
  }

  if (remainingRatio >= 0.25) {
    return `Your budget comfortably supports a luxury experience with additional flexibility for shopping and premium activities.`
  }

  if (category === 'Luxury' || category === 'Premium') {
    return `Your budget is suitable for a ${category} trip. You can enjoy premium hotels, fine dining, guided tours, and comfortable transportation.`
  }

  return `Your budget is suitable for a ${category} trip with a focus on value without compromising comfort.`
}

function HotelImage({ h, idx }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Use useMemo for fallbackUrl so it doesn't change on every render
  const fallbackUrl = useMemo(() => `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=60&w=500&hotel=${idx}`, [idx])

  useEffect(() => {
    let isMounted = true
    const fetchImage = async () => {
      if (!h.name) {
        if (isMounted) setLoading(false)
        return
      }
      try {
        const api = createApiClient()
        const res = await api.get('/api/images/hotel', { 
          params: { name: h.name, location: h.location || '' } 
        })
        if (isMounted) {
          setImageUrl(res.data?.imageUrl || fallbackUrl)
        }
      } catch (e) {
        console.error('Failed to fetch hotel image', e)
        if (isMounted) setImageUrl(fallbackUrl)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchImage()
    return () => { isMounted = false }
  }, [h.name, h.location, fallbackUrl])

  return (
    <div className="relative w-full h-40 overflow-hidden bg-[color:var(--glass-strong)]">
      {/* Skeleton while fetching URL */}
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-[color:var(--glass-hover)]" />
      )}
      
      {/* Image with blur-up and hover zoom */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={h.name}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-110 ${
            imageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
          }`}
          onError={(e) => { 
            if (e.target.src !== fallbackUrl) {
              e.target.src = fallbackUrl 
            }
          }}
        />
      )}
      
      {/* Gradient Overlay for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 pointer-events-none" />
    </div>
  )
}

export default function PlanPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authLoading, openAuthModal } = useAuth()
  const { setGeneratedItinerary } = useTrip()

  const [form, setForm] = useState(() => ({
    fullName: '',
    email: '',
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    transportMode: 'Flight',
    travelType: 'Solo',
    people: 1,
    preferences: ''
  }))

  const [wasLoggedIn, setWasLoggedIn] = useState(false)

  useEffect(() => {
    if (user) {
      setWasLoggedIn(true)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      if (wasLoggedIn) {
        navigate('/')
      } else {
        openAuthModal('signin')
      }
    }
  }, [authLoading, user, openAuthModal, navigate, wasLoggedIn])

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || user.displayName || '',
        email: f.email || user.email || ''
      }))
    }
  }, [user])

  useEffect(() => {
    setForm((f) => {
      if (f.travelType === 'Solo') return { ...f, people: 1 }
      if (f.travelType === 'Couple') return { ...f, people: 2 }
      return f
    })
  }, [form.travelType])

  const [originQuery, setOriginQuery] = useState('')
  const [destQuery, setDestQuery] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destSuggestions, setDestSuggestions] = useState([])
  const [originLoading, setOriginLoading] = useState(false)
  const [destLoading, setDestLoading] = useState(false)
  const originTimer = useRef(null)
  const destTimer = useRef(null)

  useEffect(() => setOriginQuery(form.origin), [form.origin])
  useEffect(() => setDestQuery(form.destination), [form.destination])

  async function fetchAutocomplete({ query, kind }) {
    const api = createApiClient()
    const res = await api.get('/api/places/autocomplete', { params: { query, kind } })
    return res.data?.suggestions || []
  }

  useEffect(() => {
    if (!originQuery.trim()) {
      setOriginSuggestions([])
      return
    }
    setOriginLoading(true)
    clearTimeout(originTimer.current)
    originTimer.current = setTimeout(async () => {
      try {
        const suggestions = await fetchAutocomplete({ query: originQuery, kind: 'origin' })
        setOriginSuggestions(suggestions)
      } finally {
        setOriginLoading(false)
      }
    }, 350)
    return () => clearTimeout(originTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originQuery])

  useEffect(() => {
    if (!destQuery.trim()) {
      setDestSuggestions([])
      return
    }
    setDestLoading(true)
    clearTimeout(destTimer.current)
    destTimer.current = setTimeout(async () => {
      try {
        const suggestions = await fetchAutocomplete({ query: destQuery, kind: 'destination' })
        setDestSuggestions(suggestions)
      } finally {
        setDestLoading(false)
      }
    }, 350)
    return () => clearTimeout(destTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destQuery])

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [emailSent, setEmailSent] = useState(false)

  const travelTypeChoices = ['Solo', 'Couple', 'Family', 'Group/Friends']

  const peopleEditable = form.travelType === 'Family' || form.travelType === 'Group/Friends'

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setEmailSent(false)
    setResult(null)

    if (!form.fullName.trim() || !form.email.trim()) return setError('Please enter your full name and email.')
    if (!form.origin.trim() || !form.destination.trim()) return setError('Please enter origin and destination.')
    if (!form.startDate || !form.endDate) return setError('Please select start and end dates.')

    // Remove authentication requirement - allow access without sign-in

    setGenerating(true)
    try {
      // Create API client without token
      const api = createApiClient()
      
      console.log('Generating plan with form data:', form)
      console.log('API base URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')

      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        budget: Number(form.budget),
        transportMode: form.transportMode,
        travelType: form.travelType,
        numberOfPeople: Number(form.people),
        preferences: form.preferences
      }
      
      console.log('Sending payload:', payload)

      const res = await api.post('/api/ai/generate-plan', payload)
      const data = res.data || {}
      
      console.log('Plan generation response:', data)

      setResult(data)
      setGeneratedItinerary({ itineraryId: data.itineraryId, itinerary: data.optimizedItinerary })
      setEmailSent(data.emailSent || false)
    } catch (e) {
      console.error('Plan generation error:', e)
      console.error('Error response:', e.response?.data)
      console.error('Error status:', e.response?.status)
      console.error('Error message:', e.message)
      
      const errorMessage = e.response?.data?.detail || 
                           e.response?.data?.message || 
                           e.message || 
                           'Failed to generate plan. Please check your network connection and try again.'
      setError(errorMessage)
    } finally {
      setGenerating(false)
    }
  }

  const hotelCards = result?.hotels || []
  const days = daysArrayFromItinerary(result?.optimizedItinerary)

  const budgetSummary = useMemo(() => {
    const lines = (result?.costPredictor || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const accommodation = extractCostValue(lines, ['Accommodation', 'Hotel', 'Hotels'])
    const food = extractCostValue(lines, ['Food', 'Meals'])
    const localTransport = extractCostValue(lines, ['Local Transport', 'Local travel', 'Transport'])
    const activities = extractCostValue(lines, ['Sightseeing', 'Activities', 'Activities total', 'Tours'])
    const travelCost = extractCostValue(lines, ['Travel Cost (Origin', 'Outbound', 'Origin → Destination', 'Origin to Destination'])
    const returnTravelCost = extractCostValue(lines, ['Return Travel', 'Destination → Origin', 'Return'])
    const totalEstimated = extractCostValue(lines, ['Total Estimated Budget', 'Total Budget', 'Estimated Budget'])

    const daysCount = Math.max(1, days.length)
    const peopleCount = Number(form.people) || 1
    const baseBudget = Number(form.budget) || 0

    const defaultTravelCost = {
      Flight: 250,
      Train: 140,
      Bus: 90,
    }
    const travelUnit = defaultTravelCost[form.transportMode] || 120
    const fallbackTravelCost = Math.round(travelUnit * peopleCount)
    const fallbackReturnTravelCost = Math.round(travelUnit * peopleCount)

    const lowBudget = baseBudget < 500

    // Calculate accommodation using actual hotel prices if available
    let calculatedAccommodation
    if (accommodation) {
      calculatedAccommodation = accommodation
    } else if (hotelCards && hotelCards.length > 0) {
      // Use average hotel price × nights × number of rooms needed
      const avgHotelPrice = hotelCards.reduce((sum, h) => sum + (h.price || 0), 0) / hotelCards.length
      // For groups, assume need multiple rooms (1 room per 2 people minimum)
      const roomsNeeded = Math.ceil(peopleCount / 2)
      calculatedAccommodation = Math.round(avgHotelPrice * daysCount * roomsNeeded)
    } else {
      // Fallback to fixed per-night rates if no hotel data
      calculatedAccommodation = Math.round(Math.max(baseBudget * 0.24, daysCount * peopleCount * (lowBudget ? 60 : 110)))
    }

    const calculatedFood = food ?? Math.round(Math.max(baseBudget * 0.12, daysCount * peopleCount * (lowBudget ? 25 : 40)))
    const calculatedLocalTransport = localTransport ?? Math.round(Math.max(baseBudget * 0.08, daysCount * peopleCount * (lowBudget ? 15 : 25)))
    const calculatedActivities = activities ?? Math.round(Math.max(baseBudget * 0.14, daysCount * peopleCount * (lowBudget ? 30 : 45)))

    const calculatedTravelCost = travelCost ?? fallbackTravelCost
    const calculatedReturnTravelCost = returnTravelCost ?? travelCost ?? fallbackReturnTravelCost

    const itemSum = [
      calculatedAccommodation,
      calculatedFood,
      calculatedLocalTransport,
      calculatedActivities,
      calculatedTravelCost,
      calculatedReturnTravelCost,
    ].reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0)

    const qualityTotal = [accommodation, food, localTransport, activities, travelCost, returnTravelCost].filter((v) => typeof v === 'number').length
    const useItemSum = qualityTotal >= 4
    const totalFromLines = useItemSum ? itemSum : undefined
    const shouldUseSum = typeof totalEstimated === 'number'
      ? Math.abs((totalFromLines ?? 0) - totalEstimated) > Math.max(15, Math.round((totalFromLines ?? totalEstimated) * 0.12))
      : false

    const calculatedTotal = useItemSum && (!totalEstimated || shouldUseSum)
      ? itemSum
      : totalEstimated ?? itemSum

    const remaining = Math.round(baseBudget - calculatedTotal)
    const enough = remaining >= 0
    const category = deriveBudgetCategory(calculatedTotal, baseBudget, daysCount, peopleCount)
    const analysis = generateBudgetAnalysis(calculatedTotal, baseBudget, remaining, daysCount, peopleCount)

    const stayLabel = category === 'Luxury' ? 'Luxury Stay' : category === 'Premium' ? 'Premium Stay' : category === 'Standard' ? 'Comfort Stay' : 'Budget Stay'
    const nightsText = `${daysCount} night${daysCount === 1 ? '' : 's'}`

    return {
      accommodation: calculatedAccommodation,
      food: calculatedFood,
      localTransport: calculatedLocalTransport,
      activities: calculatedActivities,
      travelCost: calculatedTravelCost,
      returnTravelCost: calculatedReturnTravelCost,
      totalTravelCost: calculatedTravelCost + calculatedReturnTravelCost,
      totalEstimated: calculatedTotal,
      enteredBudget: baseBudget,
      remaining,
      enough: remaining >= 0,
      category,
      analysis,
      stayLabel,
      nightsText,
    }
  }, [result, form, days])

  const isFormValid = form.origin && form.destination && form.startDate && form.endDate && form.budget && form.transportMode && form.travelType && form.people

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20">
      <div className="mb-4 flex items-center gap-3">
        <button
          className="rounded-xl bg-[color:var(--glass)] px-4 py-2 text-sm ring-1 ring-[color:var(--glass-border)] transition hover:bg-[color:var(--glass-hover)]"
          onClick={() => navigate('/')}
          type="button"
        >
          ← Back to home
        </button>
        {emailSent ? <div className="text-xs text-green-300">Itinerary sent to your email.</div> : null}
      </div>

      {authLoading ? (
        <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-10 text-center backdrop-blur-xl">
          <h1 className="text-3xl font-extrabold">Checking your session...</h1>
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            One moment while we verify your sign-in status.
          </p>
        </div>
      ) : !user ? (
        <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-10 text-center backdrop-blur-xl">
          <h1 className="text-3xl font-extrabold">Sign in to start planning</h1>
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            To use the travel planning form and AI assistant, please sign in first.
          </p>
          <button
            type="button"
            className="mt-6 rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 cursor-pointer"
            onClick={() => openAuthModal('signin')}
          >
            Sign In to Continue
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
          <h1 className="text-2xl font-extrabold">Travel Planning Form</h1>
          <div className="text-sm text-[color:var(--text-muted)]">Fill your details and preferences to get a personalized travel plan.</div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[color:var(--text-soft)]">
            Full Name
            <input
              className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
              placeholder="Full Name"
            />
          </label>

          <label className="text-sm text-[color:var(--text-soft)]">
            Email
            <input
              className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="Email"
            />
          </label>

          <div className="relative md:col-span-1">
            <label className="text-sm text-[color:var(--text-soft)]">
              Origin
              <input
                className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
                value={originQuery}
                onChange={(e) => {
                  setOriginQuery(e.target.value)
                  setForm((f) => ({ ...f, origin: e.target.value }))
                }}
                placeholder="e.g. Mumbai, India"
                required
              />
            </label>
            <AnimatePresence>
              {originQuery.trim() && originSuggestions.length ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute z-10 mt-1 w-full rounded-2xl bg-[color:var(--glass-strong)] p-2 ring-1 ring-[color:var(--glass-border)] backdrop-blur-xl"
                >
                  {originLoading ? (
                    <div className="text-xs text-[color:var(--text-muted)]">Searching...</div>
                  ) : (
                    originSuggestions.slice(0, 6).map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full rounded-xl px-2 py-2 text-left text-xs text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]"
                        onClick={() => {
                          const desc = s.description || s.label || String(s)
                          setOriginQuery(desc)
                          setForm((f) => ({ ...f, origin: desc }))
                          setOriginSuggestions([])
                        }}
                      >
                        {s.description || s.label || String(s)}
                      </button>
                    ))
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="relative md:col-span-1">
            <label className="text-sm text-[color:var(--text-soft)]">
              Destination
              <input
                className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value)
                  setForm((f) => ({ ...f, destination: e.target.value }))
                }}
                placeholder="e.g. Bali, Indonesia"
                required
              />
            </label>
            <AnimatePresence>
              {destQuery.trim() && destSuggestions.length ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute z-10 mt-1 w-full rounded-2xl bg-[color:var(--glass-strong)] p-2 ring-1 ring-[color:var(--glass-border)] backdrop-blur-xl"
                >
                  {destLoading ? (
                    <div className="text-xs text-[color:var(--text-muted)]">Searching...</div>
                  ) : (
                    destSuggestions.slice(0, 6).map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full rounded-xl px-2 py-2 text-left text-xs text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]"
                        onClick={() => {
                          const desc = s.description || s.label || String(s)
                          setDestQuery(desc)
                          setForm((f) => ({ ...f, destination: desc }))
                          setDestSuggestions([])
                        }}
                      >
                        {s.description || s.label || String(s)}
                      </button>
                    ))
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <label className="text-sm text-[color:var(--text-soft)]">
            Start Date
            <input
              className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </label>

          <label className="text-sm text-[color:var(--text-soft)]">
            End Date
            <input
              className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              required
              min={form.startDate || new Date().toISOString().split('T')[0]}
            />
          </label>

          <label className="text-sm text-[color:var(--text-soft)]">
            Budget ($)
            <input
              className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              type="number"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              required
              min={0}
            />
          </label>

          <label className="text-sm text-[color:var(--text-soft)]">
            Transport Mode
            <select
              className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              value={form.transportMode}
              onChange={(e) => setForm((f) => ({ ...f, transportMode: e.target.value }))}
            >
              <option value="Flight">Flight</option>
              <option value="Train">Train</option>
              <option value="Bus">Bus</option>
            </select>
          </label>

          <div className="md:col-span-2">
            <div className="text-sm font-semibold text-[color:var(--text-muted)]">
              Travel Type
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  value: 'Solo',
                  title: 'Solo Traveler',
                  description: 'Exploring at your own pace',
                  icon: '🧳'
                },
                {
                  value: 'Couple',
                  title: 'Couple',
                  description: 'Romantic getaways',
                  icon: '❤️'
                },
                {
                  value: 'Family',
                  title: 'Family',
                  description: 'Kid-friendly activities',
                  icon: '👨‍👩‍👧‍👦'
                },
                {
                  value: 'Group/Friends',
                  title: 'Group/Friends',
                  description: 'Thrill-seekers group',
                  icon: '🎉'
                }
              ].map((option) => {
                const active = form.travelType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, travelType: option.value }))}
                    className={
                      'group rounded-3xl border p-4 text-left transition-all ' +
                      (active
                        ? 'border-2 border-orange-300 bg-[color:var(--glass-hover)] shadow-[0_18px_40px_rgba(255,130,0,0.18)]'
                        : 'border-[color:var(--glass-border)] bg-[color:var(--glass)] hover:border-orange-300/60 hover:bg-[color:var(--glass-hover)]')
                    }
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl shadow-sm ring-1 ring-[color:var(--glass-border)]">
                      {option.icon}
                    </div>
                    <div className="mt-4 text-sm font-semibold text-[color:var(--text)]">
                      {option.title}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--text-soft)]">
                      {option.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="md:col-span-2 text-sm text-[color:var(--text-soft)]">
            Number of people
            <input
              className="mt-1 w-full rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              type="number"
              value={form.people}
              disabled={!peopleEditable}
              onChange={(e) => setForm((f) => ({ ...f, people: e.target.value }))}
              required
              min={1}
            />
            {!peopleEditable ? <div className="mt-1 text-xs text-[color:var(--text-muted)]">Auto-set based on travel type.</div> : null}
          </label>

          <label className="md:col-span-2 text-sm text-[color:var(--text-soft)]">
            Preferences
            <textarea
              className="mt-1 min-h-[110px] w-full resize-y rounded-xl bg-[color:var(--glass)] px-3 py-2 outline-none ring-1 ring-[color:var(--glass-border)]"
              value={form.preferences}
              onChange={(e) => setForm((f) => ({ ...f, preferences: e.target.value }))}
              placeholder="e.g. food, adventure, history, beaches, off-the-beaten-path..."
            />
          </label>

          {error ? (
            <div className="md:col-span-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <motion.button
              className="w-full rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              whileHover={{ y: -1 }}
              disabled={generating || !isFormValid}
              type="submit"
              title={!isFormValid ? "Please fill all required details" : ""}
            >
              {generating ? 'Generating Plan...' : 'Generate Plan'}
            </motion.button>
          </div>
        </form>
      </div>
      )}

      <AnimatePresence>
        {generating ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
              <div className="text-sm font-semibold">🌦 Weather Insights</div>
              <Skeleton className="mt-3 h-24" />
            </div>
            <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
              <div className="text-sm font-semibold">✈️ Transport Details</div>
              <Skeleton className="mt-3 h-24" />
            </div>
            <div className="md:col-span-2 rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
              <div className="text-sm font-semibold">🏨 Hotels & Cost Predictor</div>
              <Skeleton className="mt-3 h-32" />
              <Skeleton className="mt-3 h-24" />
            </div>
            <div className="md:col-span-2 rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
              <div className="text-sm font-semibold">🗺 Optimized Itinerary (Day-wise)</div>
              <Skeleton className="mt-3 h-28" />
              <Skeleton className="mt-3 h-28" />
              <Skeleton className="mt-3 h-28" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!generating && result ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl overflow-hidden">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="text-xl">🌦</span> Weather Insights
              <span className="ml-auto text-[11px] font-normal text-[color:var(--text-muted)]">
                {form.startDate && form.endDate ? `${new Date(form.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(form.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Trip dates'}
              </span>
            </div>
            
            <div className="flex flex-col gap-4">
              <img 
                src="https://images.unsplash.com/photo-1592210450359-65115885c399?auto=format&fit=crop&q=60&w=800" 
                alt="Weather Scene" 
                className="w-full h-32 object-cover rounded-2xl shadow-inner"
                onError={(e) => e.target.style.display = 'none'}
              />
              
              <div className="whitespace-pre-wrap text-sm text-[color:var(--text-soft)] leading-relaxed bg-[color:var(--glass-strong)] p-4 rounded-2xl border border-[color:var(--glass-border)]">
                {result.weatherInsights}
              </div>

              <img 
                src="https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&q=60&w=800" 
                alt="Sky view" 
                className="w-full h-24 object-cover rounded-2xl opacity-40 grayscale hover:grayscale-0 transition-all"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="text-xl">✈️</span> Transport Details
              <span className="ml-auto text-[11px] font-normal text-[color:var(--text-muted)] bg-[color:var(--glass-strong)] px-3 py-1 rounded-full">
                {form.transportMode} • {form.origin} → {form.destination}
              </span>
            </div>
            <div className="p-4 bg-[color:var(--glass-strong)] rounded-2xl border border-[color:var(--glass-border)]">
              <div className="whitespace-pre-wrap text-sm text-[color:var(--text-soft)] italic">
                {result.transportDetails}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
            <div className="text-sm font-semibold">🏨 Hotels</div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hotelCards.map((h, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] overflow-hidden group"
                  whileHover={{ y: -3 }}
                >
                  <HotelImage h={h} idx={idx} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold truncate" title={h.name}>{h.name || 'Hotel'}</div>
                      <div className="text-xs font-bold text-orange-200 shrink-0">{h.price ? `$${h.price}` : ''}</div>
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--text-muted)] flex items-center gap-1">
                      <span className="text-yellow-500">★</span> {h.rating ?? 'N/A'} / 5
                    </div>
                    <div className="mt-2 text-xs text-[color:var(--text-soft)] line-clamp-1">📍 {h.location}</div>
                    <a
                      href={h.mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 transition"
                    >
                      <span>🗺 View on Maps</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  </div>
                </motion.div>
              ))}
              {hotelCards.length === 0 ? <div className="text-sm text-[color:var(--text-muted)]">No hotel data returned.</div> : null}
            </div>

            <div className="mt-5 rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-slate-900/20 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.18)] border border-white/10">
              <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[color:var(--text)]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  Cost Predictor
                </div>
                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200">{budgetSummary.category}</span>
              </div>

              <div className="mt-4 space-y-3 text-sm text-[color:var(--text-soft)]">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--glass-strong)] px-4 py-3 border border-[color:var(--glass-border)]">
                  <span>• Accommodation</span>
                  <span className="font-semibold text-[color:var(--text)]">{formatCurrency(budgetSummary.accommodation)} <span className="text-[10px] text-[color:var(--text-muted)]">({budgetSummary.nightsText} – {budgetSummary.stayLabel})</span></span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--glass-strong)] px-4 py-3 border border-[color:var(--glass-border)]">
                  <span>• Food</span>
                  <span className="font-semibold text-[color:var(--text)]">{formatCurrency(budgetSummary.food)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--glass-strong)] px-4 py-3 border border-[color:var(--glass-border)]">
                  <span>• Local Transport</span>
                  <span className="font-semibold text-[color:var(--text)]">{formatCurrency(budgetSummary.localTransport)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--glass-strong)] px-4 py-3 border border-[color:var(--glass-border)]">
                  <span>• Sightseeing & Activities</span>
                  <span className="font-semibold text-[color:var(--text)]">{formatCurrency(budgetSummary.activities)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--glass-strong)] px-4 py-3 border border-[color:var(--glass-border)]">
                  <div className="flex flex-col gap-1">
                    <span>• Round Trip Travel ({form.transportMode})</span>
                    <span className="text-[11px] text-[color:var(--text-muted)]">{form.origin} → {form.destination} → {form.origin}</span>
                  </div>
                  <span className="font-semibold text-[color:var(--text)]">
                    {formatCurrency(budgetSummary.travelCost + budgetSummary.returnTravelCost)}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-[color:var(--glass-border)] pt-4">
                <div className="flex items-center justify-between gap-3 text-sm text-[color:var(--text-muted)]">
                  <span className="font-medium">Total Estimated Budget</span>
                  <span className="font-semibold text-[color:var(--text)]">{formatCurrency(budgetSummary.totalEstimated)} USD</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[color:var(--text-muted)]">
                  <span>Your Entered Budget</span>
                  <span className="font-semibold text-[color:var(--text)]">{formatCurrency(budgetSummary.enteredBudget)} USD</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span>Remaining Balance</span>
                  <span className="font-semibold text-[color:var(--text)]">{formatCurrency(budgetSummary.remaining)} USD</span>
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-[color:var(--glass-strong)] p-4 text-sm border border-[color:var(--glass-border)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-[color:var(--text)]">Budget Status</div>
                  <div className={"rounded-full px-3 py-1 text-xs font-semibold " + (budgetSummary.enough ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200')}>
                    {budgetSummary.enough ? 'Enough for trip' : 'Not enough for trip'}
                  </div>
                </div>
                {!budgetSummary.enough ? (
                  <div className="mt-2 text-[color:var(--text-muted)]">
                    You need an additional {formatCurrency(Math.abs(budgetSummary.remaining))} to enjoy this trip comfortably.
                  </div>
                ) : (
                  <div className="mt-2 text-[color:var(--text-muted)]">
                    The budget you entered is sufficient for the estimated travel costs.
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-3xl bg-[color:var(--glass-strong)] p-4 text-sm text-[color:var(--text-soft)] border border-[color:var(--glass-border)]">
                <div className="font-semibold text-[color:var(--text)]">✨ Budget Analysis:</div>
                <div className="mt-2 leading-6">{budgetSummary.analysis}</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="text-xl">🤖</span> AI Recommendations
            </div>
            <div className="grid gap-2">
              {result.aiRecommendations.split(/(?:\n|•)/).filter(l => l.trim()).map((rec, i) => (
                <div key={i} className="flex gap-3 text-sm text-[color:var(--text-soft)] bg-[color:var(--glass-strong)] p-3 rounded-xl border border-[color:var(--glass-border)]">
                  <span className="text-orange-400 shrink-0">✦</span>
                  <span className="leading-relaxed">{rec.replace(/^[-*•]\s*/, '').trim()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-5 backdrop-blur-xl">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🗺</span> Optimized Itinerary
            </div>
            <div className="grid gap-6">
              {days.map((d, idx) => {
                const lines = d.split('\n').filter(l => l.trim())
                const title = lines[0] || `Day ${idx + 1}`
                const activities = lines.slice(1)
                
                return (
                  <div key={idx} className="relative pl-8 border-l-2 border-orange-500/30 ml-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-orange-500 border-4 border-[color:var(--glass-strong)]" />
                    <h3 className="text-sm font-bold text-orange-200 mb-3">{title}</h3>
                    <div className="space-y-3">
                      {activities.map((act, i) => (
                        <div key={i} className="flex gap-3 text-sm text-[color:var(--text-soft)] bg-[color:var(--glass-strong)] p-3 rounded-xl border border-[color:var(--glass-border)] transition hover:border-orange-500/40">
                          <span className="text-orange-400 shrink-0">•</span>
                          <span>{act.replace(/^[•*-]\s*/, '')}</span>
                        </div>
                      ))}
                      {activities.length === 0 && (
                         <div className="text-xs text-[color:var(--text-muted)] italic">
                           Detailed plan for this day is coming soon...
                         </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {days.length === 0 ? <div className="text-sm text-[color:var(--text-muted)]">No itinerary returned.</div> : null}
            </div>
          </div>

          {/* Email Notification */}
          {result.emailSent && (
            <div className="rounded-3xl border border-green-400/20 bg-green-400/10 p-4 text-center">
              <div className="text-sm font-semibold text-green-300">📧 Itinerary Sent!</div>
              <div className="mt-1 text-xs text-green-200">Your complete itinerary has been sent to your email.</div>
            </div>
          )}
        </div>
      ) : null}

    </main>
  )
}

