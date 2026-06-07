import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../state/theme/ThemeProvider.jsx'
import { useAuth } from '../state/auth/AuthProvider.jsx'
import { Moon, Sun, Menu, X, Monitor } from 'lucide-react'
import ProfilePopover from './auth/ProfilePopover.jsx'

const navItems = [
  { label: 'Home', href: '/#home' },
  { label: 'About', href: '/#about' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Share Your Trip', href: '/#share' },
  { label: 'Contact', href: '/#contact' }
]

export default function Navbar({ isHome }) {
  const { mode, setMode } = useTheme()
  const { user, signOutUser, openAuthModal } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeMenuRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (!themeMenuOpen) return
    const handleClickOutside = (event) => {
      if (themeMenuRef.current?.contains(event.target)) return
      setThemeMenuOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [themeMenuOpen])

  const showNavbarBackground = useMemo(() => {
    if (location.pathname !== '/') return true
    return false
  }, [location.pathname])

  return (
    <header
      className={[
        'fixed left-0 right-0 top-0 z-40',
        'backdrop-blur-md',
        showNavbarBackground ? 'bg-[color:var(--glass-strong)]' : 'bg-transparent'
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo - Left */}
        <Link to="/#home" className="group inline-flex items-center gap-2">
          <motion.div
            className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--glass)] ring-1 ring-[color:var(--glass-border)] transition group-hover:bg-[color:var(--glass-hover)]"
            whileHover={{ rotate: -5 }}
            transition={{ duration: 0.25 }}
          >
            <span className="text-xl">✈︎</span>
          </motion.div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[color:var(--text)]">TripAdvisor</div>
            <div className="hidden text-xs text-[color:var(--text-muted)] md:block">AI-powered travel planning</div>
          </div>
        </Link>

        {/* Desktop Navigation - Center */}
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-[color:var(--text-soft)] transition hover:text-[color:var(--text)] hover:underline"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <ProfilePopover />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="hidden sm:inline-flex rounded-2xl bg-[color:var(--glass)] px-4 py-2 text-xs font-semibold text-[color:var(--text-soft)] ring-1 ring-[color:var(--glass-border)] transition hover:bg-[color:var(--glass-hover)] cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* Desktop Theme Selector */}
          <div ref={themeMenuRef} className="relative hidden sm:block">
            <motion.button
              className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--glass)] ring-1 ring-[color:var(--glass-border)] transition hover:bg-[color:var(--glass-hover)]"
              whileHover={{ rotate: 20 }}
              transition={{ duration: 0.25 }}
              onClick={() => setThemeMenuOpen((open) => !open)}
              aria-label="Open theme selector"
            >
              {mode === 'dark' ? (
                <Moon size={18} className="text-[color:var(--text)]" />
              ) : mode === 'light' ? (
                <Sun size={18} className="text-[color:var(--text)]" />
              ) : (
                <Monitor size={18} className="text-[color:var(--text)]" />
              )}
            </motion.button>

            <AnimatePresence>
              {themeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full z-20 mt-2 w-48 rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] p-2 shadow-[var(--shadow-soft)]"
                >
                  <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                    Theme
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('light')
                      setThemeMenuOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition ${mode === 'light'
                        ? 'bg-[color:var(--glass-hover)] text-[color:var(--text)]'
                        : 'text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]'
                      }`}
                  >
                    <Sun size={16} />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('dark')
                      setThemeMenuOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition ${mode === 'dark'
                        ? 'bg-[color:var(--glass-hover)] text-[color:var(--text)]'
                        : 'text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]'
                      }`}
                  >
                    <Moon size={16} />
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('system')
                      setThemeMenuOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition ${mode === 'system'
                        ? 'bg-[color:var(--glass-hover)] text-[color:var(--text)]'
                        : 'text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]'
                      }`}
                  >
                    <Monitor size={16} />
                    System
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Selector Only - No Auth */}

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--glass)] ring-1 ring-[color:var(--glass-border)] transition hover:bg-[color:var(--glass-hover)]"
            whileHover={{ rotate: -5 }}
            transition={{ duration: 0.25 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X size={18} className="text-[color:var(--text)]" />
            ) : (
              <Menu size={18} className="text-[color:var(--text)]" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[color:var(--glass-strong)] border-t border-[color:var(--glass-border)]"
          >
            <nav className="mx-auto flex max-w-6xl flex-col gap-0 px-4 py-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm text-[color:var(--text-soft)] transition hover:text-[color:var(--text)] hover:bg-[color:var(--glass-hover)] rounded-lg"
                >
                  {item.label}
                </a>
              ))}

              {/* Theme Selector */}
              <div className="border-t border-[color:var(--glass-border)] mt-2 pt-2">
                <div className="px-4 py-2">
                  <div className="text-xs font-semibold text-[color:var(--text-muted)] mb-2">Theme</div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setMode('light')
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${mode === 'light'
                          ? 'bg-[color:var(--glass-hover)] text-[color:var(--text)]'
                          : 'text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]'
                        }`}
                    >
                      <Sun size={16} />
                      Light
                    </button>
                    <button
                      onClick={() => {
                        setMode('dark')
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${mode === 'dark'
                          ? 'bg-[color:var(--glass-hover)] text-[color:var(--text)]'
                          : 'text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]'
                        }`}
                    >
                      <Moon size={16} />
                      Dark {mode === 'dark' && '✓'}
                    </button>
                    <button
                      onClick={() => {
                        setMode('system')
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${mode === 'system'
                          ? 'bg-[color:var(--glass-hover)] text-[color:var(--text)]'
                          : 'text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)]'
                        }`}
                    >
                      <Monitor size={16} />
                      System {mode === 'system' && '✓'}
                    </button>
                  </div>
                </div>
              </div>

              {user ? (
                <div className="mx-4 mb-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      signOutUser()
                      setMobileMenuOpen(false)
                    }}
                    className="rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-3 text-sm font-bold text-white-forced text-center cursor-pointer shadow-md"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="mx-4 mb-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      openAuthModal('signin')
                      setMobileMenuOpen(false)
                    }}
                    className="rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-3 text-sm font-bold text-white-forced text-center cursor-pointer shadow-md"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}