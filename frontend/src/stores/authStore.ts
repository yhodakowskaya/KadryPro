import { create } from 'zustand'

export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'hr' | 'manager' | 'employee'
  role_display: string
  department: number | null
  department_name: string | null
  manager: number | null
  manager_name: string | null
  position: string
  phone: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User, access: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  setAuth: (user, access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },
}))

export const isHROrAdmin = (user: User | null) =>
  user?.role === 'hr' || user?.role === 'admin'

export const isManagerOrAbove = (user: User | null) =>
  user?.role === 'hr' || user?.role === 'admin' || user?.role === 'manager'
