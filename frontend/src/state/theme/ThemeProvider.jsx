import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('tripadvisor.themeMode')
    return saved || 'system' // 'system' | 'light' | 'dark'
  })

  const resolvedTheme = useMemo(() => {
    if (mode === 'system') return getSystemTheme()
    return mode
  }, [mode])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    // Required by your spec: smooth scrolling across anchor links.
    document.documentElement.style.scrollBehavior = 'smooth'
  }, [])

  useEffect(() => {
    if (mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      document.documentElement.dataset.theme = getSystemTheme()
    }
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [mode])

  useEffect(() => {
    localStorage.setItem('tripadvisor.themeMode', mode)
  }, [mode])

  const value = { mode, setMode, resolvedTheme }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

