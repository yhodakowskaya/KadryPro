import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, importDepartments } from '../../api/users'
import { useState, useRef } from 'react'
import { PageHeader, Card, Btn, Modal, FormField, Input, Select, LoadingPage } from '../../components/ui'
import { Plus, Edit, Trash2, Upload } from 'lucide-react'

export default function DzialyPage() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ name: '', parent: '' })

  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); closeModal() },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => updateDepartment(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); closeModal() },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  })

  const departments = data?.results || data || []
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importDepartments(file)
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      alert(`Import zakończony: dodano ${result.created}, pominięto ${result.skipped} (już istniały).`)
    } catch {
      alert('Błąd podczas importu.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openCreate = () => { setEditItem(null); setForm({ name: '', parent: '' }); setModal(true) }
  const openEdit = (d: any) => { setEditItem(d); setForm({ name: d.name, parent: d.parent ?? '' }); setModal(true) }
  const closeModal = () => { setModal(false); setEditItem(null) }

  const handleSave = () => {
    const payload = { name: form.name, parent: form.parent ? Number(form.parent) : null }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload })
    else createMutation.mutate(payload)
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Działy"
        subtitle="Zarządzaj działami firmy"
        actions={
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Btn variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload size={16} /> {importing ? 'Importowanie...' : 'Import Excel'}
            </Btn>
            <Btn onClick={openCreate}><Plus size={16} /> Nowy dział</Btn>
          </div>
        }
      />

      <Card>
        <div className="divide-y divide-gray-100">
          {departments.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Brak działów. Dodaj pierwszy dział.</div>
          ) : (
            departments.map((d: any) => {
              const parent = departments.find((p: any) => p.id === d.parent)
              return (
                <div key={d.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.name}</p>
                    {parent && <p className="text-xs text-gray-500">Dział nadrzędny: {parent.name}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" variant="secondary" onClick={() => openEdit(d)}><Edit size={13} /> Edytuj</Btn>
                    <Btn size="sm" variant="danger" onClick={() => { if (confirm(`Usunąć dział "${d.name}"?`)) deleteMutation.mutate(d.id) }}><Trash2 size={13} /></Btn>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      <Modal open={modal} onClose={closeModal} title={editItem ? 'Edytuj dział' : 'Nowy dział'}>
        <div className="space-y-4">
          <FormField label="Nazwa działu" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </FormField>
          <FormField label="Dział nadrzędny">
            <Select value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
              <option value="">-- Brak (dział główny) --</option>
              {departments.filter((d: any) => d.id !== editItem?.id).map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex gap-3">
            <Btn onClick={handleSave} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
              {editItem ? 'Zapisz zmiany' : 'Utwórz dział'}
            </Btn>
            <Btn variant="secondary" onClick={closeModal}>Anuluj</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
