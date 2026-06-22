import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvitations, getDeletedInvitations, cancelInvitation, deleteInvitation, restoreInvitation } from '../../api/questionnaire'
import { Link } from 'react-router-dom'
import { PageHeader, Card, Btn, LoadingPage, StatusBadge } from '../../components/ui'
import { FileText, Plus, Eye, XCircle, Copy, Settings, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useAuthStore } from '../../stores/authStore'

function getFormUrl(token: string) {
  return `${window.location.origin}/formularz/${token}`
}

export default function KwestionariuszePage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'
  const [showDeleted, setShowDeleted] = useState(false)

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: getInvitations,
  })
  const { data: submissions } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => import('../../api/questionnaire').then(m => m.getSubmissions()),
  })
  const { data: deletedData } = useQuery({
    queryKey: ['invitations-deleted'],
    queryFn: getDeletedInvitations,
    enabled: showDeleted,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['invitations-deleted'] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['invitations-deleted'] })
    },
  })

  const items = invitations?.results || invitations || []
  const subs = submissions?.results || submissions || []
  const deletedItems = deletedData?.results || deletedData || []
  const submissionMap = Object.fromEntries(subs.map((s: any) => [s.invitation, s.id]))

  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6">
      <PageHeader
        title="Kwestionariusze osobowe"
        subtitle="Zarządzaj zaproszeniami i wypełnionymi formularzami"
        actions={
          <div className="flex gap-2">
            <Link to="/kwestionariusze/szablony">
              <Btn variant="secondary"><Settings size={16} /> Szablony</Btn>
            </Link>
            <Link to="/kwestionariusze/wyslij">
              <Btn><Plus size={16} /> Wyślij kwestionariusz</Btn>
            </Link>
          </div>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odbiorca</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wysłany przez</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data wysłania</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wygasa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Brak wysłanych kwestionariuszy</p>
                  </td>
                </tr>
              ) : (
                items.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{inv.recipient_name}</p>
                      <p className="text-xs text-gray-500">{inv.recipient_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.template_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.sent_by_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {inv.created_at ? format(new Date(inv.created_at), 'dd.MM.yyyy', { locale: pl }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {inv.expires_at ? format(new Date(inv.expires_at), 'dd.MM.yyyy', { locale: pl }) : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      {inv.token && inv.status === 'pending' && (
                        <button
                          onClick={() => navigator.clipboard.writeText(getFormUrl(inv.token))}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          title={getFormUrl(inv.token)}
                        >
                          <Copy size={12} /> Kopiuj link
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {inv.status === 'completed' && submissionMap[inv.id] && (
                          <Link to={`/kwestionariusze/${submissionMap[inv.id]}`}>
                            <Btn size="sm" variant="secondary"><Eye size={14} /> Podgląd</Btn>
                          </Link>
                        )}
                        {inv.status === 'pending' && (
                          <Btn
                            size="sm" variant="ghost"
                            onClick={() => {
                              if (confirm(`Anulować zaproszenie dla ${inv.recipient_name}?`))
                                cancelMutation.mutate(inv.id)
                            }}
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle size={14} /> Anuluj
                          </Btn>
                        )}
                        {isAdmin && (
                          <Btn
                            size="sm" variant="ghost"
                            onClick={() => {
                              if (confirm(`Usunąć zaproszenie dla ${inv.recipient_name}?`))
                                deleteMutation.mutate(inv.id)
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={14} className="text-red-400" />
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

      {/* Deleted section (admin/hr only) */}
      {isAdmin && (
        <div className="mt-6">
          <button
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
            onClick={() => setShowDeleted(v => !v)}
          >
            {showDeleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Usunięte zaproszenia {deletedItems.length > 0 && `(${deletedItems.length})`}
          </button>

          {showDeleted && (
            <Card>
              {deletedItems.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Brak usuniętych zaproszeń</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {deletedItems.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{inv.recipient_name}</p>
                        <p className="text-xs text-gray-400">{inv.recipient_email} · {inv.template_name}</p>
                      </div>
                      <Btn
                        size="sm" variant="secondary"
                        onClick={() => restoreMutation.mutate(inv.id)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw size={14} /> Przywróć
                      </Btn>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
