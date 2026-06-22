import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTests, deleteTest } from '../../api/tests'
import { Link } from 'react-router-dom'
import { PageHeader, Card, Btn, LoadingPage, Badge } from '../../components/ui'
import { Plus, Pencil, Trash2, ClipboardList, Copy } from 'lucide-react'

const categoryColor: Record<string, string> = {
  BHP: 'orange', RODO: 'purple', custom: 'blue'
}

export default function TestyPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['tests'], queryFn: () => getTests() })

  const deleteMutation = useMutation({
    mutationFn: deleteTest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests'] }),
  })

  const tests = data?.results || data || []
  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6">
      <PageHeader
        title="Testy BHP i RODO"
        subtitle="Twórz i zarządzaj testami dla pracowników"
        actions={
          <div className="flex gap-2">
            <Link to="/testy/szablony">
              <Btn variant="secondary"><Copy size={16} /> Szablony</Btn>
            </Link>
            <Link to="/testy/nowy">
              <Btn><Plus size={16} /> Nowy test</Btn>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.length === 0 ? (
          <div className="col-span-3">
            <Card className="p-12 text-center text-gray-400">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
              <p>Brak testów. Utwórz pierwszy test.</p>
            </Card>
          </div>
        ) : (
          tests.map((test: any) => (
            <Card key={test.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Badge color={categoryColor[test.category] || 'gray'}>{test.category}</Badge>
                <span className="text-xs text-gray-400">{test.question_count} pytań</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{test.title}</h3>
              {test.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{test.description}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Próg: {test.passing_score}%</span>
                <div className="flex gap-2">
                  <Link to={`/testy/${test.id}`}>
                    <Btn size="sm" variant="secondary"><Pencil size={13} /> Edytuj</Btn>
                  </Link>
                  <Btn
                    size="sm" variant="danger"
                    onClick={() => {
                      if (confirm('Usunąć test?')) deleteMutation.mutate(test.id)
                    }}
                  >
                    <Trash2 size={13} />
                  </Btn>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
