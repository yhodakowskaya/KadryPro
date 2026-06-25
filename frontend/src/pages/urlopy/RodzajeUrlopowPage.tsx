import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getVacationTypes, createVacationType, updateVacationType, deleteVacationType,
  getVacationTypeAllocations, updateVacationTypeAllocation, deleteVacationTypeAllocation,
  bulkCreateVacationTypeAllocations,
} from '../../api/hr'
import { getUsers } from '../../api/users'
import { PageHeader, Card, Btn, FormField, Input, Select, LoadingPage, Badge } from '../../components/ui'
import { Plus, Edit, Trash2, Users, X, Check, Search, EyeOff, Eye } from 'lucide-react'

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Niebieski', cls: 'bg-blue-100 text-blue-800' },
  { value: 'green', label: 'Zielony', cls: 'bg-green-100 text-green-800' },
  { value: 'red', label: 'Czerwony', cls: 'bg-red-100 text-red-800' },
  { value: 'yellow', label: 'Żółty', cls: 'bg-yellow-100 text-yellow-800' },
  { value: 'purple', label: 'Fioletowy', cls: 'bg-purple-100 text-purple-800' },
  { value: 'orange', label: 'Pomarańczowy', cls: 'bg-orange-100 text-orange-800' },
  { value: 'pink', label: 'Różowy', cls: 'bg-pink-100 text-pink-800' },
  { value: 'teal', label: 'Turkusowy', cls: 'bg-teal-100 text-teal-800' },
]

const colorClass = (color: string) =>
  COLOR_OPTIONS.find(c => c.value === color)?.cls || 'bg-gray-100 text-gray-800'

const year = new Date().getFullYear()

