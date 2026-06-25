import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNewsPosts, createNewsPost, updateNewsPost, deleteNewsPost,
  toggleLike, getComments, addComment, deleteComment,
} from '../../api/news'
import { getDepartments, getUsers } from '../../api/users'
import { useAuthStore, isHROrAdmin } from '../../stores/authStore'
import { PageHeader, Card, Btn, ErrorMessage } from '../../components/ui'
import {
  Plus, Pencil, Trash2, X, ImageIcon, Send, Link2,
  Heart, MessageSquare, ChevronDown, ChevronUp, Paperclip, Bold, Italic, List,
} from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

// --- Simple markdown renderer (no external deps) ---
function renderMd(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const html = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>')
    .replace(/^[-•] (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n/g, '<br>')
  return html
}

// --- Markdown toolbar ---
function MdToolbar({ taRef, value, onChange }: {
  taRef: React.RefObject<HTMLTextAreaElement>
  value: string
  onChange: (v: string) => void
}) {
  const wrap = (pre: string, suf: string, ph: string) => {
    const el = taRef.current; if (!el) return
    const s = el.selectionStart, e = el.selectionEnd
    const sel = value.slice(s, e) || ph
    const next = value.slice(0, s) + pre + sel + suf + value.slice(e)
    onChange(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + pre.length, s + pre.length + sel.length) }, 0)
  }
  const insertPrefix = (prefix: string) => {
    const el = taRef.current; if (!el) return
    const s = el.selectionStart
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    onChange(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length) }, 0)
  }
  const btnCls = 'px-2 py-0.5 text-sm hover:bg-gray-200 rounded transition-colors'
  return (
    <div className="flex gap-0.5 border border-b-0 border-gray-300 rounded-t-lg px-2 py-1 bg-gray-50">
      <button type="button" onClick={() => wrap('**', '**', 'pogrubiony')} className={`${btnCls} font-bold`} title="Pogrubienie"><Bold size={14} /></button>
      <button type="button" onClick={() => wrap('*', '*', 'kursywa')} className={`${btnCls} italic`} title="Kursywa"><Italic size={14} /></button>
      <button type="button" onClick={() => wrap('[tekst](', ')', 'https://')} className={btnCls} title="Link"><Link2 size={14} /></button>
      <div className="w-px bg-gray-300 mx-1" />
      <button type="button" onClick={() => insertPrefix('- ')} className={btnCls} title="Lista"><List size={14} /></button>
    </div>
  )
}

