import api from './client'

export const getNewsPosts = () =>
  api.get('/news/').then(r => r.data)

export const createNewsPost = (data: FormData) =>
  api.post('/news/', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)

export const updateNewsPost = (id: number, data: FormData) =>
  api.patch(`/news/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)

export const deleteNewsPost = (id: number) =>
  api.delete(`/news/${id}/`)
