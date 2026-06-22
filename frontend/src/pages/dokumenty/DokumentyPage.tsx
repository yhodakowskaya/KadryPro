import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDocuments, uploadDocument, deleteDocument } from '../../api/documents'
import { PageHeader, Card, Btn, FormField, Input, LoadingPage } from '../../components/ui'
import { Upload, Trash2, Download, FileText, File, Image, Film, Archive } from 'lucide-react'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

const EXT_ICON: Record<string, any> = {
  pdf: FileText, jpg: Image, jpeg: Image, png: Image, gif: Image,
  mp4: Film, mov: Film, avi: Film,
  zip: Archive, rar: Archive, '7z': Archive,
}

function getIcon(ext: string) {
  return EXT_ICON[ext?.toLowerCase()] || File
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DokumentyPage() {
  const { user } = useAuthStore()
  const hrAdmin = isHROrAdmin(user)
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['documents'], queryFn: getDocuments })
  const docs = data?.results || data || []

  const uploadMut = useMutation({
    mutationFn: (fd: FormData) => uploadDocument(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      setTitle(''); setDescription(''); setSelectedFile(null); setShowForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })
  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    const fd = new FormData()
    fd.append('file', selectedFile)
    fd.append('title', title || selectedFile.name)
    fd.append('description', description)
    uploadMut.mutate(fd)
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="p-6">
      <PageHeader
        title="Dokumenty do druku"
        subtitle="Pliki dostępne dla wszystkich pracowników"
        actions={hrAdmin ? (
          <Btn onClick={() => setShowForm(v => !v)}>
            <Upload size={16} /> Dodaj plik
          </Btn>
        ) : undefined}
      />

      {hrAdmin && showForm && (
        <Card className="p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Dodaj dokument</h3>
          <form onSubmit={handleUpload} className="grid grid-cols-2 gap-4">
            <FormField label="Tytuł">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Opcjonalnie — domyślnie nazwa pliku" />
            </FormField>
            <FormField label="Plik" required>
              <input
                ref={fileInputRef}
                type="file"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </FormField>
            <div className="col-span-2">
              <FormField label="Opis (opcjonalnie)">
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </FormField>
            </div>
            <div className="col-span-2 flex gap-3">
              <Btn type="submit" disabled={!selectedFile || uploadMut.isPending}>
                <Upload size={15} /> {uploadMut.isPending ? 'Wgrywanie...' : 'Wgraj plik'}
              </Btn>
              <Btn variant="secondary" type="button" onClick={() => setShowForm(false)}>Anuluj</Btn>
            </div>
          </form>
        </Card>
      )}

      {docs.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <FileText size={36} className="mx-auto mb-3 opacity-40" />
          <p>Brak dokumentów do druku.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((doc: any) => {
            const Icon = getIcon(doc.file_extension)
            return (
              <Card key={doc.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {doc.file_extension?.toUpperCase() || 'PLIK'} · {formatBytes(doc.file_size)} · Dodany {doc.created_at ? format(new Date(doc.created_at), 'dd.MM.yyyy', { locale: pl }) : '—'} przez {doc.uploaded_by_name}
                    </p>
                    {doc.description && <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                        <Btn size="sm" variant="secondary"><Download size={14} /> Pobierz</Btn>
                      </a>
                    )}
                    {hrAdmin && (
                      <Btn size="sm" variant="ghost" onClick={() => { if (confirm(`Usunąć "${doc.title}"?`)) deleteMut.mutate(doc.id) }}>
                        <Trash2 size={14} className="text-red-400" />
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
