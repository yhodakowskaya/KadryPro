import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, restoreUser } from '../../api/users'
import { Link } from 'react-router-dom'
import { PageHeader, Card, Btn, LoadingPage, Badge } from '../../components/ui'
import { Plus, Users, Search, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { useAuthStore } from '../../stores/authStore'

const roleColor: Record<string, string> = { admin: 'purple', hr: 'blue', manager: 'orange', employee: 'gray' }

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

function DateCell({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-gray-400 text-xs">—</span>
  const d = new Date(date)
  const today = new Date()
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let cls = 'text-gray-700'
  if (diffDays < 0) cls = 'text-red-700 font-semibold'
  else if (diffDays <= 30) cls = 'text-red-600 font-semibold'
  else if (diffDays <= 90) cls = 'text-orange-600'
  return <span className={`text-xs ${cls}`}>{format(d, 'dd.MM.yyyy')}</span>
}

export default function PracownicyPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [tab, setTab] = useState<'active' | 'terminated'>('active')
  const filterYear = new Date().getFullYear()

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, role, is_active: tab === 'active' ? 'true' : 'false' }],
    queryFn: () => getUsers({
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      is_active: tab === 'active' ? 'true' : 'false',
    }),
  })

  const restoreMutation = useMutation({
    mutationFn: restoreUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  let users = data?.results || data || []

  if (tab === 'active' && filterMonth) {
    const m = parseInt(filterMonth)
    users = users.filter((u: any) => {
      const inMonth = (dateStr: string | null) => {
        if (!dateStr) return false
        const d = new Date(dateStr)
        return d.getMonth() + 1 === m && d.getFullYear() === filterYear
      }
      return inMonth(u.contract_end) || inMonth(u.medical_exam_next_date) || inMonth(u.bhp_next_date)
    })
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6">
      <PageHeader
        title="Pracownicy"
        subtitle={`${users.length} osób`}
        actions={
          <div className="flex gap-2">
            <Link to="/pracownicy/import">
              <Btn variant="secondary"><Plus size={16} /> Import z Excel</Btn>
            </Link>
            <Link to="/pracownicy/nowy">
              <Btn><Plus size={16} /> Dodaj pracownika</Btn>
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Aktywni
        </button>
        <button
          onClick={() => setTab('terminated')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'terminated' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Zwolnieni
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 w-52"
            placeholder="Szukaj pracownika..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none bg-white"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="">Wszystkie role</option>
          <option value="admin">Administrator</option>
          <option value="hr">Kadry/HR</option>
          <option value="manager">Kierownik</option>
          <option value="employee">Pracownik</option>
        </select>
        {tab === 'active' && (
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none bg-white"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          >
            <option value="">Wszystkie miesiące</option>
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={String(i + 1)}>{m} {filterYear}</option>
            ))}
          </select>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pracownik</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stanowisko</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dział</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rola</th>
                {tab === 'active' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Umowa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Badanie lek.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BHP</th>
                  </>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data zwolnienia</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'active' ? 8 : 6} className="px-4 py-12 text-center text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{tab === 'active' ? 'Brak aktywnych pracowników' : 'Brak zwolnionych pracowników'}</p>
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 flex-shrink-0">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.position || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.department_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={roleColor[u.role] || 'gray'}>{u.role_display}</Badge>
                    </td>
                    {tab === 'active' ? (
                      <>
                        <td className="px-4 py-3"><DateCell date={u.contract_end} /></td>
                        <td className="px-4 py-3"><DateCell date={u.medical_exam_next_date} /></td>
                        <td className="px-4 py-3"><DateCell date={u.bhp_next_date} /></td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {u.termination_date ? format(new Date(u.termination_date), 'dd.MM.yyyy') : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link to={`/pracownicy/${u.id}`}>
                          <Btn size="sm" variant="secondary">Karta</Btn>
                        </Link>
                        {tab === 'terminated' && isAdmin && (
                          <Btn
                            size="sm" variant="secondary"
                            onClick={() => {
                              if (confirm(`Przywrócić pracownika ${u.first_name} ${u.last_name}?`))
                                restoreMutation.mutate(u.id)
                            }}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw size={14} /> Przywróć
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
