import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUser, updateUser, deleteUser, getDepartments, getUsers, setPassword } from '../../api/users'
import { getPositions, getCustomRoles } from '../../api/users'
import { getVacationBalance, updateVacationBalance, getVacationRequests, getVacationTypeAllocations, adjustVacationBalance } from '../../api/hr'
import { useState } from 'react'
import { PageHeader, Card, Btn, FormField, Input, Select, LoadingPage, Badge, Modal, ErrorMessage, StatusBadge } from '../../components/ui'
import { ArrowLeft, Edit, Save, Key, Calendar, Laptop, FileText, Stethoscope, HardHat, Tag, Trash2, Plus, Minus } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'

const roleColor: Record<string, string> = { admin: 'purple', hr: 'blue', manager: 'orange', employee: 'gray' }

const CONTRACT_LABELS: Record<string, string> = {
  uop_nieokreslony: 'UoP — czas nieokreślony',
  uop_okreslony: 'UoP — czas określony',
  zlecenie: 'Umowa zlecenie',
  dzielo: 'Umowa o dzieło',
  b2b: 'B2B',
  staz: 'Staż / Praktyka',
}

const EXAM_LABELS: Record<string, string> = {
  wstepne: 'Wstępne',
  okresowe: 'Okresowe',
  kontrolne: 'Kontrolne',
}

