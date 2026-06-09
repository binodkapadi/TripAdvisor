import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createApiClient } from '../../lib/apiClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const api = useMemo(() => createApiClient(), [])

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('authToken')
    console.log('=== AUTH PROVIDER INITIALIZATION ===')
    console.log('Token found in localStorage:', !!token)

    if (token) {
      const apiWithToken = createApiClient({ token })
      console.log('Validating token with API call...')
      apiWithToken
        .get('/api/user/profile')
        .then((response) => {
          const userData = response.data
          console.log('User data loaded from profile endpoint:', userData)
          setUser({
            uid: userData.email,
            email: userData.email,
            displayName: userData.fullName,
            photoURL: userData.profileImageBase64,
          })
          console.log('User state set from token validation:', userData.email)
        })
        .catch((error) => {
          console.error('Token validation failed:', error)
          localStorage.removeItem('authToken')
        })
        .finally(() => {
          setAuthLoading(false)
        })
    } else {
      console.log('No token found in localStorage')
      setAuthLoading(false)
    }
  }, [])

  const authApi = useMemo(() => {
    async function sendResetCode(email) {
      try {
        console.log('Sending reset code to:', email)
        await api.post('/api/auth/send-code', {
          email: email.trim(),
          purpose: 'forgot_password'
        })
        console.log('Reset code sent successfully')
      } catch (error) {
        console.error('Send reset code error:', error)
        throw error
      }
    }

    async function resetPassword(email, code, newPassword) {
      try {
        console.log('Resetting password for:', email)
        await api.post('/api/auth/verify-code', {
          email: email.trim(),
          code: code.trim(),
          purpose: 'forgot_password',
          newPassword: newPassword
        })
        console.log('Password reset successfully')
      } catch (error) {
        console.error('Reset password error:', error)
        throw error
      }
    }

    async function signInWithEmail(email, password, fullName) {
      try {
        console.log('Signing in with email:', email)

        if (fullName) {
          // Sign up flow
          const response = await api.post('/api/auth/send-code', {
            email: email.trim(),
            fullName: fullName.trim(),
            password: password,
            purpose: 'signup'
          })

          const token = response.data.accessToken
          localStorage.setItem('authToken', token)

          // Set user state immediately for signup
          setUser({
            uid: email,
            email: email,
            displayName: fullName
          })

          console.log('Sign up successful')
        } else {
          // Sign in flow
          const response = await api.post('/api/auth/login', {
            email: email.trim(),
            password: password
          })

          const token = response.data.accessToken
          localStorage.setItem('authToken', token)

          // Fetch user profile after login
          const apiWithToken = createApiClient({ token })
          const profileResponse = await apiWithToken.get('/api/user/profile')
          const userData = profileResponse.data

          setUser({
            uid: userData.email,
            email: userData.email,
            displayName: userData.fullName,
            photoURL: userData.profileImageBase64
          })

          console.log('Sign in successful')
        }
      } catch (error) {
        console.error('Email sign in error:', error)
        throw error
      }
    }

    async function signInWithGoogle() {
      try {
        console.log('Initiating Google sign in')
        const origin = encodeURIComponent(window.location.origin)
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/auth/google?state=${origin}`
      } catch (error) {
        console.error('Google sign in error:', error)
        throw error
      }
    }

    async function signInWithGithub() {
      try {
        console.log('Initiating GitHub sign in')
        const origin = encodeURIComponent(window.location.origin)
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/auth/github?state=${origin}`
      } catch (error) {
        console.error('GitHub sign in error:', error)
        throw error
      }
    }

    async function signInWithLinkedIn() {
      try {
        console.log('Initiating LinkedIn sign in')
        const origin = encodeURIComponent(window.location.origin)
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/auth/linkedin?state=${origin}`
      } catch (error) {
        console.error('LinkedIn sign in error:', error)
        throw error
      }
    }

    async function signInWithCustomToken(token) {
      try {
        console.log('Signing in with custom token')
        localStorage.setItem('authToken', token)

        const apiWithToken = createApiClient({ token })
        const profileResponse = await apiWithToken.get('/api/user/profile')
        const userData = profileResponse.data

        setUser({
          uid: userData.email,
          email: userData.email,
          displayName: userData.fullName,
          photoURL: userData.profileImageBase64,
        })

        console.log('Custom token sign in successful')
      } catch (error) {
        console.error('Custom token sign in error:', error)
        throw error
      }
    }

    async function signUp(email, fullName, password, verificationCode) {
      try {
        console.log('Signing up:', email)

        const payload = {
          email: email.trim(),
          password: password,
          fullName: fullName.trim(),
          purpose: 'signup',
        }

        if (verificationCode) {
          payload.code = verificationCode
        }

        const response = await api.post('/api/auth/verify-code', payload)
        const token = response.data.accessToken

        localStorage.setItem('authToken', token)

        setUser({
          uid: email.trim(),
          email: email.trim(),
          displayName: fullName.trim(),
          photoURL: null,
        })

        console.log('Sign up successful')
      } catch (error) {
        console.error('Sign up error:', error)
        throw error
      }
    }

    async function sendSignupCode(email, fullName) {
      try {
        console.log('Sending signup code to:', email)
        const payload = {
          email: email.trim(),
          purpose: 'signup'
        }
        if (fullName) {
          payload.fullName = fullName.trim()
        }
        await api.post('/api/auth/send-code', payload)
        console.log('Signup code sent successfully')
      } catch (error) {
        console.error('Send signup code error:', error)
        throw error
      }
    }

    async function uploadProfilePhoto(imageBase64, mimeType) {
      try {
        const response = await api.post('/api/user/profile/photo', {
          imageBase64,
          mimeType,
        })
        if (response.data?.ok) {
          const dataUri = `data:${mimeType};base64,${imageBase64}`
          setUser((prevUser) => prevUser ? { ...prevUser, photoURL: dataUri } : prevUser)
        }
        return response.data
      } catch (error) {
        console.error('Upload profile photo error:', error)
        throw error
      }
    }

    async function getIdToken() {
      return localStorage.getItem('authToken')
    }

    return {
      signUp,
      sendSignupCode,
      sendResetCode,
      resetPassword,
      signInWithEmail,
      signInWithGoogle,
      signInWithGithub,
      signInWithLinkedIn,
      signInWithCustomToken,
      uploadProfilePhoto,
      getIdToken,
      signOutUser: () => {
        localStorage.removeItem('authToken')
        localStorage.removeItem('chat_history')
        setUser(null)
      },
    }
  }, [api])

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('signin')

  const value = useMemo(() => ({
    ...authApi,
    user,
    authLoading,
    authModalOpen,
    authModalMode,
    setAuthModalMode,
    openAuthModal: (mode = 'signin') => {
      setAuthModalMode(mode)
      setAuthModalOpen(true)
    },
    closeAuthModal: () => {
      setAuthModalOpen(false)
    }
  }), [authApi, user, authLoading, authModalOpen, authModalMode])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
