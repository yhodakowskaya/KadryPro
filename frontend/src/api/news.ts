import api from './client'

export const getNewsPosts = () =>
  api.get('/news/').then(r => r.data)

export const createNewsPost = (data: FormData) =>
  api.post('/news/', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)

export const updateNewsPost = (id: number, data: FormData) =>
  api.patch(`/news/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)

export const deleteNewsPost = (id: number) =>
  api.delete(`/news/${id}/`)

export const toggleLike = (postId: number) =>
  api.post(`/news/${postId}/like/`).then(r => r.data)

export const getComments = (postId: number) =>
  api.get(`/news/${postId}/comments/`).then(r => r.data)

export const addComment = (postId: number, text: string) =>
  api.post(`/news/${postId}/comments/`, { text }).then(r => r.data)

export const deleteComment = (postId: number, commentId: number) =>
  api.delete(`/news/${postId}/comments/${commentId}/`)
