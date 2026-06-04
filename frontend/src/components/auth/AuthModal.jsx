import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../state/auth/AuthProvider.jsx'
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react'
import {
  isEmailAllowed,
  PasswordStrengthValidator,
  ConfirmPasswordValidator,
  isPasswordValid,
  EmailDomainValidator
} from './AuthValidationHelpers.jsx'

export default function AuthModal({ open, mode, setMode, onClose }) {
  const {
    signInWithEmail,
    signInWithGoogle,
    signInWithGithub,
    signInWithLinkedIn,
    sendSignupCode,
    signUp,
    sendResetCode,
    resetPassword,
    authLoading
  } = useAuth()

  // General States
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Sign In States
  const [signinForm, setSigninForm] = useState({ email: '', password: '' })
  const [showSigninPassword, setShowSigninPassword] = useState(false)

  // Sign Up States
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [signupStage, setSignupStage] = useState('details') // 'details' | 'verification' | 'success'
  const [signupOtp, setSignupOtp] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState('email') // 'email' | 'code' | 'success'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false)

  // Resend Timer State
  const [resendTimer, setResendTimer] = useState(0)

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Scrollable container ref
  const scrollContainerRef = useRef(null)

  // Scroll to top when mode/stage changes to ensure smooth vertical flow
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
    setError(null)
  }, [mode, signupStage, forgotStep])

  // Clear states when modal is opened/closed
  useEffect(() => {
    if (!open) {
      setError(null)
      setLoading(false)
      setSigninForm({ email: '', password: '' })
      setSignupForm({ fullName: '', email: '', password: '', confirmPassword: '' })
      setSignupStage('details')
      setSignupOtp('')
      setForgotStep('email')
      setForgotEmail('')
      setForgotOtp('')
      setForgotNewPassword('')
      setForgotConfirmPassword('')
      setShowSigninPassword(false)
      setShowSignupPassword(false)
      setShowSignupConfirmPassword(false)
      setShowForgotNewPassword(false)
      setShowForgotConfirmPassword(false)
    }
  }, [open])

  // Auto redirect to Sign In after Sign Up success
  useEffect(() => {
    if (signupStage === 'success') {
      const timer = setTimeout(() => {
        setSignupStage('details')
        setMode('signin')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [signupStage, setMode])

  // Auto redirect to Sign In after Forgot Password reset success
  useEffect(() => {
    if (forgotStep === 'success') {
      const timer = setTimeout(() => {
        setForgotStep('email')
        setMode('signin')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [forgotStep, setMode])

  // --- Handlers ---
  async function handleSignIn(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmail(signinForm.email.trim(), signinForm.password)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSocialSignIn(providerFn) {
    setError(null)
    setLoading(true)
    try {
      await providerFn()
      onClose()
    } catch (err) {
      setError(err?.message || 'Social login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendSignupCode(e) {
    e.preventDefault()
    setError(null)

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!isPasswordValid(signupForm.password)) {
      setError('Password does not meet validation requirements')
      return
    }
    if (!isEmailAllowed(signupForm.email)) {
      setError('Email domain is not allowed')
      return
    }

    setLoading(true)
    try {
      await sendSignupCode(signupForm.email.trim(), signupForm.fullName)
      setSignupStage('verification')
      setResendTimer(60)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUp(
        signupForm.email.trim(),
        signupForm.fullName.trim(),
        signupForm.password,
        signupOtp.trim()
      )
      setSignupStage('success')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Invalid or expired verification code')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendForgotCode(e) {
    e.preventDefault()
    setError(null)
    if (!isEmailAllowed(forgotEmail)) {
      setError('Email domain is not allowed')
      return
    }
    setLoading(true)
    try {
      await sendResetCode(forgotEmail)
      setForgotStep('code')
      setResendTimer(60)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError(null)
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!isPasswordValid(forgotNewPassword)) {
      setError('Password does not meet validation requirements')
      return
    }
    setLoading(true)
    try {
      await resetPassword(forgotEmail, forgotOtp, forgotNewPassword)
      setForgotStep('success')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  // --- Validity Checks ---
  const isSignInValid = signinForm.email.trim() !== '' && signinForm.password !== ''

  const isSignupDetailsValid =
    signupForm.fullName.trim() !== '' &&
    isEmailAllowed(signupForm.email) &&
    isPasswordValid(signupForm.password) &&
    signupForm.password === signupForm.confirmPassword

  const isSignupOtpValid = signupOtp.trim().length === 6

  const isForgotEmailValid = forgotEmail.trim() !== '' && isEmailAllowed(forgotEmail)

  const isForgotResetValid =
    forgotOtp.trim().length === 6 &&
    forgotNewPassword !== '' &&
    isPasswordValid(forgotNewPassword) &&
    forgotNewPassword === forgotConfirmPassword

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[color:var(--bg-1)] border border-[color:var(--glass-border)] rounded-3xl shadow-[var(--shadow)] max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title and Close Button */}
            <div className="flex justify-between items-center p-6 border-b border-[color:var(--glass-border)] flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-[color:var(--text)]">
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && (signupStage === 'success' ? 'Success!' : 'Sign Up')}
                  {mode === 'forgot' && (forgotStep === 'success' ? 'Success!' : 'Reset Password')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] text-2xl transition-colors leading-none"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Container Area */}
            <div
              ref={scrollContainerRef}
              className="overflow-y-auto flex-1 px-6 py-6 scrollbar-thin scroll-smooth"
            >
              <div className="space-y-6">
                {/* --- 1. SIGN IN MODE --- */}
                {mode === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={signinForm.email}
                          onChange={(e) => setSigninForm({ ...signinForm, email: e.target.value })}
                          className="w-full px-4 py-3 pl-11 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                          required
                          placeholder="Enter your email"
                        />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showSigninPassword ? 'text' : 'password'}
                          value={signinForm.password}
                          onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })}
                          className="w-full px-4 py-3 pl-11 pr-12 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                          required
                          placeholder="Enter your password"
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                        <button
                          type="button"
                          onClick={() => setShowSigninPassword(!showSigninPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
                          aria-label={showSigninPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSigninPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Forgot Password Link */}
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-sm text-orange-400 hover:text-orange-300 font-semibold hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    {/* Sign In Button */}
                    <button
                      type="submit"
                      disabled={!isSignInValid || loading || authLoading}
                      className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:brightness-110 text-white-forced py-3.5 rounded-xl font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>

                    {/* Divider */}
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-[color:var(--glass-border)]"></div>
                      <span className="flex-shrink mx-4 text-xs text-[color:var(--text-muted)] font-medium">
                        or Sign In using
                      </span>
                      <div className="flex-grow border-t border-[color:var(--glass-border)]"></div>
                    </div>

                    {/* Social Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => handleSocialSignIn(signInWithGoogle)}
                        disabled={authLoading || loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 py-2.5 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                        title="Sign in with Google"
                      >
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialSignIn(signInWithGithub)}
                        disabled={authLoading || loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-600/10 hover:bg-slate-600/20 text-[color:var(--text)] border border-[color:var(--glass-border)] py-2.5 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                        title="Sign in with GitHub"
                      >
                        GitHub
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialSignIn(signInWithLinkedIn)}
                        disabled={authLoading || loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 py-2.5 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                        title="Sign in with LinkedIn"
                      >
                        LinkedIn
                      </button>
                    </div>

                    {error && (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-500 dark:text-rose-400 text-xs font-semibold">
                        {error}
                      </div>
                    )}

                    {/* Sign Up Link */}
                    <div className="text-center text-sm text-[color:var(--text-soft)] pt-2 border-t border-[color:var(--glass-border)]">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-orange-400 hover:text-orange-300 font-bold hover:underline transition-colors cursor-pointer"
                      >
                        Sign Up
                      </button>
                    </div>
                  </form>
                )}

                {/* --- 2. SIGN UP MODE --- */}
                {mode === 'signup' && (
                  <div>
                    {/* Stage Success */}
                    {signupStage === 'success' && (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-[color:var(--text)] mb-2">Account Created Successfully</h2>
                        <p className="text-[color:var(--text-soft)] text-sm mb-4">
                          Your account has been verified and registered. Redirecting to the Login page...
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSignupStage('details')
                            setMode('signin')
                          }}
                          className="w-full bg-gradient-to-r from-orange-400 to-red-500 text-white-forced py-3 rounded-xl font-bold hover:brightness-110 transition shadow-md cursor-pointer"
                        >
                          Go to Login
                        </button>
                      </div>
                    )}

                    {/* Stage Details (Input User Info) */}
                    {signupStage === 'details' && (
                      <form onSubmit={handleSendSignupCode} className="space-y-4">
                        {/* Full Name */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Full Name <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={signupForm.fullName}
                              onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                              className="w-full px-4 py-3 pl-11 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                              placeholder="Enter your full name"
                              required
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                          </div>
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Email <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              value={signupForm.email}
                              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                              className="w-full px-4 py-3 pl-11 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                              placeholder="Enter your email"
                              required
                            />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                          </div>
                          <EmailDomainValidator email={signupForm.email} />
                        </div>

                        {/* Password */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Password <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showSignupPassword ? 'text' : 'password'}
                              value={signupForm.password}
                              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                              className="w-full px-4 py-3 pl-11 pr-12 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                              placeholder="Create a password"
                              required
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                            <button
                              type="button"
                              onClick={() => setShowSignupPassword(!showSignupPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
                              aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                            >
                              {showSignupPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                          <PasswordStrengthValidator password={signupForm.password} />
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Confirm Password <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showSignupConfirmPassword ? 'text' : 'password'}
                              value={signupForm.confirmPassword}
                              onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                              className="w-full px-4 py-3 pl-11 pr-12 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                              placeholder="Confirm your password"
                              required
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                            <button
                              type="button"
                              onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
                              aria-label={showSignupConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showSignupConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                          <ConfirmPasswordValidator password={signupForm.password} confirmPassword={signupForm.confirmPassword} />
                        </div>

                        {error && (
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-500 dark:text-rose-400 text-xs font-semibold">
                            {error}
                          </div>
                        )}

                        {/* Send Verification Code Button */}
                        <button
                          type="submit"
                          disabled={!isSignupDetailsValid || loading}
                          className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:brightness-110 text-white-forced py-3.5 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending Code...
                            </>
                          ) : (
                            'Send Verification Code'
                          )}
                        </button>

                        {/* Already have an account */}
                        <div className="text-center text-sm text-[color:var(--text-soft)] pt-2 border-t border-[color:var(--glass-border)]">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => setMode('signin')}
                            className="text-orange-400 hover:text-orange-300 font-bold hover:underline transition-colors cursor-pointer"
                          >
                            Sign in
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Stage Verification (Enter OTP code) */}
                    {signupStage === 'verification' && (
                      <form onSubmit={handleCreateAccount} className="space-y-4">
                        <div className="bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl p-4">
                          <p className="text-[color:var(--text-soft)] text-sm leading-relaxed">
                            We've sent a verification code to <strong>{signupForm.email}</strong>.
                            Please enter it below to complete your registration.
                          </p>
                        </div>

                        {/* Form fields read-only review */}
                        <div className="text-xs bg-[color:var(--glass-strong)] border border-[color:var(--glass-border)] rounded-xl p-3 space-y-1 text-[color:var(--text-soft)] opacity-60">
                          <div><strong>Name:</strong> {signupForm.fullName}</div>
                          <div><strong>Email:</strong> {signupForm.email}</div>
                        </div>

                        {/* Verification Code OTP input */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Verification Code <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <input
                            type="text"
                            value={signupOtp}
                            onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-center text-2xl tracking-widest font-semibold"
                            placeholder="000000"
                            maxLength={6}
                            required
                            autoFocus
                          />
                        </div>

                        {error && (
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-500 dark:text-rose-400 text-xs font-semibold">
                            {error}
                          </div>
                        )}

                        {/* Create Account Button (placed below OTP input) */}
                        <button
                          type="submit"
                          disabled={!isSignupOtpValid || loading}
                          className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:brightness-110 text-white-forced py-3.5 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Creating Account...
                            </>
                          ) : (
                            'Verify & Create Account'
                          )}
                        </button>

                        <div className="text-center pt-2 mt-2">
                          <p className="text-[color:var(--text-soft)] text-sm mb-1">Didn't receive the code?</p>
                          {resendTimer > 0 ? (
                            <p className="text-indigo-600 font-bold text-sm">Resend in {resendTimer}s</p>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                setError(null)
                                setLoading(true)
                                try {
                                  await sendSignupCode(signupForm.email.trim(), signupForm.fullName)
                                  setSignupOtp('')
                                  setResendTimer(60)
                                } catch (err) {
                                  setError(err?.response?.data?.detail || err?.message || 'Failed to resend code')
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              className="text-indigo-600 hover:text-indigo-500 font-bold text-sm hover:underline transition-colors cursor-pointer"
                              disabled={loading}
                            >
                              Resend Code
                            </button>
                          )}
                        </div>

                        <div className="flex justify-center pt-3 border-t border-[color:var(--glass-border)] mt-4">
                          <button
                            type="button"
                            onClick={() => setSignupStage('details')}
                            className="text-orange-400 hover:text-orange-300 font-semibold text-sm hover:underline transition-colors cursor-pointer"
                          >
                            Back to Details
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* --- 3. FORGOT PASSWORD MODE --- */}
                {mode === 'forgot' && (
                  <div>
                    {forgotStep === 'success' && (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-[color:var(--text)] mb-2">Password Reset Successful</h2>
                        <p className="text-[color:var(--text-soft)] text-sm mb-4">
                          Your password has been successfully reset. Redirecting to the Login page...
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotStep('email')
                            setMode('signin')
                          }}
                          className="w-full bg-gradient-to-r from-orange-400 to-red-500 text-white-forced py-3 rounded-xl font-bold hover:brightness-110 transition shadow-md cursor-pointer"
                        >
                          Go to Login
                        </button>
                      </div>
                    )}

                    {forgotStep === 'email' && (
                      <form onSubmit={handleSendForgotCode} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Email Address
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className="w-full px-4 py-3 pl-11 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                              required
                              placeholder="Enter your email"
                            />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                          </div>
                          <EmailDomainValidator email={forgotEmail} />
                        </div>

                        {error && (
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-500 dark:text-rose-400 text-xs font-semibold">
                            {error}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={!isForgotEmailValid || loading}
                          className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:brightness-110 text-white-forced py-3.5 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending...
                            </>
                          ) : (
                            'Send Reset Code'
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setMode('signin')}
                          className="w-full text-center text-orange-400 hover:text-orange-300 font-semibold text-sm hover:underline transition-colors mt-2 cursor-pointer"
                        >
                          Back to Sign In
                        </button>
                      </form>
                    )}

                    {forgotStep === 'code' && (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        {/* Verification Code */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Verification Code
                          </label>
                          <input
                            type="text"
                            value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-center text-2xl tracking-widest font-semibold"
                            required
                            placeholder="000000"
                            maxLength={6}
                          />
                        </div>

                        {/* New Password */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showForgotNewPassword ? 'text' : 'password'}
                              value={forgotNewPassword}
                              onChange={(e) => setForgotNewPassword(e.target.value)}
                              className="w-full px-4 py-3 pl-11 pr-12 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                              required
                              placeholder="Enter new password"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                            <button
                              type="button"
                              onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
                              aria-label={showForgotNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showForgotNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                          <PasswordStrengthValidator password={forgotNewPassword} />
                        </div>

                        {/* Confirm New Password */}
                        <div>
                          <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showForgotConfirmPassword ? 'text' : 'password'}
                              value={forgotConfirmPassword}
                              onChange={(e) => setForgotConfirmPassword(e.target.value)}
                              className="w-full px-4 py-3 pl-11 pr-12 bg-[color:var(--glass)] border border-[color:var(--glass-border)] rounded-xl text-[color:var(--text)] placeholder-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200"
                              required
                              placeholder="Confirm new password"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] w-4 h-4" />
                            <button
                              type="button"
                              onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
                              aria-label={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showForgotConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                          <ConfirmPasswordValidator password={forgotNewPassword} confirmPassword={forgotConfirmPassword} />
                        </div>

                        {error && (
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-500 dark:text-rose-400 text-xs font-semibold">
                            {error}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={!isForgotResetValid || loading}
                          className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:brightness-110 text-white-forced py-3.5 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Resetting...
                            </>
                          ) : (
                            'Reset Password'
                          )}
                        </button>

                        <div className="text-center pt-2 mt-2">
                          <p className="text-[color:var(--text-soft)] text-sm mb-1">Didn't receive the code?</p>
                          {resendTimer > 0 ? (
                            <p className="text-indigo-600 font-bold text-sm">Resend in {resendTimer}s</p>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                setError(null)
                                setLoading(true)
                                try {
                                  await sendResetCode(forgotEmail)
                                  setForgotOtp('')
                                  setResendTimer(60)
                                } catch (err) {
                                  setError(err?.response?.data?.detail || err?.message || 'Failed to resend code')
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              className="text-indigo-600 hover:text-indigo-500 font-bold text-sm hover:underline transition-colors cursor-pointer"
                              disabled={loading}
                            >
                              Resend Code
                            </button>
                          )}
                        </div>

                        <div className="flex justify-center pt-3 border-t border-[color:var(--glass-border)] mt-4">
                          <button
                            type="button"
                            onClick={() => setMode('signin')}
                            className="text-orange-400 hover:text-orange-300 font-semibold text-sm hover:underline transition-colors cursor-pointer"
                          >
                            Back to Sign In
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
