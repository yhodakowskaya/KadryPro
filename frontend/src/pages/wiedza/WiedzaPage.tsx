import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllFolders, createFolder, updateFolder, deleteFolder, getItems, createItem, updateItem, deleteItem } from '../../api/knowledge'
import { getDepartments, getUsers } from '../../api/users'
import { PageHeader, Btn, FormField, Input, Select, LoadingPage, ErrorMessage } from '../../components/ui'
import {
  Folder, FolderOpen, File, Link2, Plus, Trash2, Home,
  Upload, ExternalLink, Lock, Settings, X, Users, Building2,
  Edit, Play, FileText, Maximize2, ChevronRight, ChevronDown, Image,
} from 'lucide-react'
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

type FolderForm = { name: string; access: string; allowed_departments: number[]; allowed_users: number[] }
const emptyFolderForm = (): FolderForm => ({ name: '', access: 'all', allowed_departments: [], allowed_users: [] })

// ── helpers ──────────────────────────────────────────────────────────────────

function buildTree(folders: any[]): Map<number | null, any[]> {
  const map = new Map<number | null, any[]>()
  for (const f of folders) {
    const p = f.parent ?? null
    if (!map.has(p)) map.set(p, [])
    map.get(p)!.push(f)
  }
  return map
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
  } catch { /* empty */ }
  return null
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']

function getPreviewType(item: any): 'youtube' | 'pdf' | 'image' | 'none' {
  if (item.item_type === 'link' && item.url && getYouTubeId(item.url)) return 'youtube'
  const ext = (item.file_extension || '').toLowerCase()
  const urlExt = (item.url || '').split('?')[0].split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf' || urlExt === 'pdf') return 'pdf'
  if (IMAGE_EXTS.includes(ext) || IMAGE_EXTS.includes(urlExt)) return 'image'
  return 'none'
}

// ── PreviewModal ──────────────────────────────────────────────────────────────

