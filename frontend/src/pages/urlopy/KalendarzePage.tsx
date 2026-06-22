import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCalendars, createCalendar, updateCalendar, deleteCalendar,
  addRecurringHoliday, deleteRecurringHoliday,
  addSingleHoliday, deleteSingleHoliday,
  assignCalendarEmployees, deleteCalendarAssignment,
} from '../../api/hr'
import { getUsers } from '../../api/users'
import { PageHeader, Card, Btn, FormField, Input, LoadingPage, Badge } from '../../components/ui'
import { Plus, Trash2, Users, X, Check, Search, RefreshCw, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

const MONTHS = [
  { v: 1, l: 'Styczeń' }, { v: 2, l: 'Luty' }, { v: 3, l: 'Marzec' },
  { v: 4, l: 'Kwiecień' }, { v: 5, l: 'Maj' }, { v: 6, l: 'Czerwiec' },
  { v: 7, l: 'Lipiec' }, { v: 8, l: 'Sierpień' }, { v: 9, l: 'Wrzesień' },
  { v: 10, l: 'Październik' }, { v: 11, l: 'Listopad' }, { v: 12, l: 'Grudzień' },
]

type SubTab = 'recurring' | 'single' | 'employees'

export default function KalendarzePage() {
  const qc = useQueryClient()
  const currentYear = new Date().getFullYear()

  // Calendar create form
  const [showForm, setShowForm] = useState(false)
  const [calForm, setCalForm] = useState({ name: '', year: String(currentYear), is_active: true })

  // Active panel
  const [activeId, setActiveId] = useState<number | null>(null)
  const [subTab, setSubTab] = useState<SubTab>('recurring')

  // Recurring holiday form
  const [recurForm, setRecurForm] = useState({ month: '1', day: '', name: '' })

  // Single holiday form
  const [singleForm, setSingleForm] = useState({ date: '', name: '' })

  // Employee assign
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([])
  const [empSearch, setEmpSearch] = useState('')

  // Queries
  const { data: calsData, isLoading } = useQuery({
    queryKey: ['work-calendars'],
    queryFn: () => getCalendars(),
  })
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers({ is_active: 'true' }),
  })

  const calendars: any[] = calsData?.results || calsData || []
  const users: any[] = usersData?.results || usersData || []
  const activeCal = calendars.find(c => c.id === activeId)

  // Mutations
  const createCalMut = useMutation({
    mutationFn: createCalendar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-calendars'] }); setShowForm(false); setCalForm({ name: '', year: String(currentYear), is_active: true }) },
  })
  const updateCalMut = useMutation({
    mutationFn: ({ id, data }: any) => updateCalendar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-calendars'] }),
  })
  const deleteCalMut = useMutation({
    mutationFn: deleteCalendar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-calendars'] }); setActiveId(null) },
  })
  const addRecurMut = useMutation({
    mutationFn: ({ calId, data }: any) => addRecurringHoliday(calId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-calendars'] }); setRecurForm({ month: '1', day: '', name: '' }) },
  })
  const delRecurMut = useMutation({
    mutationFn: deleteRecurringHoliday,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-calendars'] }),
  })
  const addSingleMut = useMutation({
    mutationFn: ({ calId, data }: any) => addSingleHoliday(calId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-calendars'] }); setSingleForm({ date: '', name: '' }) },
  })
  const delSingleMut = useMutation({
    mutationFn: deleteSingleHoliday,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-calendars'] }),
  })
  const assignMut = useMutation({
    mutationFn: ({ calId, empIds }: any) => assignCalendarEmployees(calId, empIds),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-calendars'] }); setSelectedEmpIds([]); setEmpSearch('') },
  })
  const unassignMut = useMutation({
    mutationFn: deleteCalendarAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-calendars'] }),
  })

  const openPanel = (id: number) => {
    setActiveId(activeId === id ? null : id)
    setSubTab('recurring')
    setSelectedEmpIds([])
    setEmpSearch('')
    setRecurForm({ month: '1', day: '', name: '' })
    setSingleForm({ date: '', name: '' })
  }

  if (isLoading) return <LoadingPage />

  // Employee assign helpers
  const assignedEmpIds = new Set((activeCal?.assignments || []).map((a: any) => a.employee))
  const unassigned = users.filter(u => !assignedEmpIds.has(u.id))
  const filteredUnassigned = empSearch
    ? unassigned.filter(u => `${u.first_name} ${u.last_name}`.toLowerCase().includes(empSearch.toLowerCase()))
    : unassigned
  const allFilteredSelected = filteredUnassigned.length > 0 && filteredUnassigned.every(u => selectedEmpIds.includes(u.id))
  const toggleEmp = (id: number) =>
    setSelectedEmpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !filteredUnassigned.some(u => u.id === id)))
    } else {
      const toAdd = filteredUnassigned.map(u => u.id).filter((id: number) => !selectedEmpIds.includes(id))
      setSelectedEmpIds(prev => [...prev, ...toAdd])
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Kalendarze pracownicze"
        subtitle="Zarządzaj dniami wolnymi i przypisuj pracowników"
        actions={<Btn onClick={() => { setShowForm(true) }}><Plus size={16} /> Nowy kalendarz</Btn>}
      />

      {showForm && (
        <Card className="p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Nowy kalendarz</h3>
          <form
            onSubmit={e => { e.preventDefault(); createCalMut.mutate({ name: calForm.name, year: Number(calForm.year), is_active: calForm.is_active }) }}
            className="flex flex-wrap gap-4 items-end"
          >
            <FormField label="Nazwa" required>
              <Input value={calForm.name} onChange={e => setCalForm(f => ({ ...f, name: e.target.value }))} required placeholder="np. Polska — Cały kraj" style={{ width: '260px' }} />
            </FormField>
            <FormField label="Rok" required>
              <Input type="number" value={calForm.year} onChange={e => setCalForm(f => ({ ...f, year: e.target.value }))} required style={{ width: '100px' }} />
            </FormField>
            <div className="flex items-center gap-2 mb-1">
              <input type="checkbox" id="cal-active" checked={calForm.is_active} onChange={e => setCalForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-green-700" />
              <label htmlFor="cal-active" className="text-sm text-gray-700 cursor-pointer">Aktywny</label>
            </div>
            <div className="flex gap-2 mb-1">
              <Btn type="submit" disabled={createCalMut.isPending}><Check size={15} /> Utwórz</Btn>
              <Btn variant="secondary" type="button" onClick={() => setShowForm(false)}><X size={15} /> Anuluj</Btn>
            </div>
          </form>
        </Card>
      )}

      {calendars.length === 0 && !showForm && (
        <Card className="p-10 text-center text-gray-400">
          <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
          <p>Brak kalendarzy. Utwórz pierwszy kalendarz.</p>
        </Card>
      )}

      <div className="grid gap-4">
        {calendars.map((cal: any) => (
          <Card key={cal.id} className="p-5">
            {/* Calendar header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-gray-900">{cal.name}</span>
                <Badge color="blue">{cal.year}</Badge>
                {!cal.is_active && <Badge color="red">Nieaktywny</Badge>}
                <span className="text-sm text-gray-500">
                  {(cal.recurring_holidays?.length || 0) + (cal.single_holidays?.length || 0)} dni wolnych · {cal.employee_count} pracowników
                </span>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="secondary" onClick={() => updateCalMut.mutate({ id: cal.id, data: { is_active: !cal.is_active } })}>
                  <RefreshCw size={13} /> {cal.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                </Btn>
                <Btn size="sm" variant="secondary" onClick={() => openPanel(cal.id)}>
                  <CalendarDays size={14} /> {activeId === cal.id ? 'Zwiń' : 'Zarządzaj'}
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => { if (confirm(`Usunąć kalendarz "${cal.name}"?`)) deleteCalMut.mutate(cal.id) }}>
                  <Trash2 size={14} className="text-red-400" />
                </Btn>
              </div>
            </div>

            {activeId === cal.id && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                {/* Sub-tabs */}
                <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
                  {([
                    { key: 'recurring', label: `Cykliczne (${cal.recurring_holidays?.length || 0})` },
                    { key: 'single', label: `Pojedyncze (${cal.single_holidays?.length || 0})` },
                    { key: 'employees', label: `Pracownicy (${cal.employee_count})` },
                  ] as { key: SubTab; label: string }[]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setSubTab(t.key)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Recurring holidays */}
                {subTab === 'recurring' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Dodaj cykliczny dzień wolny</h4>
                      <p className="text-xs text-gray-500 mb-3">Powtarza się co roku w tym samym dniu (np. święta państwowe).</p>
                      <form
                        onSubmit={e => { e.preventDefault(); addRecurMut.mutate({ calId: cal.id, data: { month: Number(recurForm.month), day: Number(recurForm.day), name: recurForm.name } }) }}
                        className="space-y-3"
                      >
                        <div className="flex gap-3">
                          <FormField label="Miesiąc">
                            <select
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none bg-white"
                              value={recurForm.month}
                              onChange={e => setRecurForm(f => ({ ...f, month: e.target.value }))}
                            >
                              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </select>
                          </FormField>
                          <FormField label="Dzień" required>
                            <Input type="number" min="1" max="31" value={recurForm.day}
                              onChange={e => setRecurForm(f => ({ ...f, day: e.target.value }))} required style={{ width: '72px' }} />
                          </FormField>
                        </div>
                        <FormField label="Nazwa" required>
                          <Input value={recurForm.name} onChange={e => setRecurForm(f => ({ ...f, name: e.target.value }))} required placeholder="np. Nowy Rok" />
                        </FormField>
                        <Btn type="submit" size="sm" disabled={addRecurMut.isPending}><Plus size={14} /> Dodaj</Btn>
                      </form>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Lista cyklicznych dni wolnych</h4>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {(cal.recurring_holidays || []).length === 0 && (
                          <p className="text-xs text-gray-400">Brak cyklicznych dni wolnych.</p>
                        )}
                        {(cal.recurring_holidays || []).map((h: any) => (
                          <div key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                            <span className="text-gray-700">
                              <span className="font-mono text-xs text-gray-500 mr-2">{String(h.day).padStart(2, '0')}.{String(h.month).padStart(2, '0')}</span>
                              {h.name}
                            </span>
                            <Btn size="sm" variant="ghost" onClick={() => delRecurMut.mutate(h.id)}>
                              <Trash2 size={12} className="text-red-400" />
                            </Btn>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Single holidays */}
                {subTab === 'single' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Dodaj jednorazowy dzień wolny</h4>
                      <p className="text-xs text-gray-500 mb-3">Konkretna data, dotyczy tylko roku kalendarza.</p>
                      <form
                        onSubmit={e => { e.preventDefault(); addSingleMut.mutate({ calId: cal.id, data: { date: singleForm.date, name: singleForm.name } }) }}
                        className="space-y-3"
                      >
                        <FormField label="Data" required>
                          <Input type="date" value={singleForm.date} onChange={e => setSingleForm(f => ({ ...f, date: e.target.value }))} required />
                        </FormField>
                        <FormField label="Nazwa" required>
                          <Input value={singleForm.name} onChange={e => setSingleForm(f => ({ ...f, name: e.target.value }))} required placeholder="np. Dzień wolny od pracy" />
                        </FormField>
                        <Btn type="submit" size="sm" disabled={addSingleMut.isPending}><Plus size={14} /> Dodaj</Btn>
                      </form>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Lista jednorazowych dni wolnych</h4>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {(cal.single_holidays || []).length === 0 && (
                          <p className="text-xs text-gray-400">Brak jednorazowych dni wolnych.</p>
                        )}
                        {(cal.single_holidays || []).map((h: any) => (
                          <div key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                            <span className="text-gray-700">
                              <span className="font-mono text-xs text-gray-500 mr-2">
                                {format(new Date(h.date), 'dd.MM.yyyy', { locale: pl })}
                              </span>
                              {h.name}
                            </span>
                            <Btn size="sm" variant="ghost" onClick={() => delSingleMut.mutate(h.id)}>
                              <Trash2 size={12} className="text-red-400" />
                            </Btn>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Employee assignments */}
                {subTab === 'employees' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: assign */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Przypisz pracowników</h4>
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
                        <button type="button" onClick={toggleSelectAll} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                          {allFilteredSelected ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg mb-3 divide-y divide-gray-50">
                        {filteredUnassigned.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">
                            {unassigned.length === 0 ? 'Wszyscy pracownicy już przypisani' : 'Brak wyników'}
                          </p>
                        ) : (
                          filteredUnassigned.map((u: any) => (
                            <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input type="checkbox" checked={selectedEmpIds.includes(u.id)} onChange={() => toggleEmp(u.id)} className="accent-green-700" />
                              <span className="text-sm text-gray-800">{u.first_name} {u.last_name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <Btn
                        size="sm"
                        disabled={selectedEmpIds.length === 0 || assignMut.isPending}
                        onClick={() => assignMut.mutate({ calId: cal.id, empIds: selectedEmpIds })}
                      >
                        <Users size={14} />
                        {selectedEmpIds.length > 0 ? `Przypisz (${selectedEmpIds.length})` : 'Przypisz'}
                      </Btn>
                    </div>
                    {/* Right: assigned list */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Przypisani pracownicy ({cal.employee_count})</h4>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {(cal.assignments || []).length === 0 && (
                          <p className="text-xs text-gray-400">Brak przypisanych pracowników.</p>
                        )}
                        {(cal.assignments || []).map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                            <span className="text-gray-700">{a.employee_name}</span>
                            <Btn size="sm" variant="ghost" onClick={() => { if (confirm('Usunąć przypisanie?')) unassignMut.mutate(a.id) }}>
                              <X size={12} className="text-red-400" />
                            </Btn>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
