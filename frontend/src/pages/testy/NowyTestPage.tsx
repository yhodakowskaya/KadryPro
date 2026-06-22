import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTest, getTest, getTemplates } from '../../api/tests'
import { PageHeader, Card, Btn, FormField, Input, Textarea, Select, ErrorMessage, Badge } from '../../components/ui'
import { Plus, Trash2, ArrowLeft, Save, Copy, ChevronDown, ChevronUp } from 'lucide-react'

interface AnswerForm { text: string; is_correct: boolean }
interface QuestionForm { text: string; question_type: 'single' | 'multiple'; order: number; answers: AnswerForm[] }

const emptyAnswer = (): AnswerForm => ({ text: '', is_correct: false })
const emptyQuestion = (order: number): QuestionForm => ({
  text: '', question_type: 'single', order,
  answers: [emptyAnswer(), emptyAnswer(), emptyAnswer(), emptyAnswer()]
})

const categoryColor: Record<string, string> = {
  BHP: 'orange', RODO: 'purple', custom: 'blue'
}

export default function NowyTestPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ title: '', description: '', category: 'BHP', passing_score: '70', max_attempts: '1' })
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion(1)])
  const [error, setError] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState<number | null>(null)

  const { data: templatesData } = useQuery({
    queryKey: ['test-templates'],
    queryFn: getTemplates,
    enabled: showTemplates,
  })
  const templates = templatesData?.results || templatesData || []

  const mutation = useMutation({
    mutationFn: createTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      navigate('/testy')
    },
    onError: (err: any) => setError(err.response?.data?.detail || 'Błąd podczas zapisywania.'),
  })

  const applyTemplate = async (templateId: number) => {
    setLoadingTemplate(templateId)
    try {
      const t = await getTest(templateId)
      setForm({
        title: t.title || '',
        description: t.description || '',
        category: t.category || 'BHP',
        passing_score: String(t.passing_score ?? 70),
        max_attempts: String(t.max_attempts ?? 1),
      })
      if (t.questions?.length) {
        setQuestions(t.questions.map((q: any) => ({
          text: q.text,
          question_type: q.question_type,
          order: q.order,
          answers: q.answers.map((a: any) => ({ text: a.text, is_correct: a.is_correct })),
        })))
      }
      setShowTemplates(false)
    } finally {
      setLoadingTemplate(null)
    }
  }

  const addQuestion = () => setQuestions(qs => [...qs, emptyQuestion(qs.length + 1)])
  const removeQuestion = (i: number) => setQuestions(qs => qs.filter((_, idx) => idx !== i))
  const updateQuestion = (i: number, key: string, val: any) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [key]: val } : q))
  const updateAnswer = (qi: number, ai: number, key: string, val: any) =>
    setQuestions(qs => qs.map((q, idx) => idx === qi ? {
      ...q,
      answers: q.answers.map((a, aidx) => aidx === ai ? { ...a, [key]: val } : a)
    } : q))
  const addAnswer = (qi: number) =>
    setQuestions(qs => qs.map((q, idx) => idx === qi ? { ...q, answers: [...q.answers, emptyAnswer()] } : q))
  const removeAnswer = (qi: number, ai: number) =>
    setQuestions(qs => qs.map((q, idx) => idx === qi ? {
      ...q, answers: q.answers.filter((_, aidx) => aidx !== ai)
    } : q))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const hasCorrect = questions.every(q => q.answers.some(a => a.is_correct))
    if (!hasCorrect) {
      setError('Każde pytanie musi mieć co najmniej jedną poprawną odpowiedź.')
      return
    }
    mutation.mutate({
      ...form,
      is_template: false,
      passing_score: Number(form.passing_score),
      max_attempts: Number(form.max_attempts),
      questions: questions.map((q, i) => ({ ...q, order: i + 1 })),
    })
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Nowy test"
        subtitle="Utwórz test dla pracowników"
        actions={<Btn variant="secondary" onClick={() => navigate('/testy')}><ArrowLeft size={16} /> Powrót</Btn>}
      />

      {/* Zacznij od szablonu */}
      <Card className="mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
          onClick={() => setShowTemplates(v => !v)}
        >
          <div className="flex items-center gap-3">
            <Copy size={18} className="text-gray-400" />
            <span className="font-medium text-gray-700 text-sm">Zacznij od szablonu</span>
            <span className="text-xs text-gray-400">(opcjonalnie — wypełni formularz danymi szablonu)</span>
          </div>
          {showTemplates ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showTemplates && (
          <div className="px-5 pb-5 border-t border-gray-100">
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Brak dostępnych szablonów testów.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {templates.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={loadingTemplate === t.id}
                    onClick={() => applyTemplate(t.id)}
                    className="text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge color={categoryColor[t.category] || 'gray'}>{t.category}</Badge>
                      <span className="text-xs text-gray-400">{t.question_count} pytań</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Informacje podstawowe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormField label="Tytuł testu" required>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </FormField>
            </div>
            <FormField label="Kategoria" required>
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="BHP">BHP</option>
                <option value="RODO">RODO</option>
                <option value="custom">Inne</option>
              </Select>
            </FormField>
            <FormField label="Próg zaliczenia (%)">
              <Input type="number" min="1" max="100" value={form.passing_score}
                onChange={e => setForm(f => ({ ...f, passing_score: e.target.value }))} />
            </FormField>
            <FormField label="Maks. liczba prób (0 = bez limitu)">
              <Input type="number" min="0" value={form.max_attempts}
                onChange={e => setForm(f => ({ ...f, max_attempts: e.target.value }))} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Opis">
                <Textarea rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </FormField>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {questions.map((q, qi) => (
            <Card key={qi} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-medium text-gray-800">Pytanie {qi + 1}</h3>
                <div className="flex items-center gap-3">
                  <Select
                    className="w-44"
                    value={q.question_type}
                    onChange={e => updateQuestion(qi, 'question_type', e.target.value)}
                  >
                    <option value="single">Jedna odpowiedź</option>
                    <option value="multiple">Wiele odpowiedzi</option>
                  </Select>
                  {questions.length > 1 && (
                    <Btn size="sm" variant="danger" onClick={() => removeQuestion(qi)}>
                      <Trash2 size={13} />
                    </Btn>
                  )}
                </div>
              </div>

              <Textarea
                className="mb-4"
                rows={2}
                placeholder="Treść pytania..."
                value={q.text}
                onChange={e => updateQuestion(qi, 'text', e.target.value)}
                required
              />

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Odpowiedzi (zaznacz poprawne)</p>
                {q.answers.map((a, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <input
                      type={q.question_type === 'single' ? 'radio' : 'checkbox'}
                      name={`q${qi}_correct`}
                      checked={a.is_correct}
                      onChange={e => {
                        if (q.question_type === 'single') {
                          setQuestions(qs => qs.map((qq, idx) => idx === qi ? {
                            ...qq, answers: qq.answers.map((aa, aidx) => ({ ...aa, is_correct: aidx === ai }))
                          } : qq))
                        } else {
                          updateAnswer(qi, ai, 'is_correct', e.target.checked)
                        }
                      }}
                      className="w-4 h-4 text-blue-600 flex-shrink-0"
                    />
                    <Input
                      value={a.text}
                      onChange={e => updateAnswer(qi, ai, 'text', e.target.value)}
                      placeholder={`Odpowiedź ${ai + 1}`}
                      required
                    />
                    {q.answers.length > 2 && (
                      <button type="button" onClick={() => removeAnswer(qi, ai)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addAnswer(qi)}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Plus size={14} /> Dodaj odpowiedź
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Btn variant="secondary" type="button" onClick={addQuestion}>
            <Plus size={16} /> Dodaj pytanie
          </Btn>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex gap-3">
          <Btn type="submit" disabled={mutation.isPending}>
            <Save size={16} /> {mutation.isPending ? 'Zapisywanie...' : 'Zapisz test'}
          </Btn>
        </div>
      </form>
    </div>
  )
}
