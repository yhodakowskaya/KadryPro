import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getPublicForm, submitForm } from '../../api/questionnaire'
import { useState } from 'react'
import { Spinner, ErrorMessage } from '../../components/ui'
import { CheckCircle } from 'lucide-react'

function FieldInput({ field, value, onChange, num }: any) {
  const labelEl = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {num != null && <span className="text-gray-400 mr-1">{num}.</span>}
      {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (field.type === 'section') {
    return (
      <div className="col-span-2 mt-4">
        <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">{field.label}</h3>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="col-span-2">
        {labelEl}
        <textarea
          className={inputCls}
          rows={3}
          value={value || ''}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
        />
      </div>
    )
  }

  if (field.type === 'radio' && field.options) {
    return (
      <div className="col-span-2">
        {labelEl}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
          {field.options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.key}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(field.key, opt)}
                required={field.required}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'checkbox' && field.options) {
    const checked: string[] = Array.isArray(value) ? value : []
    const toggle = (opt: string) => {
      const next = checked.includes(opt) ? checked.filter(v => v !== opt) : [...checked, opt]
      onChange(field.key, next)
    }
    return (
      <div className="col-span-2">
        {labelEl}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
          {field.options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <div>
        {labelEl}
        <select
          className={inputCls}
          value={value || ''}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
        >
          <option value="">— wybierz —</option>
          {field.options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div>
      {labelEl}
      <input
        type={field.type === 'date' ? 'date' : 'text'}
        className={inputCls}
        value={value || ''}
        onChange={e => onChange(field.key, e.target.value)}
        required={field.required}
      />
    </div>
  )
}

function isVisible(field: any, formData: Record<string, any>) {
  if (!field.condition) return true
  const { fieldKey, value } = field.condition
  return formData[fieldKey] === value
}

export default function FormularzPublicznyPage() {
  const { token } = useParams()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-form', token],
    queryFn: () => getPublicForm(token!),
  })

  const mutation = useMutation({
    mutationFn: (filteredData: Record<string, any>) => submitForm(token!, filteredData),
    onSuccess: () => setSubmitted(true),
  })

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const allFields: any[] = (data?.fields_schema || []).map((f: any, i: number) => ({
      ...f,
      key: f.key || `field_${i}`,
    }))
    const visibleKeys = new Set(allFields.filter(f => isVisible(f, formData)).map(f => f.key))
    const filteredData: Record<string, any> = {}
    for (const k of Object.keys(formData)) {
      if (visibleKeys.has(k)) filteredData[k] = formData[k]
    }
    mutation.mutate(filteredData)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link nieważny</h2>
          <p className="text-gray-500 text-sm">
            Ten formularz nie istnieje, wygasł lub został już wypełniony.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dziękujemy!</h2>
          <p className="text-gray-500 text-sm">
            Kwestionariusz został pomyślnie wypełniony. Dział HR skontaktuje się z Tobą wkrótce.
          </p>
        </div>
      </div>
    )
  }

  const allFields: any[] = (data.fields_schema || []).map((f: any, i: number) => ({
    ...f,
    key: f.key || `field_${i}`,
  }))
  const fields = allFields.filter(f => isVisible(f, formData))

  // Number only non-section fields
  let counter = 0
  const numbered = fields.map(f => ({ ...f, _num: f.type !== 'section' ? ++counter : null }))

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="bg-blue-600 text-white p-6 rounded-t-2xl">
            <h1 className="text-xl font-bold">{data.template_name}</h1>
            <p className="text-blue-100 text-sm mt-1">
              Formularz dla: <strong>{data.recipient_name}</strong>
            </p>
            <p className="text-blue-200 text-xs mt-1">
              Wszystkie pola oznaczone * są wymagane
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {numbered.map((field: any) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={formData[field.key]}
                  onChange={handleChange}
                  num={field._num}
                />
              ))}
            </div>

            {mutation.isError && (
              <div className="mt-4">
                <ErrorMessage message="Błąd podczas przesyłania formularza. Spróbuj ponownie." />
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-4">
                Świadomy/a odpowiedzialności karnej wynikającej z art. 233 Kodeksu Karnego oświadczam,
                że powyższe dane są zgodne z prawdą. Zobowiązuję się do niezwłocznego poinformowania
                pracodawcy o wszelkich zmianach w danych osobowych.
              </p>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {mutation.isPending ? 'Wysyłanie...' : 'Wyślij kwestionariusz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
