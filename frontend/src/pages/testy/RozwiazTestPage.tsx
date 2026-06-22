import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getMyAssignments, getTest, submitTest } from '../../api/tests'
import { useState } from 'react'
import { Card, Btn, LoadingPage, ErrorMessage } from '../../components/ui'
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react'

export default function RozwiazTestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: getMyAssignments,
  })

  const assignment = (assignments?.results || assignments || []).find((a: any) => String(a.id) === String(id))

  const { data: test, isLoading: loadingTest } = useQuery({
    queryKey: ['test', assignment?.test],
    queryFn: () => getTest(assignment.test),
    enabled: !!assignment,
  })

  const mutation = useMutation({
    mutationFn: () => submitTest(Number(id), answers),
    onSuccess: (data) => setResult(data),
    onError: (err: any) => setError(err.response?.data?.detail || 'Błąd podczas przesyłania odpowiedzi.'),
  })

  const toggleAnswer = (questionId: number, answerId: number, type: string) => {
    setAnswers(prev => {
      const current = prev[String(questionId)] || []
      if (type === 'single') return { ...prev, [String(questionId)]: [answerId] }
      return {
        ...prev,
        [String(questionId)]: current.includes(answerId)
          ? current.filter(x => x !== answerId)
          : [...current, answerId]
      }
    })
  }

  if (loadingAssignments || loadingTest) return <LoadingPage />
  if (!assignment) return <div className="p-6 text-gray-500">Nie znaleziono przypisania testu.</div>

  const maxAttempts = assignment.test_max_attempts ?? 1
  const attemptsCount = assignment.attempts_count ?? 0
  const limitReached = maxAttempts > 0 && attemptsCount >= maxAttempts

  if (result) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.passed
              ? <CheckCircle size={40} className="text-green-600" />
              : <XCircle size={40} className="text-red-600" />
            }
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {result.passed ? 'Test zaliczony!' : 'Test niezaliczony'}
          </h2>
          <p className="text-gray-500 mb-6">
            {result.passed
              ? 'Gratulacje! Pomyślnie ukończyłeś/aś test.'
              : `Nie udało się zaliczyć testu. Wymagany próg: ${result.passing_score}%.`
            }
          </p>
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <p className={`text-5xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
              {result.score}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {result.correct} z {result.total} poprawnych odpowiedzi
            </p>
          </div>
          <Btn onClick={() => navigate('/moje-testy')} className="w-full justify-center">
            Powrót do moich testów
          </Btn>
        </Card>
      </div>
    )
  }

  if (limitReached) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Limit prób wyczerpany</h2>
          <p className="text-gray-500 mb-6">
            Wykonałeś/aś już {attemptsCount} z {maxAttempts} dozwolonych prób dla tego testu.
          </p>
          {assignment.latest_score && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">Ostatni wynik</p>
              <p className={`text-3xl font-bold ${assignment.latest_score.passed ? 'text-green-600' : 'text-red-600'}`}>
                {assignment.latest_score.score}%
              </p>
            </div>
          )}
          <Btn onClick={() => navigate('/moje-testy')}>Powrót do testów</Btn>
        </Card>
      </div>
    )
  }

  const questions = test?.questions || []
  const allAnswered = questions.every((q: any) => (answers[String(q.id)] || []).length > 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{test?.title}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Kategoria: {test?.category} · Próg zaliczenia: {test?.passing_score}%
          {maxAttempts > 0 && ` · Podejście ${attemptsCount + 1} z ${maxAttempts}`}
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((q: any, i: number) => {
          const selected = answers[String(q.id)] || []
          return (
            <Card key={q.id} className="p-6">
              <p className="text-sm font-semibold text-gray-500 mb-2">Pytanie {i + 1} z {questions.length}</p>
              <p className="text-base font-medium text-gray-900 mb-4">{q.text}</p>
              <p className="text-xs text-gray-400 mb-3">
                {q.question_type === 'single' ? 'Wybierz jedną odpowiedź' : 'Wybierz wszystkie poprawne odpowiedzi'}
              </p>
              <div className="space-y-2">
                {q.answers?.map((a: any) => (
                  <label key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected.includes(a.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type={q.question_type === 'single' ? 'radio' : 'checkbox'}
                      name={`q${q.id}`}
                      checked={selected.includes(a.id)}
                      onChange={() => toggleAnswer(q.id, a.id, q.question_type)}
                      className="w-4 h-4 text-blue-600 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-800">{a.text}</span>
                  </label>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <div className="mt-6 flex gap-3">
        <Btn
          onClick={() => mutation.mutate()}
          disabled={!allAnswered || mutation.isPending}
        >
          <ChevronRight size={16} />
          {mutation.isPending ? 'Sprawdzanie...' : 'Zakończ test i sprawdź wynik'}
        </Btn>
        <Btn variant="secondary" onClick={() => navigate('/moje-testy')}>Anuluj</Btn>
      </div>
      {!allAnswered && (
        <p className="text-xs text-gray-400 mt-2">Odpowiedz na wszystkie pytania przed zakończeniem.</p>
      )}
    </div>
  )
}
