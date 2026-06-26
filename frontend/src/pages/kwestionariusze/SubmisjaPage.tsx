import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSubmission, generatePDF } from '../../api/questionnaire'
import { PageHeader, Card, Btn, LoadingPage } from '../../components/ui'
import { Download, ArrowLeft, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'

export default function SubmisjaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pdfError, setPdfError] = useState('')

  const { data: submission, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => getSubmission(Number(id)),
  })

  const pdfMutation = useMutation({
    mutationFn: () => generatePDF(Number(id)),
    onError: () => setPdfError('Błąd podczas generowania PDF.'),
  })

  if (isLoading) return <LoadingPage />
  if (!submission) return <div className="p-6 text-gray-500">Nie znaleziono kwestionariusza.</div>

  const inv = submission.invitation_data
  const data: Record<string, any> = submission.data || {}
  const fieldsSchema: any[] = submission.fields_schema || []

  // Build label map from schema for fast lookup
  const labelMap: Record<string, string> = {}
  fieldsSchema.forEach((f: any) => {
    if (f.key) labelMap[f.key] = f.label || f.key
  })

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '—'
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
    return String(value)
  }

  // Render fields in schema order with sections as dividers
  const renderFields = () => {
    if (fieldsSchema.length === 0) {
      // Fallback: render raw data entries
      return Object.entries(data).map(([key, value]) => {
        if (!value || key.endsWith('_section')) return null
        const label = labelMap[key] || key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
        return (
          <div key={key} className="border-b border-gray-100 pb-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm text-gray-900">{formatValue(value)}</p>
          </div>
        )
      })
    }

    const elements: React.ReactNode[] = []
    let currentSectionFields: React.ReactNode[] = []

    const flushSection = (sectionLabel?: string) => {
      if (currentSectionFields.length === 0 && !sectionLabel) return
      elements.push(
        <div key={`section-${elements.length}`} className="mb-4">
          {sectionLabel && (
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg mb-3">
              {sectionLabel}
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {currentSectionFields}
          </div>
        </div>
      )
      currentSectionFields = []
    }

    let pendingSection: string | undefined

    for (const field of fieldsSchema) {
      if (field.type === 'section') {
        flushSection(pendingSection)
        pendingSection = field.label
        continue
      }

      const key = field.key || ''
      const label = field.label || key
      const value = data[key]

      currentSectionFields.push(
        <div key={key} className="border-b border-gray-100 pb-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-sm text-gray-900">{formatValue(value)}</p>
        </div>
      )
    }

    flushSection(pendingSection)
    return elements
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title={`Kwestionariusz: ${inv?.recipient_name}`}
        subtitle={`Wypełniony ${submission.submitted_at ? format(new Date(submission.submitted_at), 'dd MMMM yyyy, HH:mm', { locale: pl }) : ''}`}
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => navigate('/kwestionariusze')}>
              <ArrowLeft size={16} /> Powrót
            </Btn>
            <Btn onClick={() => { setPdfError(''); pdfMutation.mutate() }} disabled={pdfMutation.isPending}>
              <Download size={16} />
              {pdfMutation.isPending ? 'Generowanie...' : 'Pobierz PDF'}
            </Btn>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500 mb-1">Odbiorca</p>
          <p className="font-semibold text-gray-900">{inv?.recipient_name}</p>
          <p className="text-sm text-gray-500">{inv?.recipient_email}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 mb-1">Typ kwestionariusza</p>
          <p className="font-semibold text-gray-900">{inv?.template_name}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 mb-1">Wysłany przez</p>
          <p className="font-semibold text-gray-900">{inv?.sent_by_name}</p>
        </Card>
      </div>

      {pdfError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{pdfError}</div>
      )}

      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          Dane z formularza
        </h2>
        {renderFields()}
      </Card>
    </div>
  )
}