export default function RodzajeUrlopowPage() {
  const qc = useQueryClient()

  // Type form state
  const [editType, setEditType] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', color: 'blue', default_days_per_year: '0', requires_balance: true, is_active: true })

  // Allocation panel state
  const [allocTab, setAllocTab] = useState<number | null>(null)
  const [editAlloc, setEditAlloc] = useState<any>(null)

  // Bulk assign state
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([])
  const [bulkDays, setBulkDays] = useState('')
  const [empSearch, setEmpSearch] = useState('')

  const { data: typesData, isLoading } = useQuery({ queryKey: ['vacation-types'], queryFn: () => getVacationTypes() })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => getUsers({ is_active: 'true' }) })
  const { data: allocsData } = useQuery({
    queryKey: ['vacation-type-allocations', allocTab, year],
    queryFn: () => getVacationTypeAllocations({ vacation_type: String(allocTab), year: String(year) }),
    enabled: !!allocTab,
  })

  const types = typesData?.results || typesData || []
  const users = usersData?.results || usersData || []
  const allocs = allocsData?.results || allocsData || []

  const createMut = useMutation({ mutationFn: createVacationType, onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacation-types'] }); resetForm() } })
  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => updateVacationType(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacation-types'] }); resetForm() } })
  const deleteMut = useMutation({ mutationFn: deleteVacationType, onSuccess: () => qc.invalidateQueries({ queryKey: ['vacation-types'] }) })
  const toggleActiveMut = useMutation({
    mutationFn: (t: any) => updateVacationType(t.id, {
      name: t.name,
      color: t.color,
      default_days_per_year: t.default_days_per_year,
      requires_balance: t.requires_balance,
      is_active: !t.is_active,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vacation-types'] }),
  })
  const updateAllocMut = useMutation({ mutationFn: ({ id, data }: any) => updateVacationTypeAllocation(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacation-type-allocations'] }); setEditAlloc(null) } })
  const deleteAllocMut = useMutation({ mutationFn: deleteVacationTypeAllocation, onSuccess: () => qc.invalidateQueries({ queryKey: ['vacation-type-allocations'] }) })
  const bulkMut = useMutation({
    mutationFn: bulkCreateVacationTypeAllocations,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vacation-type-allocations'] })
      qc.invalidateQueries({ queryKey: ['vacation-types'] })
      setSelectedEmpIds([])
      setBulkDays('')
      setEmpSearch('')
    },
  })

  const resetForm = () => { setShowForm(false); setEditType(null); setForm({ name: '', color: 'blue', default_days_per_year: '0', requires_balance: true, is_active: true }) }

  const openEdit = (t: any) => {
    setEditType(t)
    setForm({ name: t.name, color: t.color, default_days_per_year: String(t.default_days_per_year), requires_balance: t.requires_balance, is_active: t.is_active })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, default_days_per_year: Number(form.default_days_per_year) }
    if (editType) updateMut.mutate({ id: editType.id, data })
    else createMut.mutate(data)
  }

  const openAllocTab = (id: number) => {
    setAllocTab(allocTab === id ? null : id)
    setSelectedEmpIds([])
    setBulkDays('')
    setEmpSearch('')
    setEditAlloc(null)
  }

  const toggleEmployee = (id: number) =>
    setSelectedEmpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!allocTab || selectedEmpIds.length === 0 || !bulkDays) return
    bulkMut.mutate({ employee_ids: selectedEmpIds, vacation_type: allocTab, year, allocated_days: Number(bulkDays) })
  }

  if (isLoading) return <LoadingPage />

  // Employees not yet assigned to the current alloc tab type
  const assignedEmployeeIds = new Set(allocs.map((a: any) => a.employee))
  const unassigned = users.filter((u: any) => !assignedEmployeeIds.has(u.id))
  const filteredUnassigned = empSearch
    ? unassigned.filter((u: any) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(empSearch.toLowerCase()))
    : unassigned

  const allFilteredSelected = filteredUnassigned.length > 0 && filteredUnassigned.every((u: any) => selectedEmpIds.includes(u.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !filteredUnassigned.some((u: any) => u.id === id)))
    } else {
      const toAdd = filteredUnassigned.map((u: any) => u.id).filter((id: number) => !selectedEmpIds.includes(id))
      setSelectedEmpIds(prev => [...prev, ...toAdd])
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Rodzaje urlopów"
        subtitle="Zarządzaj typami urlopów i przydziałami dla pracowników"
        actions={<Btn onClick={() => { resetForm(); setShowForm(true) }}><Plus size={16} /> Nowy rodzaj</Btn>}
      />

      {showForm && (
        <Card className="p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editType ? 'Edytuj rodzaj urlopu' : 'Nowy rodzaj urlopu'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <FormField label="Nazwa" required>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </FormField>
            <FormField label="Kolor">
              <Select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}>
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Domyślna liczba dni/rok">
              <Input type="number" min="0" value={form.default_days_per_year} onChange={e => setForm(f => ({ ...f, default_days_per_year: e.target.value }))} />
            </FormField>
            <div className="flex flex-col gap-2 pt-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.requires_balance} onChange={e => setForm(f => ({ ...f, requires_balance: e.target.checked }))} />
                Wymaga salda (limit dni)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Aktywny
              </label>
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <Btn type="submit" disabled={createMut.isPending || updateMut.isPending}>
                <Check size={15} /> {editType ? 'Zapisz zmiany' : 'Dodaj rodzaj'}
              </Btn>
              <Btn variant="secondary" type="button" onClick={resetForm}><X size={15} /> Anuluj</Btn>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {types.length === 0 && (
          <Card className="p-10 text-center text-gray-400">Brak zdefiniowanych rodzajów urlopów.</Card>
        )}
        {types.map((t: any) => (
          <Card key={t.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass(t.color)}`}>{t.name}</span>
                {!t.is_active && <Badge color="red">Nieaktywny</Badge>}
                {!t.requires_balance && <Badge color="gray">Bez limitu dni</Badge>}
                <span className="text-sm text-gray-500">{t.default_days_per_year} dni/rok · {t.allocations_count} przydziałów</span>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="secondary" onClick={() => openAllocTab(t.id)}>
                  <Users size={14} /> Przydziały
                </Btn>
                <Btn
                  size="sm"
                  variant={t.is_active ? 'secondary' : 'ghost'}
                  title={t.is_active ? 'Deaktywuj' : 'Aktywuj'}
                  onClick={() => toggleActiveMut.mutate(t)}
                  disabled={toggleActiveMut.isPending}
                >
                  {t.is_active ? <EyeOff size={14} /> : <Eye size={14} className="text-green-700" />}
                </Btn>
                <Btn size="sm" variant="secondary" onClick={() => openEdit(t)}><Edit size={14} /></Btn>
                <Btn
                  size="sm" variant="ghost"
                  disabled={t.allocations_count > 0}
                  title={t.allocations_count > 0 ? `Nie można usunąć — ${t.allocations_count} przydziałów` : 'Usuń'}
                  onClick={() => { if (confirm(`Usunąć "${t.name}"?`)) deleteMut.mutate(t.id) }}
                >
                  <Trash2 size={14} className={t.allocations_count > 0 ? 'text-gray-300' : 'text-red-400'} />
                </Btn>
              </div>
            </div>

            {allocTab === t.id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Left: bulk assign */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Przydziel pracownikom — rok {year}</h4>
                    <form onSubmit={handleBulkSubmit}>
                      {/* Employee search + select all */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-1">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-700"
                            placeholder="Szukaj..."
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                        >
                          {allFilteredSelected ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
                        </button>
                      </div>

                      {/* Scrollable employee list */}
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg mb-3 divide-y divide-gray-50">
                        {filteredUnassigned.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">
                            {unassigned.length === 0 ? 'Wszyscy aktywni pracownicy mają już przydziały' : 'Brak wyników'}
                          </p>
                        ) : (
                          filteredUnassigned.map((u: any) => (
                            <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedEmpIds.includes(u.id)}
                                onChange={() => toggleEmployee(u.id)}
                                className="accent-green-700"
                              />
                              <span className="text-sm text-gray-800">{u.first_name} {u.last_name}</span>
                            </label>
                          ))
                        )}
                      </div>

                      {/* Days + submit */}
                      <div className="flex gap-3 items-end">
                        <FormField label="Liczba dni">
                          <Input
                            type="number" min="0"
                            value={bulkDays}
                            onChange={e => setBulkDays(e.target.value)}
                            required
                            style={{ width: '90px' }}
                          />
                        </FormField>
                        <Btn
                          type="submit"
                          disabled={selectedEmpIds.length === 0 || !bulkDays || bulkMut.isPending}
                        >
                          <Users size={14} />
                          {selectedEmpIds.length > 0
                            ? `Przydziel (${selectedEmpIds.length})`
                            : 'Przydziel'}
                        </Btn>
                      </div>
                      {selectedEmpIds.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1.5">
                          Zaznaczono: {selectedEmpIds.length} {selectedEmpIds.length === 1 ? 'pracownik' : 'pracowników'}
                        </p>
                      )}
                    </form>
                  </div>

                  {/* Right: existing allocations */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Istniejące przydziały ({allocs.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {allocs.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          {editAlloc?.id === a.id ? (
                            <>
                              <span className="text-gray-700 truncate mr-2">{a.employee_name}</span>
                              <div className="flex gap-2 items-center flex-shrink-0">
                                <Input type="number" min="0" value={editAlloc.allocated_days}
                                  onChange={e => setEditAlloc((ea: any) => ({ ...ea, allocated_days: e.target.value }))}
                                  style={{ width: '72px' }} />
                                <Btn size="sm" onClick={() => updateAllocMut.mutate({ id: a.id, data: { allocated_days: Number(editAlloc.allocated_days) } })}>
                                  <Check size={13} />
                                </Btn>
                                <Btn size="sm" variant="secondary" onClick={() => setEditAlloc(null)}><X size={13} /></Btn>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-700 truncate">{a.employee_name}</span>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-gray-500">
                                  <strong>{a.allocated_days}</strong> dni · użyte {a.used_days} · dostępne <strong className="text-green-700">{a.available_days}</strong>
                                </span>
                                <div className="flex gap-1">
                                  <Btn size="sm" variant="secondary" onClick={() => setEditAlloc({ id: a.id, allocated_days: String(a.allocated_days) })}><Edit size={12} /></Btn>
                                  <Btn size="sm" variant="ghost" onClick={() => { if (confirm('Usunąć przydział?')) deleteAllocMut.mutate(a.id) }}><Trash2 size={12} className="text-red-400" /></Btn>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {allocs.length === 0 && <p className="text-xs text-gray-400">Brak przydziałów na ten rok.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
