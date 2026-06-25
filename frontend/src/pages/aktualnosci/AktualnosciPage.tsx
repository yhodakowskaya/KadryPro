import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNewsPosts, createNewsPost, updateNewsPost, deleteNewsPost } from '../../api/news'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'
import { PageHeader, Card, Btn, ErrorMessage } from '../../components/ui'
import { Plus, Pencil, Trash2, X, ImageIcon, Send, Link2 } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

function PostCard({ post, isHR, onEdit, onDelete }: {
  post: any; isHR: boolean
  onEdit: (post: any) => void
  onDelete: (id: number) => void
}) {
  const initials = post.author_name
    ? post.author_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    : '?'

  const copyLink = () => {
    const url = `${window.location.origin}/aktualnosci#post-${post.id}`
    navigator.clipboard.writeText(url).then(() => alert('Link skopiowany!')).catch(() => {})
  }

  return (
    <div id={`post-${post.id}`}>
    <Card className="p-6">
      {post.image_url && (
        <div className="mb-4 -mx-6 -mt-6 rounded-t-xl overflow-hidden">
          <img src={post.image_url} alt="" className="w-full max-h-72 object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{post.title}</h2>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={copyLink} title="Kopiuj link do posta" className="p-1.5 text-gray-400 hover:text-green-700 rounded">
            <Link2 size={15} />
          </button>
          {isHR && (
            <>
              <button onClick={() => onEdit(post)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                <Pencil size={15} />
              </button>
              <button onClick={() => onDelete(post.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{post.author_name || 'Nieznany'}</p>
          <p className="text-xs text-gray-400">
            {format(new Date(post.created_at), 'd MMMM yyyy, HH:mm', { locale: pl })}
          </p>
        </div>
        {!post.is_published && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Szkic</span>
        )}
      </div>
    </Card>
    </div>
  )
}

function PostForm({ initial, onSave, onCancel, isPending, error }: {
  initial?: any; onSave: (fd: FormData) => void; onCancel: () => void
  isPending: boolean; error: string
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [isPublished, setIsPublished] = useState(initial?.is_published !== false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(initial?.image_url || '')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('title', title)
    fd.append('content', content)
    fd.append('is_published', String(isPublished))
    if (imageFile) fd.append('image', imageFile)
    onSave(fd)
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-gray-900 mb-4">{initial ? 'Edytuj post' : 'Nowy post'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tytuł *</label>
          <input
            required value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Treść *</label>
          <textarea
            required rows={5} value={content} onChange={e => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-y"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Zdjęcie (opcjonalnie)</label>
          {previewUrl && (
            <div className="relative mb-2 w-full max-h-48 rounded-lg overflow-hidden border border-gray-200">
              <img src={previewUrl} alt="" className="w-full object-cover max-h-48" />
              <button type="button" onClick={() => { setImageFile(null); setPreviewUrl('') }}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-gray-500 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
            <ImageIcon size={15} /> {previewUrl ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)}
            className="w-4 h-4 text-green-700" />
          Opublikowany (widoczny dla wszystkich)
        </label>
        {error && <ErrorMessage message={error} />}
        <div className="flex gap-3 pt-1">
          <Btn type="submit" disabled={isPending}>
            <Send size={15} /> {isPending ? 'Zapisywanie...' : (initial ? 'Zapisz zmiany' : 'Opublikuj')}
          </Btn>
          <Btn type="button" variant="secondary" onClick={onCancel}>Anuluj</Btn>
        </div>
      </form>
    </Card>
  )
}

export default function AktualnosciPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const hrAdmin = isHROrAdmin(user)
  const [showForm, setShowForm] = useState(false)
  const [editPost, setEditPost] = useState<any>(null)
  const [formError, setFormError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: getNewsPosts,
  })

  const createMutation = useMutation({
    mutationFn: createNewsPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      setShowForm(false)
      setFormError('')
    },
    onError: () => setFormError('Błąd podczas publikowania.'),
  })

  const updateMutation = useMutation({
    mutationFn: (fd: FormData) => updateNewsPost(editPost.id, fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      setEditPost(null)
      setFormError('')
    },
    onError: () => setFormError('Błąd podczas zapisywania.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNewsPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news'] }),
  })

  const posts = data?.results || data || []

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="Aktualności"
        subtitle="Informacje i ogłoszenia dla pracowników"
        actions={
          hrAdmin && !showForm && !editPost ? (
            <Btn onClick={() => setShowForm(true)}><Plus size={16} /> Nowy post</Btn>
          ) : undefined
        }
      />

      <div className="space-y-5">
        {showForm && (
          <PostForm
            onSave={fd => { setFormError(''); createMutation.mutate(fd) }}
            onCancel={() => { setShowForm(false); setFormError('') }}
            isPending={createMutation.isPending}
            error={formError}
          />
        )}

        {editPost && (
          <PostForm
            initial={editPost}
            onSave={fd => { setFormError(''); updateMutation.mutate(fd) }}
            onCancel={() => { setEditPost(null); setFormError('') }}
            isPending={updateMutation.isPending}
            error={formError}
          />
        )}

        {isLoading && (
          <div className="text-center py-12 text-gray-400 text-sm">Ładowanie...</div>
        )}

        {!isLoading && posts.length === 0 && !showForm && (
          <Card className="p-12 text-center text-gray-400">
            <p className="mb-2">Brak aktualności.</p>
            {hrAdmin && (
              <Btn onClick={() => setShowForm(true)}><Plus size={16} /> Dodaj pierwszy post</Btn>
            )}
          </Card>
        )}

        {posts.map((post: any) => (
          editPost?.id === post.id ? null : (
            <PostCard
              key={post.id}
              post={post}
              isHR={hrAdmin}
              onEdit={p => { setEditPost(p); setShowForm(false) }}
              onDelete={id => { if (confirm('Usunąć post?')) deleteMutation.mutate(id) }}
            />
          )
        ))}
      </div>
    </div>
  )
}
