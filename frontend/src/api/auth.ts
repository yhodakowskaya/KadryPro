import api from './client'

export const login = (username: string, password: string) =>
  api.post('/auth/login/', { username, password }).then(r => r.data)

export const getMe = () =>
  api.get('/auth/me/').then(r => r.data)

export const requestPasswordReset = (email: string) =>
  api.post('/auth/password-reset/', { email }).then(r => r.data)

export const confirmPasswordReset = (token: string, password: string) =>
  api.post('/auth/password-reset/confirm/', { token, password }).then(r => r.data)

export const changeOwnPassword = (old_password: string, new_password: string) =>
  api.post('/auth/change-password/', { old_password, new_password }).then(r => r.data)
