import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../state/auth/AuthProvider.jsx'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signInWithCustomToken } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('accessToken')
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth callback error:', error)
      navigate('/?error=auth_failed')
      return
    }

    if (token) {
      signInWithCustomToken(token)
        .then(() => {
          navigate('/')
        })
        .catch((error) => {
          console.error('Token sign in error:', error)
          navigate('/?error=auth_failed')
        })
    } else {
      navigate('/?error=no_token')
    }
  }, [searchParams, navigate, signInWithCustomToken])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Completing sign in...</p>
      </div>
    </div>
  )
}