function PreviewModal({ item, onClose }: { item: any; onClose: () => void }) {
  const type = getPreviewType(item)
  const youtubeId = type === 'youtube' ? getYouTubeId(item.url) : null
  const mediaUrl = item.file_url || item.url

  const iconMap = { youtube: <Play size={16} className="text-red-400 flex-shrink-0" />, pdf: <FileText size={16} className="text-slate-300 flex-shrink-0" />, image: <Image size={16} className="text-blue-300 flex-shrink-0" />, none: null }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 text-white flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {iconMap[type]}
          <span className="text-sm font-medium truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
            className="text-slate-300 hover:text-white text-xs flex items-center gap-1">
            <Maximize2 size={14} /> Otwórz w nowej karcie
          </a>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded"><X size={20} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {type === 'youtube' && youtubeId && (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="w-full max-w-5xl" style={{ aspectRatio: '16/9' }}>
              <iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </div>
          </div>
        )}
        {type === 'pdf' && mediaUrl && (
          <iframe src={mediaUrl} className="w-full h-full" title={item.title} />
        )}
        {type === 'image' && mediaUrl && (
          <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
            <img src={mediaUrl} alt={item.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 120px)' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── FolderNode (recursive tree node) ─────────────────────────────────────────

function FolderNode({
  folder, tree, depth, selectedId, onSelect, onEdit, onDelete, hrAdmin,
}: {
  folder: any
  tree: Map<number | null, any[]>
  depth: number
  selectedId: number | null
  onSelect: (f: any) => void
  onEdit: (f: any) => void
  onDelete: (f: any) => void
  hrAdmin: boolean
}) {
  const children = tree.get(folder.id) || []
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(true)
  const isSelected = selectedId === folder.id

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg pr-1 cursor-pointer select-none
          ${isSelected ? 'bg-emerald-100 text-emerald-900' : 'hover:bg-slate-100 text-slate-700'}`}
        style={{ paddingLeft: `${depth * 14 + 6}px`, paddingTop: '5px', paddingBottom: '5px' }}
        onClick={() => onSelect(folder)}
      >
        {/* expand chevron */}
        <button
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors
            ${hasChildren ? 'text-slate-400 hover:text-slate-700' : 'opacity-0 pointer-events-none'}`}
          onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* folder icon */}
        {isSelected
          ? <FolderOpen size={15} className="text-emerald-600 flex-shrink-0" />
          : <Folder size={15} className="text-amber-400 flex-shrink-0" />}

        {/* name */}
        <span className="text-sm flex-1 truncate ml-1">{folder.name}</span>

        {/* lock */}
        {folder.access !== 'all' && (
          <Lock size={10} className={`flex-shrink-0 ${folder.access === 'hr_admin' ? 'text-red-400' : 'text-orange-400'}`} />
        )}

        {/* count */}
        {folder.items_count > 0 && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">{folder.items_count}</span>
        )}

        {/* hr actions */}
        {hrAdmin && (
          <span className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 ml-1" onClick={e => e.stopPropagation()}>
            <button className="p-0.5 rounded hover:bg-emerald-200 text-slate-500 hover:text-emerald-700"
              onClick={() => onEdit(folder)} title="Edytuj">
              <Settings size={11} />
            </button>
            <button className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
              onClick={() => onDelete(folder)} title="Usuń">
              <Trash2 size={11} />
            </button>
          </span>
        )}
      </div>

      {open && hasChildren && (
        <div>
          {children.map(child => (
            <FolderNode key={child.id} folder={child} tree={tree} depth={depth + 1}
              selectedId={selectedId} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} hrAdmin={hrAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WiedzaPage() {
  const { user } = useAuthStore()
  const hrAdmin = isHROrAdmin(user)
  const qc = useQueryClient()

  const [selectedFolder, setSelectedFolder] = useState<any>(null)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState<any>(null)
  const [folderForm, setFolderForm] = useState<FolderForm>(emptyFolderForm())
  const [folderError, setFolderError] = useState('')

  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState({ title: '', item_type: 'link', url: '', access: 'all', description: '' })
  const [itemFile, setItemFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [itemError, setItemError] = useState('')

  const [editingItem, setEditingItem] = useState<any>(null)
  const [editItemForm, setEditItemForm] = useState({ title: '', url: '', access: 'all', description: '' })
  const [editItemFile, setEditItemFile] = useState<File | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [editItemError, setEditItemError] = useState('')

  const [previewItem, setPreviewItem] = useState<any>(null)

  // ── queries ──
  const { data: foldersRaw, isLoading: loadingFolders } = useQuery({
    queryKey: ['knowledge-folders-all'],
    queryFn: getAllFolders,
  })

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['knowledge-items', selectedFolder?.id],
    queryFn: () => getItems(selectedFolder!.id),
    enabled: !!selectedFolder,
  })

  const { data: departmentsData } = useQuery({ queryKey: ['departments'], queryFn: getDepartments, enabled: hrAdmin })
  const { data: usersData } = useQuery({ queryKey: ['users-list'], queryFn: () => getUsers({ is_active: 'true' }), enabled: hrAdmin })

  const allFolders: any[] = foldersRaw?.results || foldersRaw || []
  const items: any[] = itemsData?.results || itemsData || []
  const departments: any[] = departmentsData?.results || departmentsData || []
  const users: any[] = usersData?.results || usersData || []

  const tree = buildTree(allFolders)
  const rootFolders = tree.get(null) || []

  // ── mutations ──
  const invalidateFolders = () => qc.invalidateQueries({ queryKey: ['knowledge-folders-all'] })

  const createFolderMut = useMutation({
    mutationFn: createFolder,
    onSuccess: () => { invalidateFolders(); setShowFolderForm(false); setFolderForm(emptyFolderForm()); setFolderError('') },
    onError: (err: any) => setFolderError(err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd zapisu.'),
  })

  const updateFolderMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateFolder(id, data),
    onSuccess: () => { invalidateFolders(); setEditingFolder(null); setShowFolderForm(false); setFolderForm(emptyFolderForm()); setFolderError('') },
    onError: (err: any) => setFolderError(err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd zapisu.'),
  })

  const deleteFolderMut = useMutation({
    mutationFn: deleteFolder,
    onSuccess: (_, id) => {
      invalidateFolders()
      if (selectedFolder?.id === id) setSelectedFolder(null)
    },
  })

  const createItemMut = useMutation({
    mutationFn: ({ fd, isFile }: { fd: any; isFile: boolean }) => createItem(fd, isFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-items', selectedFolder?.id] })
      invalidateFolders()
      setShowItemForm(false)
      setItemForm({ title: '', item_type: 'link', url: '', access: 'all', description: '' })
      setItemFile(null)
      setItemError('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: any) => setItemError(err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd dodawania zasobu.'),
  })

  const updateItemMut = useMutation({
    mutationFn: ({ id, fd, isFile }: { id: number; fd: any; isFile: boolean }) => updateItem(id, fd, isFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-items', selectedFolder?.id] })
      setEditingItem(null); setEditItemFile(null); setEditItemError('')
    },
    onError: (err: any) => setEditItemError(err?.response?.data ? Object.values(err.response.data).flat().join(', ') : 'Błąd zapisu.'),
  })

  const deleteItemMut = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-items', selectedFolder?.id] })
      invalidateFolders()
    },
  })

  // ── folder form helpers ──
  const toggleMultiSelect = (arr: number[], id: number): number[] =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]

  const openCreateFolder = () => {
    setEditingFolder(null)
    setFolderForm(emptyFolderForm())
    setShowFolderForm(true)
    setFolderError('')
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
    setFolderError('')
  }

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...folderForm, parent: editingFolder ? editingFolder.parent : selectedFolder?.id ?? null }
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
      fd.append('folder', String(selectedFolder!.id))
      fd.append('title', itemForm.title || itemFile.name)
      fd.append('item_type', 'file')
      fd.append('access', itemForm.access)
      fd.append('description', itemForm.description)
      fd.append('file', itemFile)
      createItemMut.mutate({ fd, isFile: true })
    } else {
      createItemMut.mutate({ fd: { ...itemForm, folder: selectedFolder!.id }, isFile: false })
    }
  }

  if (loadingFolders) return <LoadingPage />

  const folderIsPending = createFolderMut.isPending || updateFolderMut.isPending

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <PageHeader
          title="Baza wiedzy"
          subtitle="Zasoby, dokumenty i linki dla pracowników"
          actions={hrAdmin ? (
            <div className="flex gap-2">
              {selectedFolder && (
                <Btn variant="secondary" onClick={() => { setShowItemForm(v => !v); setShowFolderForm(false) }}>
                  <Plus size={16} /> Dodaj zasób
                </Btn>
              )}
              <Btn onClick={() => { openCreateFolder(); setShowItemForm(false) }}>
                <Plus size={16} /> Nowy folder
              </Btn>
            </div>
          ) : undefined}
        />
      </div>

      {/* Folder form */}
      {hrAdmin && showFolderForm && (
        <div className="px-6 mb-4">
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">
                {editingFolder ? `Edytuj: ${editingFolder.name}` : `Nowy folder${selectedFolder ? ` w „${selectedFolder.name}"` : ''}`}
              </h3>
              <button onClick={() => setShowFolderForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Building2 size={14} /> Działy <span className="text-slate-400 font-normal">(puste = wszystkie)</span>
                </label>
                <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg min-h-[42px] bg-slate-50">
                  {departments.map((d: any) => (
                    <button key={d.id} type="button"
                      onClick={() => setFolderForm(f => ({ ...f, allowed_departments: toggleMultiSelect(f.allowed_departments, d.id) }))}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        folderForm.allowed_departments.includes(d.id) ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
                      }`}>{d.name}</button>
                  ))}
                  {departments.length === 0 && <span className="text-xs text-slate-400">Brak działów</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Users size={14} /> Osoby <span className="text-slate-400 font-normal">(puste = wszyscy)</span>
                </label>
                <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg min-h-[42px] bg-slate-50 max-h-32 overflow-y-auto">
                  {users.map((u: any) => (
                    <button key={u.id} type="button"
                      onClick={() => setFolderForm(f => ({ ...f, allowed_users: toggleMultiSelect(f.allowed_users, u.id) }))}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        folderForm.allowed_users.includes(u.id) ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
                      }`}>{u.first_name} {u.last_name}</button>
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
          </div>
        </div>
      )}

      {/* Item form */}
      {hrAdmin && showItemForm && selectedFolder && (
        <div className="px-6 mb-4">
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Dodaj zasób do „{selectedFolder.name}"</h3>
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
                  <input ref={fileInputRef} type="file" onChange={e => setItemFile(e.target.files?.[0] || null)} required
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
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
          </div>
        </div>
      )}

      {/* Main: tree + content */}
      <div className="flex flex-1 gap-0 px-6 pb-6 min-h-0">

        {/* Tree sidebar */}
        <div className="w-64 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-3 overflow-y-auto mr-4 self-start max-h-[calc(100vh-220px)]">
          {/* Root (home) node */}
          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm mb-1 transition-colors
              ${!selectedFolder ? 'bg-emerald-100 text-emerald-900 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Home size={14} className="flex-shrink-0" /> Baza wiedzy
          </button>

          <div className="border-t border-slate-100 mt-1 pt-1">
            {rootFolders.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-2">Brak folderów</p>
            )}
            {rootFolders.map(folder => (
              <FolderNode key={folder.id} folder={folder} tree={tree} depth={0}
                selectedId={selectedFolder?.id ?? null}
                onSelect={f => { setSelectedFolder(f); setShowItemForm(false) }}
                onEdit={openEditFolder}
                onDelete={f => { if (confirm(`Usunąć folder „${f.name}" i całą zawartość?`)) deleteFolderMut.mutate(f.id) }}
                hrAdmin={hrAdmin} />
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {!selectedFolder ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 h-full flex flex-col items-center justify-center">
              <FolderOpen size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Wybierz folder z drzewa po lewej stronie.</p>
              {hrAdmin && (
                <p className="text-xs mt-1">Lub utwórz nowy folder klikając <strong>+ Nowy folder</strong>.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Subfolders */}
              {(() => {
                const subs = tree.get(selectedFolder.id) || []
                return subs.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                    {subs.map((sub: any) => (
                      <button key={sub.id}
                        onClick={() => setSelectedFolder(sub)}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all text-left">
                        <FolderOpen size={22} className="text-amber-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{sub.name}</p>
                          <p className="text-xs text-slate-400">{sub.items_count} zasobów</p>
                        </div>
                        {sub.access !== 'all' && <Lock size={11} className={sub.access === 'hr_admin' ? 'text-red-400' : 'text-orange-400'} />}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}

              {/* Items */}
              {loadingItems ? (
                <div className="text-center text-slate-400 py-8 text-sm">Ładowanie...</div>
              ) : items.length === 0 && (tree.get(selectedFolder.id) || []).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
                  <File size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Folder jest pusty.</p>
                </div>
              ) : items.map((item: any) => (
                <div key={item.id}>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
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
                        {(() => {
                          const pt = getPreviewType(item)
                          if (pt === 'youtube') return (
                            <Btn size="sm" variant="secondary" onClick={() => setPreviewItem(item)}>
                              <Play size={13} className="text-red-500" /> Odtwórz
                            </Btn>
                          )
                          if (pt === 'pdf') return (
                            <Btn size="sm" variant="secondary" onClick={() => setPreviewItem(item)}>
                              <FileText size={13} className="text-indigo-500" /> Podgląd PDF
                            </Btn>
                          )
                          if (pt === 'image') return (
                            <Btn size="sm" variant="secondary" onClick={() => setPreviewItem(item)}>
                              <Image size={13} className="text-blue-500" /> Podgląd
                            </Btn>
                          )
                          if (item.item_type === 'link' && item.url) return (
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <Btn size="sm" variant="secondary"><ExternalLink size={13} /> Otwórz</Btn>
                            </a>
                          )
                          if (item.item_type === 'file' && item.file_url) return (
                            <a href={item.file_url} target="_blank" rel="noopener noreferrer" download>
                              <Btn size="sm" variant="secondary"><Upload size={13} className="rotate-180" /> Pobierz</Btn>
                            </a>
                          )
                          return null
                        })()}
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
                            <Btn size="sm" variant="ghost" onClick={() => { if (confirm(`Usunąć „${item.title}"?`)) deleteItemMut.mutate(item.id) }}>
                              <Trash2 size={13} className="text-red-400" />
                            </Btn>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline edit */}
                  {editingItem?.id === item.id && (
                    <div className="border border-emerald-200 rounded-xl p-4 mt-1 bg-emerald-50/40">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Tytuł">
                          <Input value={editItemForm.title} onChange={e => setEditItemForm(f => ({ ...f, title: e.target.value }))} placeholder="Tytuł zasobu" />
                        </FormField>
                        <FormField label="Dostęp">
                          <Select value={editItemForm.access} onChange={e => setEditItemForm(f => ({ ...f, access: e.target.value }))}>
                            {ACCESS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </Select>
                        </FormField>
                        {item.item_type === 'link' ? (
                          <FormField label="URL">
                            <Input type="url" value={editItemForm.url} onChange={e => setEditItemForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
                          </FormField>
                        ) : (
                          <FormField label="Zastąp plik (opcjonalnie)">
                            <input ref={editFileInputRef} type="file" onChange={e => setEditItemFile(e.target.files?.[0] || null)}
                              className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                          </FormField>
                        )}
                        <FormField label="Opis">
                          <Input value={editItemForm.description} onChange={e => setEditItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcjonalnie" />
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
        </div>
      </div>

      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  )
}
