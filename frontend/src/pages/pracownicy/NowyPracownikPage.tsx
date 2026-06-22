import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, getDepartments, getUsers, getPositions, getCustomRoles } from '../../api/users'
import { PageHeader, Card, Btn, FormField, Input, Select, ErrorMessage } from '../../components/ui'
import { ArrowLeft, Save } from 'lucide-react'

export default function NowyPracownikPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    username: '', first_name: '', last_name: '', email: '', password: '',
    role: 'employee', custom_role: '', department: '', manager: '', position: '', phone: '', hire_date: '',
    contract_type: '', contract_start: '', contract_end: '',
    medical_exam_type: '', medical_exam_next_date: '',
    bhp_date: '', bhp_next_date: '',
  })
  const [error, setError] = useState('')

  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => getUsers({ is_active: 'true' }) })
  const { data: positionsData } = useQuery({ queryKey: ['positions'], queryFn: () => getPositions(true) })
  const { data: customRolesData } = useQuery({ queryKey: ['custom-roles'], queryFn: getCustomRoles })

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/pracownicy')
    },
    onError: (err: any) => {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', '))
      } else {
        setError('Błąd podczas tworzenia konta.')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate({
      ...form,
      department: form.department ? Number(form.department) : null,
      manager: form.manager ? Number(form.manager) : null,
      custom_role: form.custom_role ? Number(form.custom_role) : null,
      hire_date: form.hire_date || null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      medical_exam_next_date: form.medical_exam_next_date || null,
      bhp_date: form.bhp_date || null,
      bhp_next_date: form.bhp_next_date || null,
    })
  }

  const set = (key: string) => (e: any) => setForm(f => ({ ...f, [key]: e.target.value }))
  const deptList = departments?.results || departments || []
  const userList = usersData?.results || usersData || []
  const positionsList = positionsData?.results || positionsData || []
  const customRoles = customRolesData?.results || customRolesData || []

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Nowy pracownik"
        subtitle="Utwórz konto pracownika w systemie"
        actions={<Btn variant="secondary" onClick={() => navigate('/pracownicy')}><ArrowLeft size={16} /> Powrót</Btn>}
      />

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 border-b pb-3">Dane osobowe</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Imię" required>
              <Input value={form.first_name} onChange={set('first_name')} required />
            </FormField>
            <FormField label="Nazwisko" required>
              <Input value={form.last_name} onChange={set('last_name')} required />
            </FormField>
          </div>
          <FormField label="Email" required>
            <Input type="email" value={form.email} onChange={set('email')} required />
          </FormField>
          <FormField label="Telefon">
            <Input value={form.phone} onChange={set('phone')} placeholder="+48 123 456 789" />
          </FormField>

          <h2 className="font-semibold text-gray-800 border-b pb-3 pt-2">Konto w systemie</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nazwa użytkownika (login)" required>
              <Input value={form.username} onChange={set('username')} required />
            </FormField>
            <FormField label="Hasło" required>
              <Input type="password" value={form.password} onChange={set('password')} required minLength={6} />
            </FormField>
          </div>
          <FormField label="Rola w systemie" required>
            <Select value={form.role} onChange={set('role')}>
              <option value="employee">Pracownik</option>
              <option value="manager">Kierownik</option>
              <option value="hr">Kadry/HR</option>
              <option value="admin">Administrator</option>
            </Select>
          </FormField>
          <FormField label="Niestandardowa rola (opcjonalnie)">
            <Select value={form.custom_role} onChange={set('custom_role')}>
              <option value="">— Brak —</option>
              {customRoles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </FormField>

          <h2 className="font-semibold text-gray-800 border-b pb-3 pt-2">Stanowisko</h2>
          <FormField label="Stanowisko">
            {positionsList.length > 0 ? (
              <Select value={form.position} onChange={set('position')}>
                <option value="">-- Wybierz stanowisko --</option>
                {positionsList.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </Select>
            ) : (
              <Input value={form.position} onChange={set('position')} placeholder="np. Specjalista ds. sprzedaży" />
            )}
          </FormField>
          <FormField label="Dział">
            <Select value={form.department} onChange={set('department')}>
              <option value="">-- Wybierz dział --</option>
              {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Przełożony">
            <Select value={form.manager} onChange={set('manager')}>
              <option value="">-- Brak --</option>
              {userList.map((u: any) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data zatrudnienia">
            <Input type="date" value={form.hire_date} onChange={set('hire_date')} />
          </FormField>

          <h2 className="font-semibold text-gray-800 border-b pb-3 pt-2">Umowa</h2>
          <FormField label="Typ umowy">
            <Select value={form.contract_type} onChange={set('contract_type')}>
              <option value="">— Nie dotyczy —</option>
              <option value="uop_nieokreslony">UoP — czas nieokreślony</option>
              <option value="uop_okreslony">UoP — czas określony</option>
              <option value="zlecenie">Umowa zlecenie</option>
              <option value="dzielo">Umowa o dzieło</option>
              <option value="b2b">B2B</option>
              <option value="staz">Staż / Praktyka</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Umowa od">
              <Input type="date" value={form.contract_start} onChange={set('contract_start')} />
            </FormField>
            <FormField label="Umowa do">
              <Input type="date" value={form.contract_end} onChange={set('contract_end')} />
            </FormField>
          </div>

          <h2 className="font-semibold text-gray-800 border-b pb-3 pt-2">Badania lekarskie</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Typ badania">
              <Select value={form.medical_exam_type} onChange={set('medical_exam_type')}>
                <option value="">— Brak —</option>
                <option value="wstepne">Wstępne</option>
                <option value="okresowe">Okresowe</option>
                <option value="kontrolne">Kontrolne</option>
              </Select>
            </FormField>
            <FormField label="Następne badanie">
              <Input type="date" value={form.medical_exam_next_date} onChange={set('medical_exam_next_date')} />
            </FormField>
          </div>

          <h2 className="font-semibold text-gray-800 border-b pb-3 pt-2">Szkolenie BHP</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Data szkolenia BHP">
              <Input type="date" value={form.bhp_date} onChange={set('bhp_date')} />
            </FormField>
            <FormField label="Następne szkolenie BHP">
              <Input type="date" value={form.bhp_next_date} onChange={set('bhp_next_date')} />
            </FormField>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={mutation.isPending}>
              <Save size={16} /> {mutation.isPending ? 'Tworzenie...' : 'Utwórz konto'}
            </Btn>
          </div>
        </Card>
      </form>
    </div>
  )
}
