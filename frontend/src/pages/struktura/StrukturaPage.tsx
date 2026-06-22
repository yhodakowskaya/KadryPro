import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrgChart, getDepartments } from '../../api/users'
import { PageHeader, Card, LoadingPage, Badge } from '../../components/ui'
import { Users, Building2, Search } from 'lucide-react'

const roleColor: Record<string, string> = { admin: 'purple', hr: 'blue', manager: 'orange', employee: 'gray' }

const VACATION_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-200 text-blue-800 border-blue-300',
  green: 'bg-green-200 text-green-800 border-green-300',
  red: 'bg-red-200 text-red-800 border-red-300',
  yellow: 'bg-yellow-200 text-yellow-800 border-yellow-300',
  purple: 'bg-purple-200 text-purple-800 border-purple-300',
  orange: 'bg-orange-200 text-orange-800 border-orange-300',
  pink: 'bg-pink-200 text-pink-800 border-pink-300',
  teal: 'bg-teal-200 text-teal-800 border-teal-300',
  amber: 'bg-amber-200 text-amber-800 border-amber-300',
}

const vacAvatar: Record<string, string> = {
  blue: 'bg-blue-200 text-blue-800',
  green: 'bg-green-200 text-green-800',
  red: 'bg-red-200 text-red-800',
  yellow: 'bg-yellow-200 text-yellow-800',
  purple: 'bg-purple-200 text-purple-800',
  orange: 'bg-orange-200 text-orange-800',
  pink: 'bg-pink-200 text-pink-800',
  teal: 'bg-teal-200 text-teal-800',
  amber: 'bg-amber-200 text-amber-800',
}

function OrgNode({ user, allUsers, depth = 0, searchQuery }: { user: any; allUsers: any[]; depth?: number; searchQuery: string }) {
  const reports = allUsers.filter((u: any) => u.manager_id === user.id)
  const vacColor = user.vacation_type_color || 'amber'
  const colorCls = user.on_vacation ? VACATION_COLOR_MAP[vacColor] || VACATION_COLOR_MAP.amber : ''
  const avatarCls = user.on_vacation ? vacAvatar[vacColor] || vacAvatar.amber : 'bg-gray-200 text-gray-700'

  const matchesSearch = !searchQuery || `${user.first_name} ${user.last_name} ${user.position || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  const hasMatchingReport = allUsers.some(u => u.manager_id === user.id && `${u.first_name} ${u.last_name} ${u.position || ''}`.toLowerCase().includes(searchQuery.toLowerCase()))

  if (searchQuery && !matchesSearch && !hasMatchingReport) return null

  return (
    <div className={depth > 0 ? 'ml-8 mt-2' : ''}>
      <div className={`flex items-center gap-3 p-3 rounded-lg bg-white border ${user.on_vacation ? `border ${colorCls}` : depth === 0 ? 'border-blue-200 shadow-sm' : 'border-gray-200'} ${searchQuery && matchesSearch ? 'ring-2 ring-blue-300' : ''}`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${avatarCls}`}>
          {user.first_name?.[0]}{user.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{user.first_name} {user.last_name}</p>
          <p className="text-xs text-gray-500 truncate">{user.position || '—'}</p>
          {user.on_vacation && (
            <p className="text-xs font-medium mt-0.5" style={{ color: 'inherit' }}>
              {user.vacation_type_name}: {user.vacation_start} – {user.vacation_end}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge color={roleColor[user.role] || 'gray'}>{user.role_display || user.role}</Badge>
          {user.on_vacation && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorCls}`}>
              {user.vacation_type_name || 'Urlop'}
            </span>
          )}
        </div>
      </div>
      {reports.length > 0 && (
        <div className="border-l-2 border-gray-200 ml-4 pl-0 mt-1">
          {reports.map((r: any) => (
            <OrgNode key={r.id} user={r} allUsers={allUsers} depth={depth + 1} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function StrukturaPage() {
  const [search, setSearch] = useState('')
  const { data: orgData, isLoading: loadingOrg } = useQuery({ queryKey: ['org-chart'], queryFn: getOrgChart })
  const { data: deptData, isLoading: loadingDept } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })

  const users = orgData || []
  const departments = deptData?.results || deptData || []
  const topLevel = users.filter((u: any) => !u.manager_id)
  const onVacation = users.filter((u: any) => u.on_vacation)

  const legendItems = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>()
    onVacation.forEach((u: any) => {
      if (u.vacation_type_name && !seen.has(u.vacation_type_name)) {
        seen.set(u.vacation_type_name, { name: u.vacation_type_name, color: u.vacation_type_color || 'amber' })
      }
    })
    return Array.from(seen.values())
  }, [onVacation])

  if (loadingOrg || loadingDept) return <LoadingPage />

  return (
    <div className="p-6">
      <PageHeader title="Struktura firmy" subtitle="Hierarchia organizacyjna" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-blue-600" /> Hierarchia pracowników
              </h2>
              <div className="flex items-center gap-3">
                {onVacation.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                    {onVacation.length} {onVacation.length === 1 ? 'osoba' : 'osób'} na urlopie/zdalnie
                  </span>
                )}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Szukaj pracownika..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 w-52"
                  />
                </div>
              </div>
            </div>

            {topLevel.length === 0 ? (
              <p className="text-gray-400 text-sm">Brak pracowników w strukturze.</p>
            ) : (
              <div className="space-y-3">
                {topLevel.map((u: any) => (
                  <OrgNode key={u.id} user={u} allUsers={users} searchQuery={search} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {legendItems.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">Legenda — nieobecności</h2>
              <div className="space-y-2">
                {legendItems.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${vacAvatar[item.color] || vacAvatar.amber} flex-shrink-0`} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VACATION_COLOR_MAP[item.color] || VACATION_COLOR_MAP.amber}`}>
                      {item.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({onVacation.filter((u: any) => u.vacation_type_name === item.name).length} os.)
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-green-600" /> Działy
            </h2>
            <div className="space-y-2">
              {departments.map((d: any) => {
                const count = users.filter((u: any) => u['department__name'] === d.name).length
                return (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-800">{d.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{count} os.</span>
                  </div>
                )
              })}
              {departments.length === 0 && <p className="text-gray-400 text-sm">Brak działów.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Podsumowanie</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Pracownicy ogółem</span>
                <span className="font-semibold">{users.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kierownicy</span>
                <span className="font-semibold">{users.filter((u: any) => u.role === 'manager').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Działy</span>
                <span className="font-semibold">{departments.length}</span>
              </div>
              {onVacation.length > 0 && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-amber-600">Nieobecni dziś</span>
                  <span className="font-semibold text-amber-700">{onVacation.length}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
