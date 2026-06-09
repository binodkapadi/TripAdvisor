import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import OAuthCallback from './pages/OAuthCallback.jsx'
import { ThemeProvider } from './state/theme/ThemeProvider.jsx'
import { AuthProvider } from './state/auth/AuthProvider.jsx'
import { TripProvider } from './state/trip/TripProvider.jsx'
import AppShell from './ui/AppShell.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TripProvider>
          <BrowserRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/plan" element={<PlanPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/auth/success" element={<OAuthCallback />} />
              </Routes>
            </AppShell>
          </BrowserRouter>
        </TripProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}