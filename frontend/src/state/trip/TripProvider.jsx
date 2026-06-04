import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { createApiClient } from '../../lib/apiClient.js'

const TripContext = createContext(null)

export function TripProvider({ children }) {
  const { user, authLoading } = useAuth()
  
  const [trip, setTrip] = useState(() => {
    const saved = localStorage.getItem('currentTrip')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse currentTrip', e)
      }
    }
    return {
      itineraryId: null,
      itinerary: null,
      lastGeneratedAt: null
    }
  })

  // Recover latest itinerary on login or clear on logout
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setTrip({ itineraryId: null, itinerary: null, lastGeneratedAt: null })
      localStorage.removeItem('currentTrip')
      return
    }

    let isMounted = true
    const fetchLatestTrip = async () => {
      try {
        const api = createApiClient()
        const response = await api.get('/api/user/trips/latest')
        if (isMounted) {
          if (response.data && response.data.itineraryId) {
            const recoveredTrip = {
              itineraryId: response.data.itineraryId,
              itinerary: response.data.itinerary,
              lastGeneratedAt: Date.now()
            }
            setTrip(recoveredTrip)
            localStorage.setItem('currentTrip', JSON.stringify(recoveredTrip))
          } else {
            // New user, no itineraries
            setTrip({ itineraryId: null, itinerary: null, lastGeneratedAt: null })
            localStorage.removeItem('currentTrip')
          }
        }
      } catch (e) {
        console.error('Failed to fetch latest trip', e)
      }
    }
    
    fetchLatestTrip()

    return () => {
      isMounted = false
    }
  }, [user, authLoading])

  function setGeneratedItinerary(payload) {
    const newTrip = {
      itineraryId: payload.itineraryId,
      itinerary: payload.itinerary,
      lastGeneratedAt: Date.now()
    }
    setTrip(newTrip)
    localStorage.setItem('currentTrip', JSON.stringify(newTrip))
  }

  const value = useMemo(() => ({ trip, setGeneratedItinerary }), [trip])
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip must be used within TripProvider')
  return ctx
}

