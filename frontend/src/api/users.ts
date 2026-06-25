import api from './client'

export const getUsers = (params?: Record<string, string>) =>
  api.get('/users/', { params }).then(r => r.data)

export const getUser = (id: number) =>
  api.get(`/users/${id}/`).then(r => r.data)

export const createUser = (data: any) =>
  api.post('/users/', data).then(r => r.data)

export const updateUser = (id: number, data: any) =>
  api.put(`/users/${id}/`, data).then(r => r.data)

export const patchUser = (id: number, data: any) =>
  api.patch(`/users/${id}/`, data).then(r => r.data)

export const deleteUser = (id: number) =>
  api.delete(`/users/${id}/`)

export const restoreUser = (id: number) =>
  api.post(`/users/${id}/restore/`).then(r => r.data)

export const setPassword = (id: number, password: string) =>
  api.post(`/users/${id}/set-password/`, { password }).then(r => r.data)

export const getDepartments = () =>
  api.get('/departments/').then(r => r.data)

export const getDepartmentTree = () =>
  api.get('/departments/tree/').then(r => r.data)

export const createDepartment = (data: any) =>
  api.post('/departments/', data).then(r => r.data)

export const updateDepartment = (id: number, data: any) =>
  api.put(`/departments/${id}/`, data).then(r => r.data)

export const deleteDepartment = (id: number) =>
  api.delete(`/departments/${id}/`)

export const importDepartments = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/departments/import/', fd).then(r => r.data)
}

export const getOrgChart = () =>
  api.get('/org-chart/').then(r => r.data)

// Positions
export const getPositions = (activeOnly = false) =>
  api.get('/positions/', { params: activeOnly ? { active_only: 'true' } : {} }).then(r => r.data)

export const createPosition = (data: any) =>
  api.post('/positions/', data).then(r => r.data)

export const updatePosition = (id: number, data: any) =>
  api.put(`/positions/${id}/`, data).then(r => r.data)

export const deletePosition = (id: number) =>
  api.delete(`/positions/${id}/`)

export const importPositions = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/positions/import/', fd).then(r => r.data)
}

// Custom Roles
export const getCustomRoles = () =>
  api.get('/custom-roles/').then(r => r.data)

export const createCustomRole = (data: any) =>
  api.post('/custom-roles/', data).then(r => r.data)

export const updateCustomRole = (id: number, data: any) =>
  api.put(`/custom-roles/${id}/`, data).then(r => r.data)

export const deleteCustomRole = (id: number) =>
  api.delete(`/custom-roles/${id}/`)

// Companies
export const getCompanies = () =>
  api.get('/companies/').then(r => r.data)

export const createCompany = (data: any) =>
  api.post('/companies/', data).then(r => r.data)

export const updateCompany = (id: number, data: any) =>
  api.put(`/companies/${id}/`, data).then(r => r.data)

export const deleteCompany = (id: number) =>
  api.delete(`/companies/${id}/`)

// Regions
export const getRegions = () =>
  api.get('/regions/').then(r => r.data)

export const createRegion = (data: any) =>
  api.post('/regions/', data).then(r => r.data)

export const updateRegion = (id: number, data: any) =>
  api.put(`/regions/${id}/`, data).then(r => r.data)

export const deleteRegion = (id: number) =>
  api.delete(`/regions/${id}/`)

// Contracts
export const getContracts = (userId: number) =>
  api.get(`/users/${userId}/contracts/`).then(r => r.data)

export const createContract = (userId: number, data: any) =>
  api.post(`/users/${userId}/contracts/`, data).then(r => r.data)

export const updateContract = (userId: number, contractId: number, data: any) =>
  api.put(`/users/${userId}/contracts/${contractId}/`, data).then(r => r.data)

export const deleteContract = (userId: number, contractId: number) =>
  api.delete(`/users/${userId}/contracts/${contractId}/`)

// Employee Excel Import
export const parseImportFile = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/users/import/parse/', fd).then(r => r.data)
}

export const confirmImport = (file: File, mapping: Record<string, string>, defaultPassword: string, defaultRole: string) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('mapping', JSON.stringify(mapping))
  fd.append('default_password', defaultPassword)
  fd.append('default_role', defaultRole)
  return api.post('/users/import/confirm/', fd).then(r => r.data)
}

// Notifications
export const triggerNotifications = () =>
  api.post('/trigger-notifications/').then(r => r.data)
