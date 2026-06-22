import api from './client'

export const getDocuments = () =>
  api.get('/documents/').then(r => r.data)

export const uploadDocument = (formData: FormData) =>
  api.post('/documents/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)

export const deleteDocument = (id: number) =>
  api.delete(`/documents/${id}/`)
