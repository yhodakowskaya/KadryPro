import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, isHROrAdmin, isManagerOrAbove } from '../stores/authStore'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getPendingApprovals } from '../api/hr'
import { getMyAssignments } from '../api/tests'
import { changeOwnPassword } from '../api/auth'
import {
  LayoutDashboard, FileText, ClipboardList, Users,
  Calendar, GitBranch, Building2, LogOut, Bell,
  Briefcase, Shield, Printer, BookOpen, Tag, CalendarDays,
  Newspaper, ChevronLeft, ChevronRight, Key, Eye, EyeOff
} from 'lucide-react'
import { useState } from 'react'

interface NavItem { to: string; icon: React.ReactNode; label: string; badge?: number; end?: boolean }
interface NavGroup { label?: string; items: NavItem[] }

const item = (to: string, icon: React.ReactNode, label: string, badge?: number, end?: boolean): NavItem =>
  ({ to, icon, label, badge, end })

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [pwdModal, setPwdModal] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdOk, setPwdOk] = useState(false)

  const changePwdMut = useMutation({
    mutationFn: () => changeOwnPassword(oldPwd, newPwd),
    onSuccess: () => { setPwdOk(true); setOldPwd(''); setNewPwd('') },
    onError: (err: any) => setPwdError(err.response?.data?.detail || 'Błąd zmiany hasła.'),
  })

  const openPwdModal = () => { setPwdModal(true); setPwdError(''); setPwdOk(false); setOldPwd(''); setNewPwd('') }

  const hrAdmin = isHROrAdmin(user)
  const managerAbove = isManagerOrAbove(user)
  const isAdmin = user?.role === 'admin'

  const { data: myTestsData } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: getMyAssignments,
    enabled: !!user,
  })
  const { data: pendingApprovalsData } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: getPendingApprovals,
    enabled: managerAbove,
  })

  const pendingTestsCount = ((myTestsData?.results || myTestsData || []) as any[])
    .filter((a: any) => a.status === 'pending').length
  const pendingApprovalsCount: number =
    pendingApprovalsData?.results?.length ?? (pendingApprovalsData as any[])?.length ?? 0

  const groups: NavGroup[] = [
    {
      items: [
        item('/', <LayoutDashboard size={16} />, 'Pulpit', undefined, true),
        item('/aktualnosci', <Newspaper size={16} />, 'Aktualności'),
      ],
    },
    ...(hrAdmin ? [{
      label: 'Kadry',
      items: [
        item('/pracownicy', <Users size={16} />, 'Pracownicy'),
        item('/kwestionariusze', <FileText size={16} />, 'Kwestionariusze'),
        item('/testy', <ClipboardList size={16} />, 'Testy'),
      ],
    }] : []),
    {
      label: 'Moje',
      items: [
        item('/moje-testy', <ClipboardList size={16} />, 'Moje testy', pendingTestsCount),
        item('/urlopy', <Calendar size={16} />, 'Urlopy'),
        ...(managerAbove ? [item('/urlopy/do-zatwierdzenia', <Bell size={16} />, 'Do zatwierdzenia', pendingApprovalsCount)] : []),
      ],
    },
    ...(hrAdmin ? [{
      label: 'Urlopy',
      items: [
        item('/urlopy/rodzaje', <Tag size={16} />, 'Rodzaje urlopów'),
        item('/urlopy/kalendarze', <CalendarDays size={16} />, 'Kalendarze'),
      ],
    }] : []),
    {
      label: 'Firma',
      items: [
        item('/struktura', <GitBranch size={16} />, 'Struktura firmy'),
        ...(hrAdmin ? [item('/dzialy', <Building2 size={16} />, 'Działy')] : []),
        ...(hrAdmin ? [item('/stanowiska', <Briefcase size={16} />, 'Stanowiska')] : []),
        ...(isAdmin ? [item('/role', <Shield size={16} />, 'Role')] : []),
      ],
    },
    {
      label: 'Zasoby',
      items: [
        item('/dokumenty', <Printer size={16} />, 'Dokumenty'),
        item('/wiedza', <BookOpen size={16} />, 'Baza wiedzy'),
      ],
    },
  ]

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#f1f5f9' }}>
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col h-full transition-all duration-200 ease-in-out"
        style={{
          width: collapsed ? 64 : 228,
          background: 'linear-gradient(180deg, #003d0f 0%, #005218 60%, #005F1a 100%)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.18)',
        }}
      >
        {/* Logo row */}
        <div className="flex items-center px-3 py-4 flex-shrink-0" style={{ minHeight: 60 }}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <img src="/logo-icon.svg" alt="KadryPro" className="w-5 h-5" style={{ filter: 'brightness(0) invert(1)' }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-bold text-white text-sm tracking-wide">Kadry</span>
                    <span className="font-bold text-sm tracking-wide" style={{ color: '#f97316' }}>Pro</span>
                  </div>
                  <p className="text-[10px] leading-none" style={{ color: 'rgba(255,255,255,0.45)' }}>System HR</p>
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <ChevronLeft size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 mx-auto flex items-center justify-center rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)' }}
              title="Rozwiń menu"
            >
              <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2" style={{ scrollbarWidth: 'none' }}>
          {groups.map((group, gi) => {
            const visibleItems = group.items
            if (visibleItems.length === 0) return null
            return (
              <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
                {!collapsed && group.label && (
                  <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {group.label}
                  </p>
                )}
                {collapsed && group.label && gi > 0 && (
                  <div className="my-2 mx-2 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                )}
                {visibleItems.map(navItem => (
                  <NavLink
                    key={navItem.to}
                    to={navItem.to}
                    end={navItem.end}
                    title={collapsed ? navItem.label : undefined}
                    className="group relative flex items-center rounded-lg mb-0.5 transition-all duration-150 outline-none"
                    style={({ isActive }) => ({
                      padding: collapsed ? '8px 0' : '7px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: collapsed ? 0 : 10,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.62)',
                    })}
                    onMouseOver={e => {
                      const el = e.currentTarget
                      if (!el.getAttribute('aria-current')) el.style.backgroundColor = 'rgba(255,255,255,0.07)'
                    }}
                    onMouseOut={e => {
                      const el = e.currentTarget
                      if (!el.getAttribute('aria-current')) el.style.backgroundColor = 'transparent'
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                            style={{ height: '60%', background: '#f97316' }} />
                        )}
                        <span className="relative flex-shrink-0" style={{ fontSize: 16 }}>
                          {navItem.icon}
                          {collapsed && (navItem.badge ?? 0) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-[13px] font-medium truncate leading-none">
                              {navItem.label}
                            </span>
                            {(navItem.badge ?? 0) > 0 && (
                              <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ml-auto"
                                style={{ background: '#ef4444', color: '#fff', minWidth: 18, textAlign: 'center' }}>
                                {(navItem.badge ?? 0) > 99 ? '99+' : navItem.badge}
                              </span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="flex-shrink-0 mx-2 mb-2 rounded-lg p-2 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[11px] truncate leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {user?.role_display}
                </p>
              </div>
              <button
                onClick={openPwdModal}
                title="Zmień hasło"
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <Key size={14} />
              </button>
              <button
                onClick={handleLogout}
                title="Wyloguj"
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseOver={e => (e.currentTarget.style.color = '#fca5a5')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Wyloguj"
              className="w-full flex items-center justify-center py-1 rounded-md transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseOver={e => (e.currentTarget.style.color = '#fca5a5')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Change password modal */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Key size={18} className="text-green-700" /> Zmień hasło
            </h2>
            {pwdOk ? (
              <div className="text-center py-4">
                <p className="text-green-700 font-medium">Hasło zostało zmienione!</p>
                <button onClick={() => setPwdModal(false)} className="mt-4 text-sm text-gray-500 hover:text-gray-700">Zamknij</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aktualne hasło</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={oldPwd}
                      onChange={e => setOldPwd(e.target.value)}
                      className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                      placeholder="Wpisz aktualne hasło"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nowe hasło</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                    placeholder="Min. 6 znaków"
                  />
                </div>
                {pwdError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwdError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setPwdError(''); changePwdMut.mutate() }}
                    disabled={!oldPwd || newPwd.length < 6 || changePwdMut.isPending}
                    className="flex-1 bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-800"
                  >
                    {changePwdMut.isPending ? 'Zapisywanie...' : 'Zmień hasło'}
                  </button>
                  <button onClick={() => setPwdModal(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Anuluj
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
