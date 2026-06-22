import { useQuery } from '@tanstack/react-query'
import { getMyAssignments } from '../../api/tests'
import { Link } from 'react-router-dom'
import { PageHeader, Card, Btn, LoadingPage, Badge } from '../../components/ui'
import { ClipboardList, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

const categoryColor: Record<string, string> = { BHP: 'orange', RODO: 'purple', custom: 'blue' }

export default function MojeTestyPage() {
  const { data, isLoading } = useQuery({ queryKey: ['my-assignments'], queryFn: getMyAssignments })
  const assignments = data?.results || data || []

  if (isLoading) return <LoadingPage />

  const pending = assignments.filter((a: any) => a.status === 'pending')
  const completed = assignments.filter((a: any) => a.status === 'completed')

  return (
    <div className="p-6">
      <PageHeader title="Moje testy" subtitle="Przypisane do Ciebie testy" />

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock size={16} className="text-orange-500" /> Do wykonania ({pending.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((a: any) => (
              <Card key={a.id} className="p-5 border-l-4 border-orange-400">
                <div className="flex items-start justify-between mb-2">
                  <Badge color={categoryColor[a.test_category] || 'gray'}>{a.test_category}</Badge>
                  {a.deadline && (
                    <span className="text-xs text-gray-500">
                      Termin: {format(new Date(a.deadline), 'dd.MM.yyyy', { locale: pl })}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-4">{a.test_title}</h3>
                <Link to={`/moje-testy/${a.id}`}>
                  <Btn className="w-full justify-center">Rozwiąż test</Btn>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" /> Wykonane ({completed.length})
          </h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategoria</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wynik</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zaliczony</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {completed.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.test_title}</td>
                      <td className="px-4 py-3"><Badge color={categoryColor[a.test_category] || 'gray'}>{a.test_category}</Badge></td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {a.latest_score ? `${a.latest_score.score}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {a.latest_score ? (
                          <Badge color={a.latest_score.passed ? 'green' : 'red'}>
                            {a.latest_score.passed ? 'Zaliczony' : 'Niezaliczony'}
                          </Badge>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {assignments.length === 0 && (
        <Card className="p-12 text-center text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p>Nie masz przypisanych testów.</p>
        </Card>
      )}
    </div>
  )
}
