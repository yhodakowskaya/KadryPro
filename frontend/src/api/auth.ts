import api from './client'

export const login = (username: string, password: string) =>
  api.post('/auth/login/', { username, password }).then(r => r.data)

export const getMe = () =>
  api.get('/auth/me/').then(r => r.data)
