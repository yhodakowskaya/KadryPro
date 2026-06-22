import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore, isHROrAdmin, isManagerOrAbove } from '../../stores/authStore'
import { getVacationBalance, getMyVacationTypeAllocations } from '../../api/hr'
import { getPendingApprovals } from '../../api/hr'
import { getMyAssignments } from '../../api/tests'
import { getInvitations } from '../../api/questionnaire'
import { triggerNotifications } from '../../api/users'
import { Card, LoadingPage } from '../../components/ui'
import { Calendar, Laptop, ClipboardList, FileText, Clock, CheckCircle, Bell, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

function StatCard({ icon, label, value, sub, color, to }: any) {
  const content = (
    <Card className={`p-5 hover:shadow-md transition-shadow ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-')} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </Card>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const hrAdmin = isHROrAdmin(user)
  const managerAbove = isManagerOrAbove(user)
  const year = new Date().getFullYear()
  const [notifResult, setNotifResult] = useState<string | null>(null)

  const notifMutation = useMutation({
    mutationFn: triggerNotifications,
    onSuccess: (data) => setNotifResult(data.output || 'Powiadomienia zostały sprawdzone.'),
    onError: () => setNotifResult('Błąd podczas sprawdzania powiadomień.'),
  })

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['vacation-balance', user?.id, year],
    queryFn: () => getVacationBalance(user!.id, year),
    enabled: !!user,
  })

  const { data: pendingApprovals } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: getPendingApprovals,
    enabled: managerAbove,
  })

  const { data: myTests } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: getMyAssignments,
  })

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: getInvitations,
    enabled: hrAdmin,
  })

  const { data: typeAllocsData } = useQuery({
    queryKey: ['my-vacation-type-allocations', year],
    queryFn: () => getMyVacationTypeAllocations(year),
    enabled: !!user,
  })

  const pendingTests = myTests?.results?.filter((a: any) => a.status === 'pending') ||
    myTests?.filter((a: any) => a.status === 'pending') || []
  const pendingInvitations = invitations?.results?.filter((i: any) => i.status === 'pending') ||
    invitations?.filter((i: any) => i.status === 'pending') || []
  const typeAllocs: any[] = typeAllocsData?.results || typeAllocsData || []

  if (loadingBalance) return <LoadingPage />

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Dzień dobry, {user?.first_name}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.role_display} · {user?.position || 'Brak stanowiska'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Calendar size={22} className="text-blue-600" />}
          label="Dostępne dni urlopu"
          value={balance?.available_days ?? '—'}
          sub={`Z ${balance?.allocated_days ?? 0} przyznanych + ${balance?.carried_over ?? 0} przeniesionych`}
          color="text-blue-600"
          to="/urlopy"
        />
        <StatCard
          icon={<Laptop size={22} className="text-purple-600" />}
          label="Dostępne dni zdalnych"
          value={balance?.available_remote_days ?? '—'}
          sub={`Rok ${year}`}
          color="text-purple-600"
          to="/urlopy"
        />
        <StatCard
          icon={<ClipboardList size={22} className="text-orange-600" />}
          label="Testy do wykonania"
          value={pendingTests.length}
          sub="Przypisane testy"
          color="text-orange-600"
          to="/moje-testy"
        />
        {managerAbove && (
          <StatCard
            icon={<Clock size={22} className="text-yellow-600" />}
            label="Wnioski do zatwierdzenia"
            value={pendingApprovals?.results?.length ?? pendingApprovals?.length ?? 0}
            sub="Oczekujące na akceptację"
            color="text-yellow-600"
            to="/urlopy/do-zatwierdzenia"
          />
        )}
        {hrAdmin && (
          <StatCard
            icon={<FileText size={22} className="text-green-600" />}
            label="Oczekujące kwestionariusze"
            value={pendingInvitations.length}
            sub="Niewypełnione formularze"
            color="text-green-600"
            to="/kwestionariusze"
          />
        )}
      </div>

      {typeAllocs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Tag size={15} /> Dodatkowe rodzaje urlopów {year}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {typeAllocs.map((alloc: any) => {
              const pct = alloc.allocated_days > 0 ? Math.min(100, Math.round((alloc.used_days / alloc.allocated_days) * 100)) : 0
              return (
                <Card key={alloc.id} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {alloc.vacation_type_color && (
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: alloc.vacation_type_color }} />
                    )}
                    <span className="text-sm font-semibold text-gray-800 truncate">{alloc.vacation_type_name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Dostępne: <strong className="text-gray-800">{alloc.available_days} dni</strong></span>
                    <span>{alloc.used_days} / {alloc.allocated_days}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: alloc.vacation_type_color || '#005F17' }}
                    />
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Mój bilans urlopowy {year}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Przyznane dni</span>
              <span className="font-medium">{balance?.allocated_days ?? 0} dni</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Przeniesione z poprzedniego roku</span>
              <span className="font-medium">{balance?.carried_over ?? 0} dni</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Wykorzystane</span>
              <span className="font-medium text-red-600">{balance?.used_days ?? 0} dni</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-sm font-semibold">
              <span>Dostępne</span>
              <span className="text-blue-700 text-lg">{balance?.available_days ?? 0} dni</span>
            </div>
            {(balance?.available_days ?? 0) > 0 && (
              <Link to="/urlopy/wniosek">
                <button className="w-full mt-2 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                  Złóż wniosek urlopowy
                </button>
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-orange-600" />
            Moje testy
          </h2>
          {pendingTests.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm">Wszystkie testy wykonane!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTests.slice(0, 4).map((assignment: any) => (
                <Link key={assignment.id} to={`/moje-testy/${assignment.id}`}>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{assignment.test_title}</p>
                      <p className="text-xs text-gray-500">{assignment.test_category}</p>
                    </div>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                      Do wykonania
                    </span>
                  </div>
                </Link>
              ))}
              {pendingTests.length > 4 && (
                <Link to="/moje-testy" className="text-sm text-blue-600 hover:underline block text-center">
                  +{pendingTests.length - 4} więcej
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      {hrAdmin && (
        <div className="mt-6">
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell size={18} className="text-red-500" />
              Powiadomienia HR
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Sprawdź wygasające umowy i badania lekarskie (do 30 dni) i wyślij powiadomienia email do kadry.
            </p>
            <button
              onClick={() => { setNotifResult(null); notifMutation.mutate() }}
              disabled={notifMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Bell size={16} />
              {notifMutation.isPending ? 'Sprawdzanie...' : 'Sprawdź i wyślij powiadomienia'}
            </button>
            {notifResult && (
              <pre className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {notifResult}
              </pre>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
