import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, deleteTest } from '../../api/tests'
import { Link } from 'react-router-dom'
import { PageHeader, Card, Btn, LoadingPage, Badge } from '../../components/ui'
import { Plus, Pencil, Trash2, Copy } from 'lucide-react'

const categoryColor: Record<string, string> = {
  BHP: 'orange', RODO: 'purple', custom: 'blue'
}

export default function SzablonyTestowPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['test-templates'],
    queryFn: getTemplates,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-templates'] }),
  })

  const templates = data?.results || data || []
  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6">
      <PageHeader
        title="Szablony testów"
        subtitle="Szablony wielokrotnego użytku dla testów BHP i RODO"
        actions={
          <Link to="/testy/szablony/nowy">
            <Btn><Plus size={16} /> Nowy szablon</Btn>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <div className="col-span-3">
            <Card className="p-12 text-center text-gray-400">
              <Copy size={40} className="mx-auto mb-3 opacity-40" />
              <p className="mb-4">Brak szablonów. Utwórz pierwszy szablon testu.</p>
              <Link to="/testy/szablony/nowy">
                <Btn><Plus size={16} /> Nowy szablon</Btn>
              </Link>
            </Card>
          </div>
        ) : (
          templates.map((t: any) => (
            <Card key={t.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Badge color={categoryColor[t.category] || 'gray'}>{t.category}</Badge>
                <span className="text-xs text-gray-400">{t.question_count} pytań</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{t.title}</h3>
              {t.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{t.description}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Próg: {t.passing_score}%</span>
                <div className="flex gap-2">
                  <Link to={`/testy/szablony/${t.id}/edytuj`}>
                    <Btn size="sm" variant="secondary"><Pencil size={13} /> Edytuj</Btn>
                  </Link>
                  <Btn
                    size="sm" variant="danger"
                    onClick={() => {
                      if (confirm(`Usunąć szablon "${t.title}"?`)) deleteMutation.mutate(t.id)
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
