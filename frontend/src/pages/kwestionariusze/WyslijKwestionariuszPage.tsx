import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getTemplates, sendInvitation } from '../../api/questionnaire'
import { PageHeader, Card, Btn, FormField, Input, Select, Textarea, LoadingPage, ErrorMessage } from '../../components/ui'
import { Send, CheckCircle, AlertTriangle, Copy } from 'lucide-react'

export default function WyslijKwestionariuszPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    recipient_email: '',
    recipient_name: '',
    template_id: '',
    notes: '',
    expires_days: '14',
  })
  const [error, setError] = useState('')
  const [sentData, setSentData] = useState<{ email_sent: boolean; form_url: string; email_error?: string } | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getTemplates(),
  })

  const mutation = useMutation({
    mutationFn: sendInvitation,
    onSuccess: (data: any) => {
      setSentData({ email_sent: data.email_sent, form_url: data.form_url, email_error: data.email_error })
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Błąd podczas wysyłania zaproszenia.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate({
      ...form,
      template_id: Number(form.template_id),
      expires_days: Number(form.expires_days),
    })
  }

  const templateList = templates?.results || templates || []
  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Wyślij kwestionariusz"
        subtitle="Prześlij link do kwestionariusza osobowego na email kandydata"
      />

      {sentData ? (
        <Card className="p-8">
          <div className="text-center mb-6">
            {sentData.email_sent ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Email wysłany!</h2>
                <p className="text-gray-500 text-sm">Zaproszenie zostało doręczone na podany adres.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="text-yellow-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Zaproszenie utworzone</h2>
                <p className="text-yellow-700 text-sm bg-yellow-50 rounded-lg px-4 py-2 mt-2">
                  Email nie został wysłany (brak konfiguracji SMTP). Skopiuj link i prześlij ręcznie.
                </p>
              </>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Link do kwestionariusza:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-blue-700 bg-white border border-gray-200 rounded px-3 py-2 flex-1 break-all">{sentData.form_url}</code>
              <button
                onClick={() => navigator.clipboard.writeText(sentData!.form_url)}
                className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                title="Kopiuj link"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Btn onClick={() => navigate('/kwestionariusze')}>Przejdź do listy</Btn>
            <Btn variant="secondary" onClick={() => { setSentData(null); setError('') }}>Wyślij kolejny</Btn>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Imię i nazwisko odbiorcy" required>
              <Input
                value={form.recipient_name}
                onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                placeholder="np. Jan Kowalski"
                required
              />
            </FormField>

            <FormField label="Adres email odbiorcy" required>
              <Input
                type="email"
                value={form.recipient_email}
                onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))}
                placeholder="jan.kowalski@example.com"
                required
              />
            </FormField>

            <FormField label="Szablon kwestionariusza" required>
              <Select
                value={form.template_id}
                onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}
                required
              >
                <option value="">-- Wybierz szablon --</option>
                {templateList.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Ważność linku (dni)">
              <Select
                value={form.expires_days}
                onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))}
              >
                <option value="7">7 dni</option>
                <option value="14">14 dni</option>
                <option value="30">30 dni</option>
                <option value="60">60 dni</option>
              </Select>
            </FormField>

            <FormField label="Uwagi (opcjonalnie)">
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Dodatkowe informacje dla odbiorcy..."
              />
            </FormField>

            {error && <ErrorMessage message={error} />}

            <div className="flex gap-3 pt-2">
              <Btn type="submit" disabled={mutation.isPending}>
                <Send size={16} />
                {mutation.isPending ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
              </Btn>
              <Btn variant="secondary" onClick={() => navigate('/kwestionariusze')}>
                Anuluj
              </Btn>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
