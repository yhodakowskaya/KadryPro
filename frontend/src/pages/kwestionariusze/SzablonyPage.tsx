import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, deleteTemplate } from '../../api/questionnaire'
import { Link } from 'react-router-dom'
import { PageHeader, Card, Btn, LoadingPage, Badge } from '../../components/ui'
import { Plus, Edit, Trash2, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

const TYPE_COLORS: Record<string, string> = {
  pracownik: 'blue',
  zleceniobiorca_cudzoziemiec: 'orange',
  custom: 'purple',
}

export default function SzablonyPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: () => getTemplates() })

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  const items = data?.results || data || []

  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6">
      <PageHeader
        title="Szablony kwestionariuszy"
        subtitle="Zarządzaj szablonami formularzy"
        actions={
          <Link to="/kwestionariusze/szablony/nowy">
            <Btn><Plus size={16} /> Nowy szablon</Btn>
          </Link>
        }
      />

      {items.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <FileText size={36} className="mx-auto mb-3 opacity-40" />
          <p>Brak szablonów kwestionariuszy.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((t: any) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <Badge color={TYPE_COLORS[t.type] || 'gray'}>{t.type_display}</Badge>
                    {!t.is_active && <Badge color="red">Nieaktywny</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">
                    Pól: {(t.fields_schema || []).filter((f: any) => f.type !== 'section').length} ·
                    Sekcji: {(t.fields_schema || []).filter((f: any) => f.type === 'section').length} ·
                    Dodany: {t.created_at ? format(new Date(t.created_at), 'dd.MM.yyyy', { locale: pl }) : '—'}
                    {t.created_by_name && ` przez ${t.created_by_name}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/kwestionariusze/szablony/${t.id}/edytuj`}>
                    <Btn size="sm" variant="secondary"><Edit size={14} /> Edytuj</Btn>
                  </Link>
                  <Btn size="sm" variant="ghost" onClick={() => { if (confirm(`Usunąć szablon "${t.name}"?`)) deleteMutation.mutate(t.id) }}>
                    <Trash2 size={14} className="text-red-400" />
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
