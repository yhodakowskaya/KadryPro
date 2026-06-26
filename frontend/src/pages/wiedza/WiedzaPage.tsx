import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFolders, createFolder, updateFolder, deleteFolder, getItems, createItem, updateItem, deleteItem } from '../../api/knowledge'
import { getDepartments, getUsers } from '../../api/users'
import { PageHeader, Card, Btn, FormField, Input, Select, LoadingPage, ErrorMessage } from '../../components/ui'
import { Folder, FolderOpen, File, Link2, Plus, Trash2, ChevronRight, Home, Upload, ExternalLink, Lock, Settings, X, Users, Building2, Edit } from 'lucide-react'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'

const ACCESS_OPTS = [
  { value: 'all', label: 'Wszyscy pracownicy' },
  { value: 'manager_above', label: 'Kierownicy i wyżej' },
  { value: 'hr_admin', label: 'Tylko Kadry/Admin' },
]

const ACCESS_BADGE: Record<string, string> = {
  all: '',
  manager_above: 'bg-orange-50 text-orange-700',
  hr_admin: 'bg-red-50 text-red-700',
}

type FolderForm = {
  name: string
  access: string
  allowed_departments: number[]
  allowed_users: number[]
}

const emptyFolderForm = (): FolderForm => ({ name: '', access: 'all', allowed_departments: [], allowed_users: [] })

