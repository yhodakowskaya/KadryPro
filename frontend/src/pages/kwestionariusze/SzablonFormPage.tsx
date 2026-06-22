import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getTemplate, createTemplate, updateTemplate } from '../../api/questionnaire'
import { PageHeader, Card, Btn, FormField, Input, Select, ErrorMessage } from '../../components/ui'
import { ArrowLeft, Plus, Trash2, MoveUp, MoveDown, GripVertical } from 'lucide-react'

type FieldType = 'text' | 'textarea' | 'date' | 'radio' | 'select' | 'section'

interface Field {
  id: string
  type: FieldType
  label: string
  required?: boolean
  options?: string[]
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'section', label: 'Nagłówek sekcji' },
  { value: 'text', label: 'Pole tekstowe' },
  { value: 'textarea', label: 'Pole tekstowe wieloliniowe' },
  { value: 'date', label: 'Data' },
  { value: 'radio', label: 'Wybór jednej opcji' },
  { value: 'select', label: 'Lista rozwijana' },
]

const newField = (type: FieldType): Field => ({
  id: Math.random().toString(36).slice(2),
  type,
  label: '',
  required: type !== 'section',
  options: type === 'radio' || type === 'select' ? ['Opcja 1', 'Opcja 2'] : undefined,
})

export default function SzablonFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [type, setType] = useState('custom')
  const [fields, setFields] = useState<Field[]>([])
  const [error, setError] = useState('')

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => getTemplate(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (template) {
      setName(template.name)
      setType(template.type)
      setFields((template.fields_schema || []).map((f: any) => ({ ...f, id: Math.random().toString(36).slice(2) })))
    }
  }, [template])

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? updateTemplate(Number(id), data) : createTemplate(data),
    onSuccess: () => navigate('/kwestionariusze/szablony'),
    onError: (err: any) => setError(err.response?.data?.detail || 'Błąd zapisu.'),
  })

  const addField = (type: FieldType) => setFields(fs => [...fs, newField(type)])
  const removeField = (fid: string) => setFields(fs => fs.filter(f => f.id !== fid))
  const updateField = (fid: string, patch: Partial<Field>) =>
    setFields(fs => fs.map(f => f.id === fid ? { ...f, ...patch } : f))
  const moveField = (fid: string, dir: -1 | 1) => setFields(fs => {
    const i = fs.findIndex(f => f.id === fid)
    if (i + dir < 0 || i + dir >= fs.length) return fs
    const next = [...fs]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    return next
  })

  const handleSave = () => {
    setError('')
    if (!name.trim()) { setError('Podaj nazwę szablonu.'); return }
    const schema = fields.map(({ id: _id, ...rest }) => rest)
    mutation.mutate({ name, type, fields_schema: schema })
  }

  if (isEdit && isLoading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edytuj szablon' : 'Nowy szablon kwestionariusza'}
        subtitle="Zdefiniuj pola formularza"
        actions={<Btn variant="secondary" onClick={() => navigate('/kwestionariusze/szablony')}><ArrowLeft size={16} /> Powrót</Btn>}
      />

      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Ustawienia szablonu</h2>
          <FormField label="Nazwa szablonu" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="np. Kwestionariusz wstępny" />
          </FormField>
          <FormField label="Typ">
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="pracownik">Kwestionariusz dla pracownika (UoP)</option>
              <option value="zleceniobiorca_cudzoziemiec">Kwestionariusz dla zleceniobiorcy — cudzoziemca</option>
              <option value="custom">Własny szablon</option>
            </Select>
          </FormField>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pola formularza ({fields.length})</h2>
          </div>

          {fields.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">Brak pól. Dodaj pierwsze pole formularza poniżej.</p>
          )}

          <div className="space-y-3 mb-4">
            {fields.map((f, i) => (
              <div key={f.id} className={`border rounded-lg p-4 ${f.type === 'section' ? 'bg-gray-50 border-gray-300' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
                  <Select
                    className="w-48"
                    value={f.type}
                    onChange={e => updateField(f.id, { type: e.target.value as FieldType, options: (e.target.value === 'radio' || e.target.value === 'select') ? ['Opcja 1', 'Opcja 2'] : undefined })}
                  >
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                  <div className="flex gap-1 ml-auto">
                    <button onClick={() => moveField(f.id, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><MoveUp size={14} /></button>
                    <button onClick={() => moveField(f.id, 1)} disabled={i === fields.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><MoveDown size={14} /></button>
                    <button onClick={() => removeField(f.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>

                <Input
                  value={f.label}
                  onChange={e => updateField(f.id, { label: e.target.value })}
                  placeholder={f.type === 'section' ? 'Nagłówek sekcji...' : 'Etykieta pola...'}
                  className="mb-2"
                />

                {f.type !== 'section' && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    <input type="checkbox" checked={!!f.required} onChange={e => updateField(f.id, { required: e.target.checked })} className="w-3.5 h-3.5" />
                    Pole wymagane
                  </label>
                )}

                {(f.type === 'radio' || f.type === 'select') && f.options && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs text-gray-500 font-medium">Opcje:</p>
                    {f.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <Input
                          value={opt}
                          onChange={e => {
                            const opts = [...(f.options || [])]
                            opts[oi] = e.target.value
                            updateField(f.id, { options: opts })
                          }}
                          placeholder={`Opcja ${oi + 1}`}
                        />
                        <button onClick={() => updateField(f.id, { options: (f.options || []).filter((_, j) => j !== oi) })} className="text-red-400 hover:text-red-600 flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <Btn size="sm" variant="ghost" onClick={() => updateField(f.id, { options: [...(f.options || []), `Opcja ${(f.options?.length || 0) + 1}`] })}>
                      <Plus size={12} /> Dodaj opcję
                    </Btn>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <p className="text-xs text-gray-500 w-full mb-1">Dodaj pole:</p>
            {FIELD_TYPES.map(t => (
              <Btn key={t.value} size="sm" variant="secondary" onClick={() => addField(t.value)}>
                <Plus size={12} /> {t.label}
              </Btn>
            ))}
          </div>
        </Card>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <Btn onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utwórz szablon'}
          </Btn>
          <Btn variant="secondary" onClick={() => navigate('/kwestionariusze/szablony')}>Anuluj</Btn>
        </div>
      </div>
    </div>
  )
}
