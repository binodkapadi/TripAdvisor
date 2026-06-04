import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import AuthModal from '../components/auth/AuthModal.jsx'
import { useAuth } from '../state/auth/AuthProvider.jsx'
import ChatAssistant from '../components/ChatAssistant.jsx'
import { useTrip } from '../state/trip/TripProvider.jsx'

export default function AppShell({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const { authModalOpen, authModalMode, setAuthModalMode, openAuthModal, closeAuthModal } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('signin') === 'true') {
      openAuthModal('signin')
      const newParams = new URLSearchParams(location.search)
      newParams.delete('signin')
      const searchStr = newParams.toString()
      navigate(location.pathname + (searchStr ? `?${searchStr}` : ''), { replace: true })
    } else if (params.get('signup') === 'true') {
      openAuthModal('signup')
      const newParams = new URLSearchParams(location.search)
      newParams.delete('signup')
      const searchStr = newParams.toString()
      navigate(location.pathname + (searchStr ? `?${searchStr}` : ''), { replace: true })
    }
  }, [location.pathname, location.search, navigate, openAuthModal])

  const { trip } = useTrip()

  return (
    <div className="min-h-screen text-[color:var(--text)]">
      <Navbar isHome={isHome} />
      <div className="pt-20">{children}</div>
      <Footer />
      <AuthModal
        open={authModalOpen}
        mode={authModalMode}
        setMode={setAuthModalMode}
        onClose={closeAuthModal}
      />
      <ChatAssistant itineraryId={trip?.itineraryId} />
    </div>
  )
}