export default function KartaPracownikaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const hrAdmin = isHROrAdmin(currentUser)
  const year = new Date().getFullYear()

  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [balanceForm, setBalanceForm] = useState<any>(null)
  const [editBalance, setEditBalance] = useState(false)
  const [passwordModal, setPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [balanceYear, setBalanceYear] = useState(year)
  const [adjustDays, setAdjustDays] = useState('')
  const [adjustField, setAdjustField] = useState<'vacation' | 'remote'>('vacation')

  const { data: employee, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(Number(id)),
  })
  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['vacation-balance', id, balanceYear],
    queryFn: () => getVacationBalance(Number(id), balanceYear),
    enabled: !!id,
  })
  const { data: vacationHistory } = useQuery({
    queryKey: ['vacation-requests', id],
    queryFn: () => getVacationRequests({ employee: String(id) }),
    enabled: !!id,
  })
  const { data: typeAllocsData } = useQuery({
    queryKey: ['vacation-type-allocations', id, balanceYear],
    queryFn: () => getVacationTypeAllocations({ employee: String(id), year: String(balanceYear) }),
    enabled: !!id,
  })
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => getUsers({ is_active: 'true' }) })
  const { data: positionsData } = useQuery({ queryKey: ['positions'], queryFn: () => getPositions(true), enabled: hrAdmin && editMode })
  const { data: customRolesData } = useQuery({ queryKey: ['custom-roles'], queryFn: getCustomRoles, enabled: hrAdmin && editMode })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateUser(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      setEditMode(false)
    },
    onError: (err: any) => {
      const d = err.response?.data
      setError(d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Błąd zapisu.')
    },
  })
  const balanceMutation = useMutation({
    mutationFn: (data: any) => updateVacationBalance(Number(id), { ...data, year: balanceYear }),
    onSuccess: () => { refetchBalance(); setEditBalance(false) },
  })
  const passwordMutation = useMutation({
    mutationFn: () => setPassword(Number(id), newPassword),
    onSuccess: () => { setPasswordModal(false); setNewPassword('') },
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/pracownicy')
    },
  })
  const adjustMutation = useMutation({
    mutationFn: (action: 'add' | 'subtract') => adjustVacationBalance(Number(id), {
      year: balanceYear, field: adjustField,
      days: Math.abs(Number(adjustDays)), action,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-balance', id, balanceYear] })
      refetchBalance()
      setAdjustDays('')
    },
  })

  if (isLoading) return <LoadingPage />
  if (!employee) return <div className="p-6 text-gray-500">Nie znaleziono pracownika.</div>

  const deptList = departments?.results || departments || []
  const userList = usersData?.results || usersData || []
  const vacations = vacationHistory?.results || vacationHistory || []
  const positionsList = positionsData?.results || positionsData || []
  const customRoles = customRolesData?.results || customRolesData || []
  const typeAllocs = typeAllocsData?.results || typeAllocsData || []

  const startEdit = () => {
    setEditForm({
      first_name: employee.first_name, last_name: employee.last_name,
      email: employee.email, position: employee.position || '', phone: employee.phone || '',
      role: employee.role, custom_role: employee.custom_role || '',
      department: employee.department || '', manager: employee.manager || '',
      hire_date: employee.hire_date || '', is_active: employee.is_active,
      termination_date: employee.termination_date || '',
      contract_type: employee.contract_type || '',
      contract_start: employee.contract_start || '',
      contract_end: employee.contract_end || '',
      medical_exam_type: employee.medical_exam_type || '',
      medical_exam_next_date: employee.medical_exam_next_date || '',
      bhp_date: employee.bhp_date || '',
      bhp_next_date: employee.bhp_next_date || '',
    })
    setEditMode(true)
  }

  const handleSave = () => {
    setError('')
    updateMutation.mutate({
      ...editForm,
      department: editForm.department ? Number(editForm.department) : null,
      manager: editForm.manager ? Number(editForm.manager) : null,
      custom_role: editForm.custom_role ? Number(editForm.custom_role) : null,
      hire_date: editForm.hire_date || null,
      contract_start: editForm.contract_start || null,
      contract_end: editForm.contract_end || null,
      medical_exam_next_date: editForm.medical_exam_next_date || null,
      bhp_date: editForm.bhp_date || null,
      bhp_next_date: editForm.bhp_next_date || null,
      termination_date: editForm.termination_date || null,
    })
  }

  const set = (key: string) => (e: any) => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        subtitle={employee.position || 'Brak stanowiska'}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => navigate('/pracownicy')}><ArrowLeft size={16} /> Powrót</Btn>
            {hrAdmin && !editMode && (
              <>
                <Btn variant="secondary" onClick={startEdit}><Edit size={16} /> Edytuj</Btn>
                <Btn variant="secondary" onClick={() => setPasswordModal(true)}><Key size={16} /> Zmień hasło</Btn>
                {employee.is_active && (
                  <Btn variant="danger" onClick={() => {
                    if (confirm(`Zwolnić pracownika ${employee.first_name} ${employee.last_name}? Konto zostanie dezaktywowane.`))
                      deleteMutation.mutate()
                  }} disabled={deleteMutation.isPending}>
                    <Trash2 size={16} /> Zwolnij
                  </Btn>
                )}
              </>
            )}
            {editMode && (
              <>
                <Btn onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save size={16} /> Zapisz
                </Btn>
                <Btn variant="secondary" onClick={() => setEditMode(false)}>Anuluj</Btn>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Dane pracownika */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Dane pracownika</h2>
            {!editMode ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  ['Email', employee.email],
                  ['Telefon', employee.phone || '—'],
                  ['Dział', employee.department_name || '—'],
                  ['Przełożony', employee.manager_name || '—'],
                  ['Data zatrudnienia', employee.hire_date ? format(new Date(employee.hire_date), 'dd MMMM yyyy', { locale: pl }) : '—'],
                  ['Data zwolnienia', employee.termination_date ? format(new Date(employee.termination_date), 'dd MMMM yyyy', { locale: pl }) : '—'],
                  ['Status', <Badge color={employee.is_active ? 'green' : 'gray'}>{employee.is_active ? 'Aktywny' : 'Nieaktywny'}</Badge>],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm text-gray-900">{value as any}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Imię"><Input value={editForm.first_name} onChange={set('first_name')} /></FormField>
                <FormField label="Nazwisko"><Input value={editForm.last_name} onChange={set('last_name')} /></FormField>
                <FormField label="Email"><Input type="email" value={editForm.email} onChange={set('email')} /></FormField>
                <FormField label="Telefon"><Input value={editForm.phone} onChange={set('phone')} /></FormField>
                <FormField label="Stanowisko">
                  {positionsList.length > 0 ? (
                    <Select value={editForm.position} onChange={set('position')}>
                      <option value="">-- Wybierz stanowisko --</option>
                      {positionsList.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </Select>
                  ) : (
                    <Input value={editForm.position} onChange={set('position')} placeholder="Stanowisko" />
                  )}
                </FormField>
                <FormField label="Rola systemowa">
                  <Select value={editForm.role} onChange={set('role')}>
                    <option value="employee">Pracownik</option>
                    <option value="manager">Kierownik</option>
                    <option value="hr">Kadry/HR</option>
                    <option value="admin">Administrator</option>
                  </Select>
                </FormField>
                <FormField label="Niestandardowa rola">
                  <Select value={editForm.custom_role} onChange={set('custom_role')}>
                    <option value="">— Brak —</option>
                    {customRoles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Dział">
                  <Select value={editForm.department} onChange={set('department')}>
                    <option value="">-- Brak --</option>
                    {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Przełożony">
                  <Select value={editForm.manager} onChange={set('manager')}>
                    <option value="">-- Brak --</option>
                    {userList.filter((u: any) => u.id !== Number(id)).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Data zatrudnienia">
                  <Input type="date" value={editForm.hire_date} onChange={set('hire_date')} />
                </FormField>
                <FormField label="Data zwolnienia">
                  <Input type="date" value={editForm.termination_date} onChange={set('termination_date')} />
                </FormField>
                <FormField label="Aktywny">
                  <Select value={editForm.is_active ? 'true' : 'false'} onChange={e => setEditForm((f: any) => ({ ...f, is_active: e.target.value === 'true' }))}>
                    <option value="true">Tak</option>
                    <option value="false">Nie</option>
                  </Select>
                </FormField>
                {error && <div className="col-span-2"><ErrorMessage message={error} /></div>}
              </div>
            )}
          </Card>

          {/* Umowa */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" /> Umowa
            </h2>
            {!editMode ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  ['Typ umowy', employee.contract_type_display || employee.contract_type || '—'],
                  ['Umowa od', employee.contract_start ? format(new Date(employee.contract_start), 'dd.MM.yyyy') : '—'],
                  ['Umowa do', employee.contract_end ? format(new Date(employee.contract_end), 'dd.MM.yyyy') : '—'],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm text-gray-900">{value as string}</p>
                  </div>
                ))}
                {employee.contract_end && (() => {
                  const daysLeft = Math.ceil((new Date(employee.contract_end).getTime() - Date.now()) / 86400000)
                  if (daysLeft > 0 && daysLeft <= 30) {
                    return <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 font-medium">
                      Uwaga: umowa wygasa za {daysLeft} dni!
                    </div>
                  }
                  return null
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Typ umowy">
                  <Select value={editForm.contract_type} onChange={set('contract_type')}>
                    <option value="">— Nie dotyczy —</option>
                    {Object.entries(CONTRACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </FormField>
                <div />
                <FormField label="Umowa od">
                  <Input type="date" value={editForm.contract_start} onChange={set('contract_start')} />
                </FormField>
                <FormField label="Umowa do">
                  <Input type="date" value={editForm.contract_end} onChange={set('contract_end')} />
                </FormField>
              </div>
            )}
          </Card>

          {/* Badania lekarskie */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-600" /> Badania lekarskie
            </h2>
            {!editMode ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  ['Typ badania', employee.medical_exam_type_display || employee.medical_exam_type || '—'],
                  ['Następne badanie', employee.medical_exam_next_date ? format(new Date(employee.medical_exam_next_date), 'dd.MM.yyyy') : '—'],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm text-gray-900">{value as string}</p>
                  </div>
                ))}
                {employee.medical_exam_next_date && (() => {
                  const daysLeft = Math.ceil((new Date(employee.medical_exam_next_date).getTime() - Date.now()) / 86400000)
                  if (daysLeft > 0 && daysLeft <= 30) {
                    return <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 font-medium">
                      Uwaga: badanie za {daysLeft} dni!
                    </div>
                  }
                  return null
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Typ badania">
                  <Select value={editForm.medical_exam_type} onChange={set('medical_exam_type')}>
                    <option value="">— Brak —</option>
                    {Object.entries(EXAM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </FormField>
                <FormField label="Następne badanie">
                  <Input type="date" value={editForm.medical_exam_next_date} onChange={set('medical_exam_next_date')} />
                </FormField>
              </div>
            )}
          </Card>

          {/* BHP */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HardHat size={18} className="text-yellow-600" /> Szkolenie BHP
            </h2>
            {!editMode ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  ['Data szkolenia BHP', employee.bhp_date ? format(new Date(employee.bhp_date), 'dd.MM.yyyy') : '—'],
                  ['Następne szkolenie BHP', employee.bhp_next_date ? format(new Date(employee.bhp_next_date), 'dd.MM.yyyy') : '—'],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm text-gray-900">{value as string}</p>
                  </div>
                ))}
                {employee.bhp_next_date && (() => {
                  const daysLeft = Math.ceil((new Date(employee.bhp_next_date).getTime() - Date.now()) / 86400000)
                  if (daysLeft > 0 && daysLeft <= 30) {
                    return <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 font-medium">
                      Uwaga: szkolenie BHP za {daysLeft} dni!
                    </div>
                  }
                  return null
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Data szkolenia BHP">
                  <Input type="date" value={editForm.bhp_date} onChange={set('bhp_date')} />
                </FormField>
                <FormField label="Następne szkolenie BHP">
                  <Input type="date" value={editForm.bhp_next_date} onChange={set('bhp_next_date')} />
                </FormField>
              </div>
            )}
          </Card>

          {/* Historia urlopów */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" /> Historia wniosków urlopowych
            </h2>
            {vacations.length === 0 ? (
              <p className="text-gray-400 text-sm">Brak wniosków urlopowych.</p>
            ) : (
              <div className="space-y-2">
                {vacations.slice(0, 10).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm text-gray-900">
                        {format(new Date(v.start_date), 'dd.MM.yyyy', { locale: pl })} — {format(new Date(v.end_date), 'dd.MM.yyyy', { locale: pl })}
                      </p>
                      <p className="text-xs text-gray-500">{v.days_count} dni roboczych · {v.request_type === 'remote' ? 'Praca zdalna' : 'Urlop'}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">Bilans urlopowy</h2>
              <div className="flex items-center gap-2">
                <select
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                  value={balanceYear}
                  onChange={e => setBalanceYear(Number(e.target.value))}
                >
                  {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {hrAdmin && !editBalance && (
                  <button onClick={() => { setBalanceForm({ allocated_days: balance?.allocated_days ?? 0, carried_over: balance?.carried_over ?? 0, remote_days_allocated: balance?.remote_days_allocated ?? 0 }); setEditBalance(true) }} className="text-xs text-blue-600 hover:underline">Edytuj</button>
                )}
              </div>
            </div>

            {editBalance && hrAdmin ? (
              <div className="space-y-3">
                <FormField label="Przyznane dni urlopu">
                  <Input type="number" min="0" value={balanceForm.allocated_days} onChange={e => setBalanceForm((f: any) => ({ ...f, allocated_days: Number(e.target.value) }))} />
                </FormField>
                <FormField label="Przeniesione z poprzedniego roku">
                  <Input type="number" min="0" value={balanceForm.carried_over} onChange={e => setBalanceForm((f: any) => ({ ...f, carried_over: Number(e.target.value) }))} />
                </FormField>
                <FormField label="Przyznane dni zdalnych">
                  <Input type="number" min="0" value={balanceForm.remote_days_allocated} onChange={e => setBalanceForm((f: any) => ({ ...f, remote_days_allocated: Number(e.target.value) }))} />
                </FormField>
                <div className="flex gap-2">
                  <Btn size="sm" onClick={() => balanceMutation.mutate(balanceForm)} disabled={balanceMutation.isPending}><Save size={13} /> Zapisz</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => setEditBalance(false)}>Anuluj</Btn>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ['Przyznane', balance?.allocated_days ?? 0],
                  ['Przeniesione', balance?.carried_over ?? 0],
                  ['Wykorzystane', balance?.used_days ?? 0],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-semibold">{val} dni</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Dostępne</span>
                  <span className="text-lg font-bold text-blue-700">{balance?.available_days ?? 0} dni</span>
                </div>
              </div>
            )}
          </Card>

          {hrAdmin && (
            <Card className="p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Koryguj dni urlopu</h2>
              <div className="space-y-2">
                <select
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                  value={adjustField}
                  onChange={e => setAdjustField(e.target.value as 'vacation' | 'remote')}
                >
                  <option value="vacation">Urlop</option>
                  <option value="remote">Praca zdalna</option>
                </select>
                <input
                  type="number" min="1"
                  placeholder="Liczba dni"
                  value={adjustDays}
                  onChange={e => setAdjustDays(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-700"
                />
                <div className="flex gap-2">
                  <Btn size="sm" className="flex-1" onClick={() => adjustMutation.mutate('add')}
                    disabled={!adjustDays || Number(adjustDays) < 1 || adjustMutation.isPending}>
                    <Plus size={13} /> Dodaj
                  </Btn>
                  <Btn size="sm" variant="secondary" className="flex-1" onClick={() => adjustMutation.mutate('subtract')}
                    disabled={!adjustDays || Number(adjustDays) < 1 || adjustMutation.isPending}>
                    <Minus size={13} /> Odejmij
                  </Btn>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <Laptop size={16} className="text-purple-600" /> Praca zdalna
            </h2>
            <div className="space-y-2">
              {[
                ['Przyznane', balance?.remote_days_allocated ?? 0],
                ['Wykorzystane', balance?.remote_days_used ?? 0],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-sm font-semibold">{val} dni</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between">
                <span className="text-xs font-medium text-gray-700">Dostępne</span>
                <span className="text-base font-bold text-purple-700">{balance?.available_remote_days ?? 0} dni</span>
              </div>
            </div>
          </Card>

          {typeAllocs.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Tag size={16} className="text-orange-500" /> Dodatkowe rodzaje urlopów
              </h2>
              <div className="space-y-3">
                {typeAllocs.map((a: any) => (
                  <div key={a.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{a.vacation_type_name}</span>
                      <span className={`text-sm font-bold ${a.available_days > 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {a.available_days} dni
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: a.allocated_days > 0 ? `${Math.min(100, (a.used_days / a.allocated_days) * 100)}%` : '0%',
                          backgroundColor: '#f07030',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>Użyte: {a.used_days}</span>
                      <span>Limit: {a.allocated_days}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-2">Role</h2>
            <div className="flex flex-wrap gap-2">
              <Badge color={roleColor[employee.role] || 'gray'}>{employee.role_display}</Badge>
              {employee.custom_role_name && (
                <Badge color="orange">{employee.custom_role_name}</Badge>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={passwordModal} onClose={() => setPasswordModal(false)} title="Zmień hasło">
        <div className="space-y-4">
          <FormField label="Nowe hasło">
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
          </FormField>
          <div className="flex gap-3">
            <Btn onClick={() => passwordMutation.mutate()} disabled={newPassword.length < 6 || passwordMutation.isPending}>
              <Key size={16} /> Zmień hasło
            </Btn>
            <Btn variant="secondary" onClick={() => setPasswordModal(false)}>Anuluj</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
