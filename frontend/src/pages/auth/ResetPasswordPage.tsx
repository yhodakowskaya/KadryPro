import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { confirmPasswordReset } from '../../api/auth'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== password2) { setError('Hasła nie są identyczne.'); return }
    if (password.length < 6) { setError('Hasło musi mieć co najmniej 6 znaków.'); return }
    setError('')
    setLoading(true)
    try {
      await confirmPasswordReset(token!, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Link wygasł lub jest nieprawidłowy.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 border border-slate-200">
        <div className="flex items-baseline gap-0.5 mb-6">
          <span className="text-xl font-bold" style={{ color: '#1a6b1a' }}>Kadry</span>
          <span className="text-xl font-bold" style={{ color: '#f07030' }}>Pro</span>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Hasło zmienione!</h2>
            <p className="text-slate-500 text-sm mb-4">Za chwilę zostaniesz przekierowany do strony logowania...</p>
            <Link to="/login" className="text-sm text-blue-600 hover:underline">Przejdź do logowania</Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Nowe hasło</h2>
            <p className="text-slate-500 text-sm mb-6">Ustaw nowe hasło do swojego konta.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nowe hasło</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 text-sm"
                    placeholder="Min. 6 znaków"
                    required
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Powtórz hasło</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 text-sm"
                  placeholder="Powtórz hasło"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#f07030' }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Ustaw nowe hasło
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
