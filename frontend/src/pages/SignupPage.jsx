import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SignupPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/?signup=true', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg-0)]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
        <p className="text-[color:var(--text-soft)] text-sm">Redirecting to sign up...</p>
      </div>
    </div>
  )
}
