import api from './client'

export const getTests = (params?: Record<string, string>) =>
  api.get('/tests/', { params }).then(r => r.data)

export const getTemplates = () =>
  api.get('/tests/', { params: { is_template: 'true' } }).then(r => r.data)

export const getTest = (id: number) =>
  api.get(`/tests/${id}/`).then(r => r.data)

export const createTest = (data: any) =>
  api.post('/tests/', data).then(r => r.data)

export const updateTest = (id: number, data: any) =>
  api.put(`/tests/${id}/`, data).then(r => r.data)

export const deleteTest = (id: number) =>
  api.delete(`/tests/${id}/`)

export const assignTest = (testId: number, data: { employee_ids: number[]; deadline?: string }) =>
  api.post(`/tests/${testId}/assign/`, data).then(r => r.data)

export const getMyAssignments = () =>
  api.get('/tests/my-assignments/').then(r => r.data)

export const submitTest = (assignmentId: number, answers: Record<string, number[]>) =>
  api.post(`/tests/assignments/${assignmentId}/submit/`, { answers }).then(r => r.data)

export const getTestResults = (params?: Record<string, string>) =>
  api.get('/tests/results/', { params }).then(r => r.data)
