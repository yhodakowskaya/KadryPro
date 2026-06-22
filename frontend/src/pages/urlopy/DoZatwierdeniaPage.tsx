import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPendingApprovals, approveVacation, rejectVacation, cancelVacation } from '../../api/hr'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'
import { PageHeader, Card, Btn, LoadingPage } from '../../components/ui'
import { CheckCircle, XCircle, Ban, Calendar, Laptop } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

export default function DoZatwierdeniaPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const hrAdmin = isHROrAdmin(user)

  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: getPendingApprovals,
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveVacation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-approvals'] }),
  })
  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectVacation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-approvals'] }),
  })
  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelVacation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-approvals'] }),
  })

  if (isLoading) return <LoadingPage />

  const requests = data?.results || data || []

  return (
    <div className="p-6">
      <PageHeader
        title="Wnioski do zatwierdzenia"
        subtitle={`${requests.length} oczekujących wniosków`}
      />

      {requests.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400 opacity-60" />
          <p>Brak wniosków do zatwierdzenia.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <Card key={req.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {req.employee_name?.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{req.employee_name}</p>
                        {req.request_type === 'remote'
                          ? <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"><Laptop size={11} /> Praca zdalna</span>
                          : <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><Calendar size={11} /> Urlop</span>
                        }
                      </div>
                      <p className="text-xs text-gray-500">
                        Złożony: {format(new Date(req.created_at), 'dd MMMM yyyy', { locale: pl })}
                        {req.created_by_name && req.created_by_name !== req.employee_name && ` przez ${req.created_by_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="ml-12 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Okres</p>
                      <p className="font-medium">
                        {format(new Date(req.start_date), 'dd.MM.yyyy', { locale: pl })} – {format(new Date(req.end_date), 'dd.MM.yyyy', { locale: pl })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Liczba dni</p>
                      <p className="font-medium">{req.days_count} dni roboczych</p>
                    </div>
                    {req.reason && (
                      <div>
                        <p className="text-xs text-gray-400">Powód</p>
                        <p className="text-gray-700">{req.reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Btn
                    size="sm" variant="success"
                    onClick={() => approveMutation.mutate(req.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle size={14} /> Zatwierdź
                  </Btn>
                  <Btn
                    size="sm" variant="danger"
                    onClick={() => rejectMutation.mutate(req.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle size={14} /> Odrzuć
                  </Btn>
                  {hrAdmin && (
                    <Btn
                      size="sm" variant="ghost"
                      onClick={() => { if (confirm('Anulować wniosek?')) cancelMutation.mutate(req.id) }}
                    >
                      <Ban size={14} /> Anuluj
                    </Btn>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
