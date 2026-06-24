import api from './client'

export const getTemplates = (activeOnly = false) =>
  api.get('/questionnaire/templates/', { params: activeOnly ? { active_only: 'true' } : {} }).then(r => r.data)

export const getTemplate = (id: number) =>
  api.get(`/questionnaire/templates/${id}/`).then(r => r.data)

export const createTemplate = (data: any) =>
  api.post('/questionnaire/templates/', data).then(r => r.data)

export const updateTemplate = (id: number, data: any) =>
  api.put(`/questionnaire/templates/${id}/`, data).then(r => r.data)

export const deleteTemplate = (id: number) =>
  api.delete(`/questionnaire/templates/${id}/`)

export const getInvitations = () =>
  api.get('/questionnaire/invitations/').then(r => r.data)

export const getDeletedInvitations = () =>
  api.get('/questionnaire/invitations/', { params: { include_deleted: 'true' } }).then(r => r.data)

export const sendInvitation = (data: any) =>
  api.post('/questionnaire/invitations/send/', data).then(r => r.data)

export const cancelInvitation = (id: number) =>
  api.post(`/questionnaire/invitations/${id}/cancel/`).then(r => r.data)

export const deleteInvitation = (id: number) =>
  api.delete(`/questionnaire/invitations/${id}/delete/`)

export const restoreInvitation = (id: number) =>
  api.post(`/questionnaire/invitations/${id}/restore/`).then(r => r.data)

export const getPublicForm = (token: string) =>
  api.get(`/questionnaire/fill/${token}/`).then(r => r.data)

export const submitForm = (token: string, data: any) =>
  api.post(`/questionnaire/submit/${token}/`, { data }).then(r => r.data)

export const getSubmissions = () =>
  api.get('/questionnaire/submissions/').then(r => r.data)

export const getSubmission = (id: number) =>
  api.get(`/questionnaire/submissions/${id}/`).then(r => r.data)

export const generatePDF = (id: number) =>
  api.get(`/questionnaire/submissions/${id}/pdf/`, { responseType: 'blob' })
    .then(r => {
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `kwestionariusz_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    })
