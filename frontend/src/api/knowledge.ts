import api from './client'

export const getFolders = (parent?: string | null) =>
  api.get('/knowledge/folders/', { params: { parent: parent ?? 'null' } }).then(r => r.data)

export const getAllFolders = () =>
  api.get('/knowledge/folders/', { params: { all: 'true' } }).then(r => r.data)

export const getFolder = (id: number) =>
  api.get(`/knowledge/folders/${id}/`).then(r => r.data)

export const createFolder = (data: any) =>
  api.post('/knowledge/folders/', data).then(r => r.data)

export const updateFolder = (id: number, data: any) =>
  api.put(`/knowledge/folders/${id}/`, data).then(r => r.data)

export const deleteFolder = (id: number) =>
  api.delete(`/knowledge/folders/${id}/`)

export const getItems = (folderId: number) =>
  api.get('/knowledge/items/', { params: { folder: folderId } }).then(r => r.data)

export const createItem = (formData: FormData | any, isFile: boolean) =>
  api.post('/knowledge/items/', isFile ? formData : formData, {
    headers: isFile ? { 'Content-Type': 'multipart/form-data' } : {}
  }).then(r => r.data)

export const updateItem = (id: number, formData: FormData | any, isFile: boolean) =>
  api.patch(`/knowledge/items/${id}/`, isFile ? formData : formData, {
    headers: isFile ? { 'Content-Type': 'multipart/form-data' } : {}
  }).then(r => r.data)

export const deleteItem = (id: number) =>
  api.delete(`/knowledge/items/${id}/`)
