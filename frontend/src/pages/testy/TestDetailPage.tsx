import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTest, assignTest, getTestResults } from '../../api/tests'
import { getUsers } from '../../api/users'
import { useState } from 'react'
import { PageHeader, Card, Btn, LoadingPage, Badge, Modal, Input, FormField } from '../../components/ui'
import { ArrowLeft, Users } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

export default function TestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [assignModal, setAssignModal] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [deadline, setDeadline] = useState('')
  const [tab, setTab] = useState<'questions' | 'results'>('questions')

  const { data: test, isLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => getTest(Number(id)),
  })
  const { data: results } = useQuery({
    queryKey: ['test-results', id],
    queryFn: () => getTestResults({ test: String(id) }),
    enabled: tab === 'results',
  })
  const { data: usersData } = useQuery({
    queryKey: ['users', { is_active: 'true' }],
    queryFn: () => getUsers({ is_active: 'true' }),
    enabled: assignModal,
  })

  const assignMutation = useMutation({
    mutationFn: () => assignTest(Number(id), { employee_ids: selectedEmployees, deadline: deadline || undefined }),
    onSuccess: () => {
      setAssignModal(false)
      setSelectedEmployees([])
      queryClient.invalidateQueries({ queryKey: ['test-results', id] })
    },
  })

  if (isLoading) return <LoadingPage />
  if (!test) return <div className="p-6 text-gray-500">Nie znaleziono testu.</div>

  const users = usersData?.results || usersData || []
  const resultList = results?.results || results || []

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title={test.title}
        subtitle={`Kategoria: ${test.category} · Próg zaliczenia: ${test.passing_score}%`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => navigate('/testy')}><ArrowLeft size={16} /> Powrót</Btn>
            <Btn onClick={() => setAssignModal(true)}><Users size={16} /> Przypisz pracownikom</Btn>
          </div>
        }
      />

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('questions')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'questions' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Pytania ({test.questions?.length ?? 0})
        </button>
        <button
          onClick={() => setTab('results')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'results' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Wyniki
        </button>
      </div>

      {tab === 'questions' && (
        <div className="space-y-4">
          {(test.questions || []).map((q: any, i: number) => (
            <Card key={q.id} className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-gray-900">{q.text}</p>
              </div>
              <div className="ml-10 space-y-1.5">
                {q.answers?.map((a: any) => (
                  <div key={a.id} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${a.is_correct ? 'bg-green-50 text-green-700' : 'text-gray-600'}`}>
                    <span>{a.is_correct ? '✓' : '○'}</span>
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'results' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pracownik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wynik</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Termin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultList.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">Brak wyników</td></tr>
                ) : (
                  resultList.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.employee_name}</td>
                      <td className="px-4 py-3">
                        <Badge color={a.status === 'completed' ? 'green' : 'yellow'}>
                          {a.status === 'completed' ? 'Wykonany' : 'Oczekuje'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {a.latest_score ? (
                          <span className={`font-semibold ${a.latest_score.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {a.latest_score.score}% {a.latest_score.passed ? '✓' : '✗'}
                          </span>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {a.deadline ? format(new Date(a.deadline), 'dd.MM.yyyy', { locale: pl }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Przypisz test pracownikom">
        <div className="space-y-4">
          <FormField label="Termin wykonania (opcjonalnie)">
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </FormField>
          <FormField label="Wybierz pracowników">
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
              {users.map((u: any) => (
                <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(u.id)}
                    onChange={e => setSelectedEmployees(prev =>
                      e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id)
                    )}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-gray-500">{u.position || u.role_display}</p>
                  </div>
                </label>
              ))}
            </div>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Btn onClick={() => assignMutation.mutate()} disabled={selectedEmployees.length === 0 || assignMutation.isPending}>
              <Users size={16} /> Przypisz ({selectedEmployees.length})
            </Btn>
            <Btn variant="secondary" onClick={() => setAssignModal(false)}>Anuluj</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
