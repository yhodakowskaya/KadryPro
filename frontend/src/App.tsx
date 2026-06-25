import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, Component, type ReactNode } from 'react'
import { useAuthStore } from './stores/authStore'
import { getMe } from './api/auth'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center shadow-sm">
            <p className="text-red-600 font-semibold mb-2">Błąd aplikacji</p>
            <p className="text-slate-500 text-sm mb-4">{(this.state.error as Error).message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90" style={{ backgroundColor: '#005F17' }}
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import Layout from './components/Layout'
import Dashboard from './pages/dashboard/Dashboard'

import KwestionariuszePage from './pages/kwestionariusze/KwestionariuszePage'
import WyslijKwestionariuszPage from './pages/kwestionariusze/WyslijKwestionariuszPage'
import SubmisjaPage from './pages/kwestionariusze/SubmisjaPage'
import FormularzPublicznyPage from './pages/kwestionariusze/FormularzPublicznyPage'

import TestyPage from './pages/testy/TestyPage'
import NowyTestPage from './pages/testy/NowyTestPage'
import TestDetailPage from './pages/testy/TestDetailPage'
import MojeTestyPage from './pages/testy/MojeTestyPage'
import RozwiazTestPage from './pages/testy/RozwiazTestPage'
import SzablonyTestowPage from './pages/testy/SzablonyTestowPage'
import SzablonTestuFormPage from './pages/testy/SzablonTestuFormPage'

import PracownicyPage from './pages/pracownicy/PracownicyPage'
import NowyPracownikPage from './pages/pracownicy/NowyPracownikPage'
import KartaPracownikaPage from './pages/pracownicy/KartaPracownikaPage'

import UrlopyPage from './pages/urlopy/UrlopyPage'
import NowyWniosekPage from './pages/urlopy/NowyWniosekPage'
import DoZatwierdeniaPage from './pages/urlopy/DoZatwierdeniaPage'

import StrukturaPage from './pages/struktura/StrukturaPage'
import DzialyPage from './pages/struktura/DzialyPage'
import StanowiskaPage from './pages/pracownicy/StanowiskaPage'
import RolePage from './pages/pracownicy/RolePage'
import SzablonyPage from './pages/kwestionariusze/SzablonyPage'
import SzablonFormPage from './pages/kwestionariusze/SzablonFormPage'
import RodzajeUrlopowPage from './pages/urlopy/RodzajeUrlopowPage'
import KalendarzePage from './pages/urlopy/KalendarzePage'
import DokumentyPage from './pages/dokumenty/DokumentyPage'
import WiedzaPage from './pages/wiedza/WiedzaPage'
import AktualnosciPage from './pages/aktualnosci/AktualnosciPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, logout } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      getMe().then(user => {
        const access = localStorage.getItem('access_token') || ''
        const refresh = localStorage.getItem('refresh_token') || ''
        setAuth(user, access, refresh)
      }).catch(() => logout())
    }
  }, [])

  return <>{children}</>
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/zapomnialem-hasla" element={<ForgotPasswordPage />} />
            <Route path="/reset-hasla/:token" element={<ResetPasswordPage />} />
            <Route path="/formularz/:token" element={<FormularzPublicznyPage />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="kwestionariusze" element={<KwestionariuszePage />} />
              <Route path="kwestionariusze/wyslij" element={<WyslijKwestionariuszPage />} />
              <Route path="kwestionariusze/:id" element={<SubmisjaPage />} />
              <Route path="testy" element={<TestyPage />} />
              <Route path="testy/nowy" element={<NowyTestPage />} />
              <Route path="testy/szablony" element={<SzablonyTestowPage />} />
              <Route path="testy/szablony/nowy" element={<SzablonTestuFormPage />} />
              <Route path="testy/szablony/:id/edytuj" element={<SzablonTestuFormPage />} />
              <Route path="testy/:id" element={<TestDetailPage />} />
              <Route path="moje-testy" element={<MojeTestyPage />} />
              <Route path="moje-testy/:id" element={<RozwiazTestPage />} />
              <Route path="pracownicy" element={<PracownicyPage />} />
              <Route path="pracownicy/nowy" element={<NowyPracownikPage />} />
              <Route path="pracownicy/:id" element={<KartaPracownikaPage />} />
              <Route path="urlopy" element={<UrlopyPage />} />
              <Route path="urlopy/wniosek" element={<NowyWniosekPage />} />
              <Route path="urlopy/do-zatwierdzenia" element={<DoZatwierdeniaPage />} />
              <Route path="struktura" element={<StrukturaPage />} />
              <Route path="dzialy" element={<DzialyPage />} />
              <Route path="stanowiska" element={<StanowiskaPage />} />
              <Route path="role" element={<RolePage />} />
              <Route path="kwestionariusze/szablony" element={<SzablonyPage />} />
              <Route path="kwestionariusze/szablony/nowy" element={<SzablonFormPage />} />
              <Route path="kwestionariusze/szablony/:id/edytuj" element={<SzablonFormPage />} />
              <Route path="urlopy/rodzaje" element={<RodzajeUrlopowPage />} />
              <Route path="urlopy/kalendarze" element={<KalendarzePage />} />
              <Route path="dokumenty" element={<DokumentyPage />} />
              <Route path="wiedza" element={<WiedzaPage />} />
              <Route path="aktualnosci" element={<AktualnosciPage />} />
            </Route>
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