// --- Comments section ---
function CommentsSection({ postId, commentsCount, currentUser }: {
  postId: number; commentsCount: number; currentUser: any
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const qc = useQueryClient()

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getComments(postId),
    enabled: open,
  })

  const addMut = useMutation({
    mutationFn: (t: string) => addComment(postId, t),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', postId] }); qc.invalidateQueries({ queryKey: ['news'] }); setText('') },
  })

  const delMut = useMutation({
    mutationFn: (cid: number) => deleteComment(postId, cid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', postId] }); qc.invalidateQueries({ queryKey: ['news'] }) },
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) addMut.mutate(text.trim())
  }

  const hrAdmin = isHROrAdmin(currentUser)

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
      >
        <MessageSquare size={14} />
        {commentsCount > 0 ? `${commentsCount} komentarz${commentsCount === 1 ? '' : commentsCount < 5 ? 'e' : 'y'}` : 'Dodaj komentarz'}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2 group">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                {c.author_name?.slice(0, 2) || '?'}
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-800">{c.author_name || 'Nieznany'}</span>
                  <span className="text-xs text-gray-400">{format(new Date(c.created_at), 'd MMM, HH:mm', { locale: pl })}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
              </div>
              {(hrAdmin || c.author === currentUser?.id) && (
                <button
                  onClick={() => delMut.mutate(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Napisz komentarz..."
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-700"
            />
            <button
              type="submit"
              disabled={!text.trim() || addMut.isPending}
              className="p-1.5 text-green-700 hover:text-green-800 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// --- Post card ---
function PostCard({ post, isHR, currentUser, onEdit, onDelete }: {
  post: any; isHR: boolean; currentUser: any
  onEdit: (post: any) => void
  onDelete: (id: number) => void
}) {
  const qc = useQueryClient()
  const [likes, setLikes] = useState<{ count: number; liked: boolean }>({
    count: post.likes_count ?? 0,
    liked: post.liked_by_me ?? false,
  })

  const likeMut = useMutation({
    mutationFn: () => toggleLike(post.id),
    onSuccess: (data: any) => setLikes({ count: data.likes_count, liked: data.liked }),
  })

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

        <div
          className="text-sm text-gray-700 mt-2 leading-relaxed prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMd(post.content) }}
        />

        {post.attachment_url && (
          <a
            href={post.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg"
          >
            <Paperclip size={14} />
            {post.attachment_name || 'Załącznik'}
          </a>
        )}

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
            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Szkic</span>
          )}
          {post.visibility !== 'all' && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
              {post.visibility === 'dept' ? 'Dział' : 'Wybrane osoby'}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => likeMut.mutate()}
              className={`flex items-center gap-1 text-sm transition-colors ${likes.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
            >
              <Heart size={15} fill={likes.liked ? 'currentColor' : 'none'} />
              {likes.count > 0 && <span>{likes.count}</span>}
            </button>
          </div>
        </div>

        <CommentsSection
          postId={post.id}
          commentsCount={post.comments_count ?? 0}
          currentUser={currentUser}
        />
      </Card>
    </div>
  )
}

// --- Post form ---
function PostForm({ initial, onSave, onCancel, isPending, error }: {
  initial?: any; onSave: (fd: FormData) => void; onCancel: () => void
  isPending: boolean; error: string
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [isPublished, setIsPublished] = useState(initial?.is_published !== false)
  const [visibility, setVisibility] = useState(initial?.visibility || 'all')
  const [visibleDepts, setVisibleDepts] = useState<string[]>((initial?.visible_to_depts || []).map(String))
  const [visibleUsers, setVisibleUsers] = useState<string[]>((initial?.visible_to_users || []).map(String))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(initial?.image_url || '')
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)
  const attRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => getUsers() })

  const departments: any[] = deptData?.results || deptData || []
  const employees: any[] = usersData?.results || usersData || []

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImageFile(file); setPreviewUrl(URL.createObjectURL(file))
  }

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setAttachFile(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('title', title)
    fd.append('content', content)
    fd.append('is_published', String(isPublished))
    fd.append('visibility', visibility)
    if (imageFile) fd.append('image', imageFile)
    if (attachFile) {
      fd.append('attachment', attachFile)
      fd.append('attachment_name', attachFile.name)
    }
    if (visibility === 'dept') visibleDepts.forEach(d => fd.append('visible_to_depts[]', d))
    if (visibility === 'person') visibleUsers.forEach(u => fd.append('visible_to_users[]', u))
    onSave(fd)
  }

  const toggleMulti = (val: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">Treść *</label>
            <button type="button" onClick={() => setPreview(v => !v)}
              className="text-xs text-blue-600 hover:text-blue-800">
              {preview ? 'Edytuj' : 'Podgląd'}
            </button>
          </div>
          {preview ? (
            <div
              className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMd(content) || '<span class="text-gray-400">Brak treści</span>' }}
            />
          ) : (
            <>
              <MdToolbar taRef={taRef as React.RefObject<HTMLTextAreaElement>} value={content} onChange={setContent} />
              <textarea
                ref={taRef}
                required rows={6} value={content} onChange={e => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-b-lg rounded-t-none text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-y"
                placeholder="Treść posta... (obsługuje **pogrubienie**, *kursywę*, [link](https://), - lista)"
              />
            </>
          )}
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Widoczność</label>
          <select
            value={visibility}
            onChange={e => setVisibility(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            <option value="all">Wszyscy pracownicy</option>
            <option value="dept">Wybrane działy</option>
            <option value="person">Wybrane osoby</option>
          </select>

          {visibility === 'dept' && (
            <div className="mt-2 border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
              {departments.map((d: any) => (
                <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                  <input type="checkbox" checked={visibleDepts.includes(String(d.id))}
                    onChange={() => toggleMulti(String(d.id), visibleDepts, setVisibleDepts)}
                    className="w-3.5 h-3.5" />
                  {d.name}
                </label>
              ))}
              {departments.length === 0 && <p className="text-xs text-gray-400">Brak działów</p>}
            </div>
          )}

          {visibility === 'person' && (
            <div className="mt-2 border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
              {employees.map((u: any) => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                  <input type="checkbox" checked={visibleUsers.includes(String(u.id))}
                    onChange={() => toggleMulti(String(u.id), visibleUsers, setVisibleUsers)}
                    className="w-3.5 h-3.5" />
                  {u.first_name} {u.last_name}
                  <span className="text-xs text-gray-400">{u.department_name}</span>
                </label>
              ))}
              {employees.length === 0 && <p className="text-xs text-gray-400">Brak pracowników</p>}
            </div>
          )}
        </div>

        {/* Image */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Zdjęcie w tytule (opcjonalnie)</label>
          {previewUrl && (
            <div className="relative mb-2 w-full max-h-48 rounded-lg overflow-hidden border border-gray-200">
              <img src={previewUrl} alt="" className="w-full object-cover max-h-48" />
              <button type="button" onClick={() => { setImageFile(null); setPreviewUrl('') }}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-gray-500 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <button type="button" onClick={() => imgRef.current?.click()}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
            <ImageIcon size={15} /> {previewUrl ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
          </button>
        </div>

        {/* Attachment */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Załącznik (plik, opcjonalnie)</label>
          {attachFile ? (
            <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Paperclip size={14} className="text-gray-400" />
              <span className="flex-1 truncate">{attachFile.name}</span>
              <button type="button" onClick={() => setAttachFile(null)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
            </div>
          ) : initial?.attachment_url ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Paperclip size={14} />
              <a href={initial.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{initial.attachment_name || 'Istniejący załącznik'}</a>
            </div>
          ) : null}
          <input ref={attRef} type="file" className="hidden" onChange={handleAttach} />
          <button type="button" onClick={() => attRef.current?.click()}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mt-1">
            <Paperclip size={15} /> {attachFile || initial?.attachment_url ? 'Zmień plik' : 'Dodaj plik'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)}
            className="w-4 h-4 text-green-700" />
          Opublikowany (widoczny dla pracowników)
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

// --- Main page ---
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['news'] }); setShowForm(false); setFormError('') },
    onError: () => setFormError('Błąd podczas publikowania.'),
  })

  const updateMutation = useMutation({
    mutationFn: (fd: FormData) => updateNewsPost(editPost.id, fd),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['news'] }); setEditPost(null); setFormError('') },
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

        {isLoading && <div className="text-center py-12 text-gray-400 text-sm">Ładowanie...</div>}

        {!isLoading && posts.length === 0 && !showForm && (
          <Card className="p-12 text-center text-gray-400">
            <p className="mb-2">Brak aktualności.</p>
            {hrAdmin && <Btn onClick={() => setShowForm(true)}><Plus size={16} /> Dodaj pierwszy post</Btn>}
          </Card>
        )}

        {posts.map((post: any) =>
          editPost?.id === post.id ? null : (
            <PostCard
              key={post.id}
              post={post}
              isHR={hrAdmin}
              currentUser={user}
              onEdit={p => { setEditPost(p); setShowForm(false) }}
              onDelete={id => { if (confirm('Usunąć post?')) deleteMutation.mutate(id) }}
            />
          )
        )}
      </div>
    </div>
  )
}
