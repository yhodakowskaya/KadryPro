import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { login } from '../../api/auth'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username, password)
      setAuth(data.user, data.access, data.refresh)
      navigate('/')
    } catch {
      setError('Nieprawidłowa nazwa użytkownika lub hasło.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12" style={{ backgroundColor: '#005F17' }}>
        <img src="/logo-icon.svg" alt="KadryPro" className="w-28 h-28 mb-6" style={{ filter: 'brightness(0) invert(1)' }} />
        <div className="flex items-baseline gap-0 mb-3">
          <span className="text-4xl font-bold text-white tracking-tight">Kadry</span>
          <span className="text-4xl font-bold tracking-tight" style={{ color: '#f07030' }}>Pro</span>
        </div>
        <p className="text-center text-base max-w-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Profesjonalny system zarządzania zasobami ludzkimi
        </p>
        <div className="mt-12 space-y-3 w-full max-w-xs">
          {['Kwestionariusze osobowe', 'Testy BHP i RODO', 'Zarządzanie urlopami', 'Baza wiedzy firmowej'].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#f07030' }} />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 border border-slate-200">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1 lg:hidden">
              <img src="/logo-icon.svg" alt="KadryPro" className="w-8 h-8" />
              <span className="text-xl font-bold" style={{ color: '#1a6b1a' }}>Kadry</span>
              <span className="text-xl font-bold" style={{ color: '#f07030' }}>Pro</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Zaloguj się</h2>
            <p className="text-slate-500 mt-1 text-sm">Wprowadź dane dostępowe do systemu</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nazwa użytkownika
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 text-sm transition-shadow"
                style={{ '--tw-ring-color': '#005F17' } as React.CSSProperties}
                placeholder="Wpisz login"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Hasło
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 text-sm transition-shadow"
                  style={{ '--tw-ring-color': '#005F17' } as React.CSSProperties}
                  placeholder="Wpisz hasło"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="text-right -mt-1">
              <Link to="/zapomnialem-hasla" className="text-xs text-slate-400 hover:text-slate-600">
                Nie pamiętasz hasła?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: '#f07030' }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#d9602a')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#f07030')}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Zaloguj się
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
