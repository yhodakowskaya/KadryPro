import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPositions, createPosition, updatePosition, deletePosition, importPositions } from '../../api/users'
import { PageHeader, Card, Btn, FormField, Input, Textarea, Modal, ErrorMessage } from '../../components/ui'
import { Plus, Edit, Trash2, Briefcase, Upload } from 'lucide-react'

export default function StanowiskaPage() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', is_active: true })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['positions'], queryFn: () => getPositions() })

  const saveMutation = useMutation({
    mutationFn: (f: any) => editItem ? updatePosition(editItem.id, f) : createPosition(f),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['positions'] }); closeModal() },
    onError: (err: any) => setError(err.response?.data?.name?.[0] || 'Błąd zapisu.'),
  })
  const deleteMutation = useMutation({
    mutationFn: deletePosition,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['positions'] }),
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importPositions(file)
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      alert(`Import zakończony: dodano ${result.created}, pominięto ${result.skipped} (już istniały).`)
    } catch {
      alert('Błąd podczas importu.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openNew = () => { setEditItem(null); setForm({ name: '', description: '', is_active: true }); setError(''); setModal(true) }
  const openEdit = (p: any) => { setEditItem(p); setForm({ name: p.name, description: p.description || '', is_active: p.is_active }); setError(''); setModal(true) }
  const closeModal = () => { setModal(false); setEditItem(null) }

  const items = data?.results || data || []

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="Stanowiska"
        subtitle="Słownik stanowisk w firmie"
        actions={
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Btn variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload size={16} /> {importing ? 'Importowanie...' : 'Import Excel'}
            </Btn>
            <Btn onClick={openNew}><Plus size={16} /> Dodaj stanowisko</Btn>
          </div>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Ładowanie...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
            <p>Brak stanowisk. Dodaj pierwsze stanowisko.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stanowisko</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Aktywne' : 'Nieaktywne'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Btn size="sm" variant="ghost" onClick={() => openEdit(p)}><Edit size={13} /></Btn>
                      <Btn size="sm" variant="ghost" onClick={() => { if (confirm(`Usunąć "${p.name}"?`)) deleteMutation.mutate(p.id) }}>
                        <Trash2 size={13} className="text-red-400" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={closeModal} title={editItem ? 'Edytuj stanowisko' : 'Nowe stanowisko'}>
        <div className="space-y-4">
          <FormField label="Nazwa stanowiska" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </FormField>
          <FormField label="Opis (opcjonalnie)">
            <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Status">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
              <option value="true">Aktywne</option>
              <option value="false">Nieaktywne</option>
            </select>
          </FormField>
          {error && <ErrorMessage message={error} />}
          <div className="flex gap-3">
            <Btn onClick={() => { setError(''); saveMutation.mutate(form) }} disabled={!form.name || saveMutation.isPending}>Zapisz</Btn>
            <Btn variant="secondary" onClick={closeModal}>Anuluj</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
