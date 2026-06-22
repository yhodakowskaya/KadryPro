import api from './client'

export const getVacationBalance = (employeeId: number, year?: number) =>
  api.get(`/hr/vacation-balance/${employeeId}/`, { params: year ? { year } : {} }).then(r => r.data)

export const updateVacationBalance = (employeeId: number, data: any) =>
  api.put(`/hr/vacation-balance/${employeeId}/`, data).then(r => r.data)

export const getAllBalances = (year?: number) =>
  api.get('/hr/vacation-balances/', { params: year ? { year } : {} }).then(r => r.data)

export const carryOverDays = (data: any) =>
  api.post('/hr/carry-over/', data).then(r => r.data)

export const getVacationRequests = (params?: Record<string, string>) =>
  api.get('/hr/vacation-requests/', { params }).then(r => r.data)

export const createVacationRequest = (data: any) =>
  api.post('/hr/vacation-requests/', data).then(r => r.data)

export const approveVacation = (id: number, notes?: string) =>
  api.put(`/hr/vacation-requests/${id}/approve/`, { notes }).then(r => r.data)

export const rejectVacation = (id: number, notes?: string) =>
  api.put(`/hr/vacation-requests/${id}/reject/`, { notes }).then(r => r.data)

export const cancelVacation = (id: number) =>
  api.put(`/hr/vacation-requests/${id}/cancel/`).then(r => r.data)

export const getPendingApprovals = () =>
  api.get('/hr/pending-approvals/').then(r => r.data)

// Vacation types
export const getVacationTypes = (activeOnly = false) =>
  api.get('/hr/vacation-types/', { params: activeOnly ? { active_only: 'true' } : {} }).then(r => r.data)

export const createVacationType = (data: any) =>
  api.post('/hr/vacation-types/', data).then(r => r.data)

export const updateVacationType = (id: number, data: any) =>
  api.put(`/hr/vacation-types/${id}/`, data).then(r => r.data)

export const deleteVacationType = (id: number) =>
  api.delete(`/hr/vacation-types/${id}/`)

// Vacation type allocations
export const getVacationTypeAllocations = (params?: Record<string, string>) =>
  api.get('/hr/vacation-type-allocations/', { params }).then(r => r.data)

export const createVacationTypeAllocation = (data: any) =>
  api.post('/hr/vacation-type-allocations/', data).then(r => r.data)

export const updateVacationTypeAllocation = (id: number, data: any) =>
  api.put(`/hr/vacation-type-allocations/${id}/`, data).then(r => r.data)

export const deleteVacationTypeAllocation = (id: number) =>
  api.delete(`/hr/vacation-type-allocations/${id}/`)

export const getMyVacationTypeAllocations = (year?: number) =>
  api.get('/hr/my-vacation-type-allocations/', { params: year ? { year } : {} }).then(r => r.data)

// Work Calendars
export const getCalendars = (params?: Record<string, string>) =>
  api.get('/hr/calendars/', { params }).then(r => r.data)

export const createCalendar = (data: { name: string; year: number; is_active: boolean }) =>
  api.post('/hr/calendars/', data).then(r => r.data)

export const updateCalendar = (id: number, data: Partial<{ name: string; year: number; is_active: boolean }>) =>
  api.patch(`/hr/calendars/${id}/`, data).then(r => r.data)

export const deleteCalendar = (id: number) =>
  api.delete(`/hr/calendars/${id}/`)

export const addRecurringHoliday = (calendarId: number, data: { name: string; month: number; day: number }) =>
  api.post(`/hr/calendars/${calendarId}/recurring-holidays/`, data).then(r => r.data)

export const deleteRecurringHoliday = (id: number) =>
  api.delete(`/hr/recurring-holidays/${id}/`)

export const addSingleHoliday = (calendarId: number, data: { name: string; date: string }) =>
  api.post(`/hr/calendars/${calendarId}/single-holidays/`, data).then(r => r.data)

export const deleteSingleHoliday = (id: number) =>
  api.delete(`/hr/single-holidays/${id}/`)

export const assignCalendarEmployees = (calendarId: number, employeeIds: number[]) =>
  api.post(`/hr/calendars/${calendarId}/assign/`, { employee_ids: employeeIds }).then(r => r.data)

export const deleteCalendarAssignment = (assignmentId: number) =>
  api.delete(`/hr/calendar-assignments/${assignmentId}/`)

export const getEmployeeCalendarHolidays = (params: { employee?: number; year?: number }) =>
  api.get('/hr/employee-calendar-holidays/', { params }).then(r => r.data)

export const bulkCreateVacationTypeAllocations = (data: {
  employee_ids: number[]
  vacation_type: number
  year: number
  allocated_days: number
}) => api.post('/hr/vacation-type-allocations/bulk/', data).then(r => r.data)

export const archiveVacationRequests = (year: number, month?: number) =>
  api.post('/hr/vacation-requests/archive-year/', { year, ...(month ? { month } : {}) }).then(r => r.data)

export const adjustVacationBalance = (employeeId: number, data: {
  year: number; field: 'vacation' | 'remote'; days: number; action: 'add' | 'subtract'
}) => api.post(`/hr/vacation-balance/${employeeId}/adjust/`, data).then(r => r.data)
