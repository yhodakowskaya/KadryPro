import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomRoles, createCustomRole, updateCustomRole, deleteCustomRole } from '../../api/users'
import { PageHeader, Card, Btn, FormField, Input, Textarea, Modal, ErrorMessage, Badge } from '../../components/ui'
import { Plus, Edit, Trash2, Shield } from 'lucide-react'

const PERMISSIONS: { key: string; label: string; description: string }[] = [
  { key: 'can_view_employees', label: 'Podgląd pracowników', description: 'Wyświetlanie listy i kart pracowników' },
  { key: 'can_edit_employees', label: 'Edycja pracowników', description: 'Edytowanie danych pracowników (jak Kadry/HR)' },
  { key: 'can_manage_questionnaires', label: 'Kwestionariusze', description: 'Tworzenie, wysyłanie i przeglądanie kwestionariuszy' },
  { key: 'can_manage_tests', label: 'Testy', description: 'Tworzenie i przypisywanie testów' },
  { key: 'can_approve_vacations', label: 'Zatwierdzanie wniosków', description: 'Akceptacja i odrzucanie wniosków urlopowych' },
  { key: 'can_manage_balances', label: 'Salda urlopowe', description: 'Edytowanie sald urlopowych i dni zdalnych' },
  { key: 'can_cancel_approved_vacations', label: 'Anulowanie urlopów', description: 'Anulowanie zatwierdzonych wniosków' },
  { key: 'can_manage_structure', label: 'Struktura firmy', description: 'Zarządzanie działami i hierarchią' },
  { key: 'can_view_all_requests', label: 'Wszystkie wnioski', description: 'Podgląd wszystkich wniosków urlopowych' },
]

const COLOR_OPTIONS = ['gray', 'blue', 'green', 'yellow', 'red', 'purple', 'orange']

const emptyForm = () => ({
  name: '', description: '', color: 'gray',
  can_view_employees: false, can_edit_employees: false,
  can_manage_questionnaires: false, can_manage_tests: false,
  can_approve_vacations: false, can_manage_balances: false,
  can_cancel_approved_vacations: false, can_manage_structure: false,
  can_view_all_requests: false,
})

export default function RolePage() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm())
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['custom-roles'], queryFn: getCustomRoles })

  const saveMutation = useMutation({
    mutationFn: (f: any) => editItem ? updateCustomRole(editItem.id, f) : createCustomRole(f),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['custom-roles'] }); closeModal() },
    onError: (err: any) => setError(err.response?.data?.name?.[0] || 'Błąd zapisu.'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteCustomRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-roles'] }),
  })

  const openNew = () => { setEditItem(null); setForm(emptyForm()); setError(''); setModal(true) }
  const openEdit = (r: any) => {
    setEditItem(r)
    setForm({ name: r.name, description: r.description || '', color: r.color || 'gray', ...Object.fromEntries(PERMISSIONS.map(p => [p.key, r[p.key]])) })
    setError('')
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditItem(null) }

  const items = data?.results || data || []

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Niestandardowe role"
        subtitle="Definiuj role z wybranymi uprawnieniami i przypisuj je pracownikom"
        actions={<Btn onClick={openNew}><Plus size={16} /> Nowa rola</Btn>}
      />

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Ładowanie...</div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <Shield size={40} className="mx-auto mb-3 opacity-40" />
          <p>Brak niestandardowych ról. Utwórz pierwszą rolę.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((r: any) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge color={r.color || 'gray'}>{r.name}</Badge>
                    <span className="text-xs text-gray-500">{r.user_count} {r.user_count === 1 ? 'użytkownik' : 'użytkowników'}</span>
                  </div>
                  {r.description && <p className="text-sm text-gray-500 mb-3">{r.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {PERMISSIONS.filter(p => r[p.key]).map(p => (
                      <span key={p.key} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.label}</span>
                    ))}
                    {!PERMISSIONS.some(p => r[p.key]) && <span className="text-xs text-gray-400">Brak przypisanych uprawnień</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Btn size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit size={14} /></Btn>
                  <Btn size="sm" variant="ghost" onClick={() => { if (confirm(`Usunąć rolę "${r.name}"?`)) deleteMutation.mutate(r.id) }}>
                    <Trash2 size={14} className="text-red-400" />
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={closeModal} title={editItem ? `Edytuj: ${editItem.name}` : 'Nowa rola'}>
        <div className="space-y-4">
          <FormField label="Nazwa roli" required>
            <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
          </FormField>
          <FormField label="Opis (opcjonalnie)">
            <Textarea rows={2} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Kolor odznaki">
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f: any) => ({ ...f, color: c }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: `var(--color-${c}-100, #f3f4f6)` }}
                >
                  <Badge color={c}>{c}</Badge>
                </button>
              ))}
            </div>
          </FormField>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Uprawnienia</p>
            <div className="space-y-2 border border-gray-200 rounded-lg p-3">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={!!form[p.key]}
                    onChange={e => setForm((f: any) => ({ ...f, [p.key]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <ErrorMessage message={error} />}
          <div className="flex gap-3 pt-2">
            <Btn onClick={() => { setError(''); saveMutation.mutate(form) }} disabled={!form.name || saveMutation.isPending}>Zapisz</Btn>
            <Btn variant="secondary" onClick={closeModal}>Anuluj</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
