import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createVacationRequest, getVacationBalance, getVacationTypes, getMyVacationTypeAllocations, getVacationTypeAllocations, getEmployeeCalendarHolidays } from '../../api/hr'
import { getUsers } from '../../api/users'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'
import { PageHeader, Card, Btn, FormField, Input, Textarea, Select, ErrorMessage } from '../../components/ui'
import { ArrowLeft, Send, Calendar, Laptop } from 'lucide-react'

function countWorkdays(start: string, end: string, holidays: Set<string> = new Set()): number {
  if (!start || !end) return 0
  let count = 0
  const cur = new Date(start)
  const endDate = new Date(end)
  while (cur <= endDate) {
    const day = cur.getDay()
    const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    if (day !== 0 && day !== 6 && !holidays.has(ds)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export default function NowyWniosekPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const hrAdmin = isHROrAdmin(user)
  const year = new Date().getFullYear()

  const [form, setForm] = useState({
    employee: String(user?.id || ''),
    start_date: '',
    end_date: '',
    reason: '',
    request_type: 'vacation' as 'vacation' | 'remote',
    vacation_type: '',
  })
  const [error, setError] = useState('')

  const { data: balance } = useQuery({
    queryKey: ['vacation-balance', form.employee, year],
    queryFn: () => getVacationBalance(Number(form.employee), year),
    enabled: !!form.employee,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', { is_active: 'true' }],
    queryFn: () => getUsers({ is_active: 'true' }),
    enabled: hrAdmin,
  })

  const { data: vacTypesData } = useQuery({
    queryKey: ['vacation-types', true],
    queryFn: () => getVacationTypes(true),
  })

  // For HR/admin: fetch allocations for the SELECTED employee via admin API
  const { data: empAllocsData } = useQuery({
    queryKey: ['vacation-type-allocations', form.employee, year],
    queryFn: () => getVacationTypeAllocations({ employee: form.employee, year: String(year) }),
    enabled: hrAdmin && !!form.employee,
  })

  // For regular employees: fetch own allocations
  const { data: myAllocsData } = useQuery({
    queryKey: ['my-vacation-type-allocations', year],
    queryFn: () => getMyVacationTypeAllocations(year),
    enabled: !hrAdmin,
  })

  const { data: calendarData } = useQuery({
    queryKey: ['employee-calendar-holidays', form.employee, year],
    queryFn: () => getEmployeeCalendarHolidays({ employee: Number(form.employee), year }),
    enabled: !!form.employee,
  })
  const calendarHolidays: Set<string> = new Set((calendarData?.holidays || []).map((h: any) => h.date as string))

  const vacTypes = vacTypesData?.results || vacTypesData || []
  const rawAllocs = hrAdmin ? (empAllocsData?.results || empAllocsData) : (myAllocsData?.results || myAllocsData)
  const myAllocs = rawAllocs || []

  const selectedType = vacTypes.find((t: any) => String(t.id) === form.vacation_type)
  const typeAlloc = myAllocs.find((a: any) => String(a.vacation_type) === form.vacation_type)

  const days = countWorkdays(form.start_date, form.end_date, calendarHolidays)

  let available = 0
  if (form.vacation_type && selectedType) {
    if (!selectedType.requires_balance) available = 9999
    else available = typeAlloc?.available_days ?? 0
  } else if (form.request_type === 'remote') {
    available = balance?.available_remote_days ?? 0
  } else {
    available = balance?.available_days ?? 0
  }

  const mutation = useMutation({
    mutationFn: () => createVacationRequest({
      employee: Number(form.employee),
      start_date: form.start_date,
      end_date: form.end_date,
      days_count: days,
      reason: form.reason,
      request_type: form.request_type,
      vacation_type: form.vacation_type ? Number(form.vacation_type) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vacation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] })
      queryClient.invalidateQueries({ queryKey: ['my-vacation-type-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-type-allocations'] })
      navigate('/urlopy')
    },
    onError: (err: any) => setError(err.response?.data?.detail || 'Błąd podczas składania wniosku.'),
  })

  const users = usersData?.results || usersData || []
  const insufficientDays = selectedType?.requires_balance !== false && days > available && days > 0
  const noLimit = selectedType && !selectedType.requires_balance

  return (
    <div className="p-6 max-w-xl">
      <PageHeader
        title="Nowy wniosek"
        subtitle="Złóż wniosek urlopowy lub o pracę zdalną"
        actions={<Btn variant="secondary" onClick={() => navigate('/urlopy')}><ArrowLeft size={16} /> Powrót</Btn>}
      />

      <Card className="p-6">
        <form onSubmit={e => { e.preventDefault(); setError(''); mutation.mutate() }} className="space-y-5">

          {/* Typ wniosku */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, request_type: 'vacation', vacation_type: '' }))}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${form.request_type === 'vacation' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Calendar size={15} /> Urlop
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, request_type: 'remote', vacation_type: '' }))}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${form.request_type === 'remote' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Laptop size={15} /> Praca zdalna
            </button>
          </div>

          {/* Rodzaj urlopu (tylko dla vacation) */}
          {form.request_type === 'vacation' && vacTypes.length > 0 && (
            <FormField label="Rodzaj urlopu">
              <Select value={form.vacation_type} onChange={e => setForm(f => ({ ...f, vacation_type: e.target.value }))}>
                <option value="">— Standardowy (z głównego salda) —</option>
                {vacTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </FormField>
          )}

          {hrAdmin && (
            <FormField label="Pracownik">
              <Select value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))}>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </Select>
            </FormField>
          )}

          {/* Saldo info */}
          {noLimit ? (
            <div className="border rounded-lg p-3 text-sm bg-teal-50 border-teal-200 text-teal-700">
              Rodzaj: <strong>{selectedType.name}</strong> — bez limitu dni
            </div>
          ) : (form.vacation_type && selectedType) ? (
            <div className="border rounded-lg p-3 text-sm bg-blue-50 border-blue-200 text-blue-700">
              Rodzaj: <strong>{selectedType.name}</strong> — dostępne: <strong>{typeAlloc?.available_days ?? '?'} dni</strong>
            </div>
          ) : balance ? (
            <div className={`border rounded-lg p-3 text-sm ${form.request_type === 'remote' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
              {form.request_type === 'remote'
                ? <>Dostępne dni pracy zdalnej: <strong>{balance.available_remote_days} dni</strong></>
                : <>Dostępne dni urlopu: <strong>{available} dni</strong></>
              }
            </div>
          ) : null}

          {calendarData?.calendar_name && (
            <div className="text-xs text-gray-500 flex items-center gap-1.5 -mt-2">
              <span className="w-2 h-2 rounded-full bg-green-700 flex-shrink-0" />
              Kalendarz: <strong>{calendarData.calendar_name}</strong> — dni wolne uwzględnione w obliczeniach
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Data od" required>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            </FormField>
            <FormField label="Data do" required>
              <Input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
            </FormField>
          </div>

          {days > 0 && !noLimit && (
            <div className={`p-3 rounded-lg text-sm font-medium ${insufficientDays ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {insufficientDays
                ? `Za mało dni! Potrzeba: ${days}, dostępne: ${available}`
                : `Liczba dni roboczych: ${days} (dostępne: ${available})`}
            </div>
          )}
          {days > 0 && noLimit && (
            <div className="p-3 rounded-lg text-sm font-medium bg-teal-50 text-teal-700 border border-teal-200">
              Liczba dni roboczych: {days}
            </div>
          )}

          <FormField label="Powód (opcjonalnie)">
            <Textarea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Opcjonalnie podaj powód..." />
          </FormField>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-3">
            <Btn type="submit" disabled={days < 1 || (insufficientDays && !noLimit) || mutation.isPending}>
              <Send size={16} /> {mutation.isPending ? 'Składanie...' : 'Złóż wniosek'}
            </Btn>
          </div>
        </form>
      </Card>
    </div>
  )
}
