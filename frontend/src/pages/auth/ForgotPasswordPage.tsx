import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../api/auth'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch {
      setError('Wystąpił błąd. Spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 border border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold" style={{ color: '#1a6b1a' }}>Kadry</span>
            <span className="text-xl font-bold" style={{ color: '#f07030' }}>Pro</span>
          </div>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={26} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Sprawdź skrzynkę</h2>
            <p className="text-slate-500 text-sm mb-6">
              Jeśli podany adres email istnieje w systemie, wyślemy na niego link do resetu hasła.<br />
              Link jest ważny przez 1 godzinę.
            </p>
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft size={15} /> Wróć do logowania
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Resetuj hasło</h2>
            <p className="text-slate-500 text-sm mb-6">Podaj adres email powiązany z Twoim kontem.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Adres email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 text-sm"
                  placeholder="twoj@email.pl"
                  required
                  autoFocus
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
                Wyślij link resetujący
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft size={14} /> Wróć do logowania
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
