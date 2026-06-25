import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVacationBalance, getVacationRequests, cancelVacation, getVacationTypes, archiveVacationRequests } from '../../api/hr'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'
import { Link } from 'react-router-dom'
import { PageHeader, Card, Btn, LoadingPage, StatusBadge, Modal, FormField, Select } from '../../components/ui'
import { Plus, Calendar, Laptop, Search, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'

const MONTHS = [
  '', 'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

export default function UrlopyPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const hrAdmin = isHROrAdmin(user)
  const year = new Date().getFullYear()
  const [tab, setTab] = useState<'vacation' | 'remote'>('vacation')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [filterVacationType, setFilterVacationType] = useState('')
  const [archiveModal, setArchiveModal] = useState(false)
  const [archiveYear, setArchiveYear] = useState(String(year - 1))
  const [archiveMonth, setArchiveMonth] = useState('')

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['vacation-balance', user?.id, year],
    queryFn: () => getVacationBalance(user!.id, year),
    enabled: !!user,
  })

  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['my-vacation-requests'],
    queryFn: () => getVacationRequests(),
  })

  const { data: vacTypesData } = useQuery({
    queryKey: ['vacation-types'],
    queryFn: () => getVacationTypes(),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelVacation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vacation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-balance'] })
      queryClient.invalidateQueries({ queryKey: ['my-vacation-type-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['vacation-type-allocations'] })
    },
  })
  const archiveMutation = useMutation({
    mutationFn: () => archiveVacationRequests(Number(archiveYear), archiveMonth ? Number(archiveMonth) : undefined),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-vacation-requests'] })
      setArchiveModal(false)
      const label = archiveMonth ? `${MONTHS[Number(archiveMonth)]} ${archiveYear}` : `rok ${archiveYear}`
      alert(`Zarchiwizowano ${data.archived} wniosków za ${label}.`)
    },
  })

  if (loadingBalance || loadingRequests) return <LoadingPage />

  const vacTypes = vacTypesData?.results || vacTypesData || []
  const allRequests = requests?.results || requests || []
  const vacationRequests = allRequests.filter((r: any) => r.request_type === 'vacation' || !r.request_type)
  const remoteRequests = allRequests.filter((r: any) => r.request_type === 'remote')

  let displayList = tab === 'vacation' ? vacationRequests : remoteRequests
  if (searchName) {
    displayList = displayList.filter((r: any) =>
      r.employee_name?.toLowerCase().includes(searchName.toLowerCase())
    )
  }
  if (filterVacationType === 'standard') {
    displayList = displayList.filter((r: any) => !r.vacation_type)
  } else if (filterVacationType) {
    displayList = displayList.filter((r: any) => String(r.vacation_type) === filterVacationType)
  }

  const getTypeLabel = (req: any) => {
    if (req.vacation_type_name) return req.vacation_type_name
    if (req.request_type === 'remote') return 'Praca zdalna'
    return 'Urlop standardowy'
  }

  const colSpan = hrAdmin ? 8 : 7

  return (
    <div className="p-6">
      <PageHeader
        title="Moje urlopy i praca zdalna"
        subtitle={`Rok ${year}`}
        actions={
          <div className="flex gap-2">
            {hrAdmin && (
              <Btn variant="secondary" onClick={() => setArchiveModal(true)}>
                <Archive size={16} /> Archiwizuj
              </Btn>
            )}
            <Link to="/urlopy/wniosek">
              <Btn><Plus size={16} /> Nowy wniosek</Btn>
            </Link>
          </div>
        }
      />

      <div className="mb-2">
        <button
          onClick={() => setBalanceVisible(v => !v)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          {balanceVisible ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {balanceVisible ? 'Ukryj bilans' : 'Pokaż bilans'}
        </button>
      </div>

      {balanceVisible && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><Calendar size={20} className="text-blue-600" /></div>
            <h2 className="font-semibold text-gray-900">Bilans urlopowy {year}</h2>
          </div>
          <div className="space-y-3">
            {[
              ['Przyznane dni', balance?.allocated_days ?? 0],
              ['Przeniesione z poprzedniego roku', balance?.carried_over ?? 0],
              ['Wykorzystane', balance?.used_days ?? 0],
            ].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{val} dni</span>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between">
              <span className="text-sm font-semibold">Dostępne</span>
              <span className="text-xl font-bold text-blue-700">{balance?.available_days ?? 0} dni</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg"><Laptop size={20} className="text-purple-600" /></div>
            <h2 className="font-semibold text-gray-900">Praca zdalna {year}</h2>
          </div>
          <div className="space-y-3">
            {[
              ['Przyznane dni', balance?.remote_days_allocated ?? 0],
              ['Wykorzystane', balance?.remote_days_used ?? 0],
            ].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium">{val} dni</span>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between">
              <span className="text-sm font-semibold">Dostępne</span>
              <span className="text-xl font-bold text-purple-700">{balance?.available_remote_days ?? 0} dni</span>
            </div>
          </div>
        </Card>
      </div>

      }

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('vacation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'vacation' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Calendar size={14} /> Urlopy ({vacationRequests.length})
        </button>
        <button
          onClick={() => setTab('remote')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'remote' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Laptop size={14} /> Praca zdalna ({remoteRequests.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {hrAdmin && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 w-52"
              placeholder="Szukaj pracownika..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
          </div>
        )}
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none bg-white"
          value={filterVacationType}
          onChange={e => setFilterVacationType(e.target.value)}
        >
          <option value="">Wszystkie rodzaje</option>
          <option value="standard">Urlop standardowy</option>
          {vacTypes.map((t: any) => (
            <option key={t.id} value={String(t.id)}>{t.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {hrAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pracownik</th>}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Okres</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dni</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data złożenia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rodzaj urlopu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akceptujący</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Brak wniosków
                  </td>
                </tr>
              ) : (
                displayList.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    {hrAdmin && (
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{req.employee_name}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {format(new Date(req.start_date), 'dd.MM.yyyy', { locale: pl })} – {format(new Date(req.end_date), 'dd.MM.yyyy', { locale: pl })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{req.days_count} dni</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(new Date(req.created_at), 'dd.MM.yyyy', { locale: pl })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {req.vacation_type_color ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: req.vacation_type_color }} />
                          {getTypeLabel(req)}
                        </span>
                      ) : (
                        <span className="text-gray-500">{getTypeLabel(req)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{req.approver_name || '—'}</td>
                    <td className="px-4 py-3">
                      {(req.status === 'pending' || (hrAdmin && req.status === 'approved')) && (
                        <Btn
                          size="sm" variant="ghost"
                          onClick={() => {
                            const msg = req.status === 'approved'
                              ? 'Wycofać zatwierdzony urlop? Dni zostaną zwrócone do salda.'
                              : 'Wycofać wniosek?'
                            if (confirm(msg)) cancelMutation.mutate(req.id)
                          }}
                        >
                          Wycofaj
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={archiveModal} onClose={() => setArchiveModal(false)} title="Archiwizuj wnioski urlopowe">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Zarchiwizowane wnioski zostaną ukryte z listy. Można archiwizować cały rok lub wybrany miesiąc.</p>
          <FormField label="Rok">
            <Select value={archiveYear} onChange={e => setArchiveYear(e.target.value)}>
              {[year - 2, year - 1, year].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Miesiąc (opcjonalnie — jeśli brak, cały rok)">
            <Select value={archiveMonth} onChange={e => setArchiveMonth(e.target.value)}>
              <option value="">— Cały rok —</option>
              {MONTHS.slice(1).map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex gap-3 pt-1">
            <Btn onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
              <Archive size={16} /> {archiveMutation.isPending ? 'Archiwizowanie...' : 'Archiwizuj'}
            </Btn>
            <Btn variant="secondary" onClick={() => setArchiveModal(false)}>Anuluj</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