export default function WiedzaPage() {
  const { user } = useAuthStore()
  const hrAdmin = isHROrAdmin(user)
  const qc = useQueryClient()

  const [path, setPath] = useState<Array<{ id: number; name: string }>>([])
  const currentFolderId = path.length > 0 ? path[path.length - 1].id : null

  const [showFolderForm, setShowFolderForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState<any>(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [folderForm, setFolderForm] = useState<FolderForm>(emptyFolderForm())
  const [itemForm, setItemForm] = useState({ title: '', item_type: 'link', url: '', access: 'all', description: '' })
  const [itemFile, setItemFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [itemError, setItemError] = useState('')
  const [folderError, setFolderError] = useState('')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editItemForm, setEditItemForm] = useState({ title: '', url: '', access: 'all', description: '' })
  const [editItemFile, setEditItemFile] = useState<File | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [editItemError, setEditItemError] = useState('')

  const { data: foldersData, isLoading: loadingFolders } = useQuery({
    queryKey: ['knowledge-folders', currentFolderId],
    queryFn: () => getFolders(currentFolderId === null ? null : String(currentFolderId)),
  })

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['knowledge-items', currentFolderId],
    queryFn: () => getItems(currentFolderId!),
    enabled: currentFolderId !== null,
  })

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: hrAdmin,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => getUsers({ is_active: 'true' }),
    enabled: hrAdmin,
  })

  const folders = foldersData?.results || foldersData || []
  const items = itemsData?.results || itemsData || []
  const departments: any[] = departmentsData?.results || departmentsData || []
  const users: any[] = usersData?.results || usersData || []

  const createFolderMut = useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-folders'] })
      setShowFolderForm(false)
      setFolderForm(emptyFolderForm())
      setFolderError('')
    },
    onError: (err: any) => setFolderError(
      err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd zapisu folderu.'
    ),
  })

  const updateFolderMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateFolder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-folders'] })
      setEditingFolder(null)
      setFolderForm(emptyFolderForm())
      setFolderError('')
    },
    onError: (err: any) => setFolderError(
      err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd zapisu folderu.'
    ),
  })

  const deleteFolderMut = useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-folders'] }),
  })

  const createItemMut = useMutation({
    mutationFn: ({ fd, isFile }: { fd: any; isFile: boolean }) => createItem(fd, isFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-items'] })
      setShowItemForm(false)
      setItemForm({ title: '', item_type: 'link', url: '', access: 'all', description: '' })
      setItemFile(null)
      setItemError('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: any) => setItemError(
      err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd dodawania zasobu.'
    ),
  })

  const deleteItemMut = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-items'] }),
  })

  const updateItemMut = useMutation({
    mutationFn: ({ id, fd, isFile }: { id: number; fd: any; isFile: boolean }) => updateItem(id, fd, isFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-items'] })
      setEditingItem(null)
      setEditItemFile(null)
      setEditItemError('')
    },
    onError: (err: any) => setEditItemError(
      err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd zapisu.'
    ),
  })

  const openCreateFolder = () => {
    setEditingFolder(null)
    setFolderForm(emptyFolderForm())
    setShowFolderForm(true)
  }

  const openEditFolder = (folder: any) => {
    setEditingFolder(folder)
    setFolderForm({
      name: folder.name,
      access: folder.access,
      allowed_departments: (folder.allowed_departments || []).map((d: any) => typeof d === 'object' ? d.id : d),
      allowed_users: (folder.allowed_users || []).map((u: any) => typeof u === 'object' ? u.id : u),
    })
    setShowFolderForm(true)
  }

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...folderForm, parent: currentFolderId }
    if (editingFolder) {
      updateFolderMut.mutate({ id: editingFolder.id, data: payload })
    } else {
      createFolderMut.mutate(payload)
    }
  }

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (itemForm.item_type === 'file') {
      if (!itemFile) return
      const fd = new FormData()
      fd.append('folder', String(currentFolderId))
      fd.append('title', itemForm.title || itemFile.name)
      fd.append('item_type', 'file')
      fd.append('access', itemForm.access)
      fd.append('description', itemForm.description)
      fd.append('file', itemFile)
      createItemMut.mutate({ fd, isFile: true })
    } else {
      createItemMut.mutate({ fd: { ...itemForm, folder: currentFolderId }, isFile: false })
    }
  }

  const toggleMultiSelect = (arr: number[], id: number): number[] =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]

  const enterFolder = (folder: any) => setPath(p => [...p, { id: folder.id, name: folder.name }])
  const goToIndex = (idx: number) => setPath(p => p.slice(0, idx + 1))
  const goHome = () => setPath([])

  const isLoading = loadingFolders || (currentFolderId !== null && loadingItems)
  if (isLoading && folders.length === 0) return <LoadingPage />

  const folderIsPending = createFolderMut.isPending || updateFolderMut.isPending

  return (
    <div className="p-6">
      <PageHeader
        title="Baza wiedzy"
        subtitle="Zasoby, dokumenty i linki dla pracowników"
        actions={hrAdmin ? (
          <div className="flex gap-2">
            {currentFolderId !== null && (
              <Btn variant="secondary" onClick={() => setShowItemForm(v => !v)}>
                <Plus size={16} /> Dodaj zasób
              </Btn>
            )}
            <Btn onClick={openCreateFolder}>
              <Plus size={16} /> Nowy folder
            </Btn>
          </div>
        ) : undefined}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-sm text-slate-500">
        <button onClick={goHome} className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
          <Home size={14} /> Baza wiedzy
        </button>
        {path.map((p, idx) => (
          <span key={p.id} className="flex items-center gap-1">
            <ChevronRight size={13} className="text-slate-300" />
            {idx === path.length - 1 ? (
              <span className="text-slate-900 font-medium">{p.name}</span>
            ) : (
              <button onClick={() => goToIndex(idx)} className="hover:text-emerald-600">{p.name}</button>
            )}
          </span>
        ))}
      </div>

      {/* Folder create/edit form */}
      {hrAdmin && showFolderForm && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">
              {editingFolder ? `Edytuj folder: ${editingFolder.name}` : 'Nowy folder'}
            </h3>
            <button onClick={() => setShowFolderForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleFolderSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nazwa folderu" required>
                <Input value={folderForm.name} onChange={e => setFolderForm(f => ({ ...f, name: e.target.value }))} required />
              </FormField>
              <FormField label="Dostęp (rola)">
                <Select value={folderForm.access} onChange={e => setFolderForm(f => ({ ...f, access: e.target.value }))}>
                  {ACCESS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormField>
            </div>

            {/* Department access */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Building2 size={14} /> Dostęp dla działów <span className="text-slate-400 font-normal">(puste = wszystkie)</span>
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg min-h-[42px] bg-slate-50">
                {departments.map((d: any) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setFolderForm(f => ({ ...f, allowed_departments: toggleMultiSelect(f.allowed_departments, d.id) }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      folderForm.allowed_departments.includes(d.id)
                        ? 'bg-slate-800 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
                {departments.length === 0 && <span className="text-xs text-slate-400">Brak działów</span>}
              </div>
            </div>

            {/* User access */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Users size={14} /> Dostęp dla osób <span className="text-slate-400 font-normal">(puste = wszyscy)</span>
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg min-h-[42px] bg-slate-50 max-h-32 overflow-y-auto">
                {users.map((u: any) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setFolderForm(f => ({ ...f, allowed_users: toggleMultiSelect(f.allowed_users, u.id) }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      folderForm.allowed_users.includes(u.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {u.first_name} {u.last_name}
                  </button>
                ))}
                {users.length === 0 && <span className="text-xs text-slate-400">Brak pracowników</span>}
              </div>
            </div>

            {folderError && <ErrorMessage message={folderError} />}
            <div className="flex gap-2">
              <Btn type="submit" size="sm" disabled={folderIsPending}>
                <Folder size={14} /> {editingFolder ? 'Zapisz' : 'Utwórz'}
              </Btn>
              <Btn variant="secondary" size="sm" type="button" onClick={() => setShowFolderForm(false)}>Anuluj</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Add item form */}
      {hrAdmin && showItemForm && currentFolderId !== null && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Dodaj zasób</h3>
            <button onClick={() => setShowItemForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <form onSubmit={handleItemSubmit} className="grid grid-cols-2 gap-4">
            <FormField label="Typ">
              <Select value={itemForm.item_type} onChange={e => setItemForm(f => ({ ...f, item_type: e.target.value }))}>
                <option value="link">Link URL</option>
                <option value="file">Plik</option>
              </Select>
            </FormField>
            <FormField label="Dostęp">
              <Select value={itemForm.access} onChange={e => setItemForm(f => ({ ...f, access: e.target.value }))}>
                {ACCESS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Tytuł">
              <Input value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} placeholder="Opcjonalnie" />
            </FormField>
            {itemForm.item_type === 'link' ? (
              <FormField label="URL" required>
                <Input type="url" value={itemForm.url} onChange={e => setItemForm(f => ({ ...f, url: e.target.value }))} required placeholder="https://..." />
              </FormField>
            ) : (
              <FormField label="Plik" required>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={e => setItemFile(e.target.files?.[0] || null)}
                  required
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </FormField>
            )}
            {itemError && <div className="col-span-2"><ErrorMessage message={itemError} /></div>}
            <div className="col-span-2 flex gap-3">
              <Btn type="submit" size="sm" disabled={createItemMut.isPending}>
                {itemForm.item_type === 'file' ? <Upload size={14} /> : <Link2 size={14} />}
                {createItemMut.isPending ? 'Dodaję...' : 'Dodaj'}
              </Btn>
              <Btn variant="secondary" size="sm" type="button" onClick={() => setShowItemForm(false)}>Anuluj</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Folders grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {folders.map((folder: any) => (
          <div key={folder.id} className="group relative">
            <button
              onClick={() => enterFolder(folder)}
              className="w-full p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <FolderOpen size={28} className="text-amber-400" />
                {folder.access !== 'all' && (
                  <Lock size={12} className={folder.access === 'hr_admin' ? 'text-red-400' : 'text-orange-400'} />
                )}
              </div>
              <p className="text-sm font-medium text-slate-900 truncate">{folder.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{folder.children_count} podfolderów · {folder.items_count} zasobów</p>
              {/* Access restrictions display */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {folder.access !== 'all' && (
                  <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${ACCESS_BADGE[folder.access]}`}>
                    {ACCESS_OPTS.find(o => o.value === folder.access)?.label}
                  </span>
                )}
                {folder.allowed_departments_display?.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    <Building2 size={9} /> {folder.allowed_departments_display.length} dział{folder.allowed_departments_display.length > 1 ? 'y' : ''}
                  </span>
                )}
                {folder.allowed_users_display?.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    <Users size={9} /> {folder.allowed_users_display.length} os{folder.allowed_users_display.length === 1 ? 'oba' : 'oby'}
                  </span>
                )}
              </div>
            </button>
            {hrAdmin && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); openEditFolder(folder) }}
                  className="p-1 bg-white rounded text-slate-400 hover:text-emerald-600 shadow-sm"
                  title="Edytuj dostęp"
                >
                  <Settings size={12} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Usunąć folder "${folder.name}" i całą zawartość?`)) deleteFolderMut.mutate(folder.id) }}
                  className="p-1 bg-white rounded text-slate-400 hover:text-red-500 shadow-sm"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Items in current folder */}
      {currentFolderId !== null && (
        <div className="space-y-2">
          {items.length === 0 && folders.length === 0 && (
            <Card className="p-8 text-center text-slate-400">
              <Folder size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Folder jest pusty.</p>
            </Card>
          )}
          {items.map((item: any) => (
            <div key={item.id}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-100">
                    {item.item_type === 'link' ? <Link2 size={16} className="text-emerald-600" /> : <File size={16} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                    {item.item_type === 'link' && item.url && (
                      <p className="text-xs text-slate-400 truncate">{item.url}</p>
                    )}
                    {item.access !== 'all' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${ACCESS_BADGE[item.access]}`}>
                        {ACCESS_OPTS.find(o => o.value === item.access)?.label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {item.item_type === 'link' && item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <Btn size="sm" variant="secondary"><ExternalLink size={13} /> Otwórz</Btn>
                      </a>
                    )}
                    {item.item_type === 'file' && item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" download>
                        <Btn size="sm" variant="secondary"><Upload size={13} className="rotate-180" /> Pobierz</Btn>
                      </a>
                    )}
                    {hrAdmin && (
                      <>
                        <Btn size="sm" variant="secondary" onClick={() => {
                          setEditingItem(item)
                          setEditItemForm({ title: item.title, url: item.url || '', access: item.access, description: item.description || '' })
                          setEditItemFile(null)
                          setEditItemError('')
                        }}>
                          <Edit size={13} /> Edytuj
                        </Btn>
                        <Btn size="sm" variant="ghost" onClick={() => { if (confirm(`Usunąć "${item.title}"?`)) deleteItemMut.mutate(item.id) }}>
                          <Trash2 size={13} className="text-red-400" />
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Inline edit form */}
              {editingItem?.id === item.id && (
                <div className="border border-emerald-200 rounded-lg p-4 mt-1 bg-emerald-50/40">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Tytuł">
                      <Input value={editItemForm.title}
                        onChange={e => setEditItemForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Tytuł zasobu" />
                    </FormField>
                    <FormField label="Dostęp">
                      <Select value={editItemForm.access}
                        onChange={e => setEditItemForm(f => ({ ...f, access: e.target.value }))}>
                        {ACCESS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    </FormField>
                    {item.item_type === 'link' ? (
                      <FormField label="URL">
                        <Input type="url" value={editItemForm.url}
                          onChange={e => setEditItemForm(f => ({ ...f, url: e.target.value }))}
                          placeholder="https://..." />
                      </FormField>
                    ) : (
                      <FormField label="Zastąp plik (opcjonalnie)">
                        <input
                          ref={editFileInputRef}
                          type="file"
                          onChange={e => setEditItemFile(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        />
                      </FormField>
                    )}
                    <FormField label="Opis">
                      <Input value={editItemForm.description}
                        onChange={e => setEditItemForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Opcjonalnie" />
                    </FormField>
                  </div>
                  {editItemError && <div className="mt-2"><ErrorMessage message={editItemError} /></div>}
                  <div className="flex gap-2 mt-3">
                    <Btn size="sm" disabled={updateItemMut.isPending} onClick={() => {
                      if (item.item_type === 'file' && editItemFile) {
                        const fd = new FormData()
                        fd.append('title', editItemForm.title || editItemFile.name)
                        fd.append('access', editItemForm.access)
                        fd.append('description', editItemForm.description)
                        fd.append('file', editItemFile)
                        updateItemMut.mutate({ id: item.id, fd, isFile: true })
                      } else {
                        updateItemMut.mutate({ id: item.id, fd: editItemForm, isFile: false })
                      }
                    }}>
                      {updateItemMut.isPending ? 'Zapisuję...' : 'Zapisz'}
                    </Btn>
                    <Btn size="sm" variant="secondary" onClick={() => setEditingItem(null)}>Anuluj</Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {folders.length === 0 && currentFolderId === null && (
        <Card className="p-12 text-center text-slate-400">
          <FolderOpen size={36} className="mx-auto mb-3 opacity-40" />
          <p>Baza wiedzy jest pusta. {hrAdmin && 'Utwórz pierwszy folder.'}</p>
        </Card>
      )}
    </div>
  )
}
