import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { parseImportFile, confirmImport } from '../../api/users'
import { PageHeader, Card, Btn, ErrorMessage } from '../../components/ui'
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from 'lucide-react'

const USER_FIELDS: Record<string, string> = {
  first_name: 'Imię',
  last_name: 'Nazwisko',
  email: 'Email',
  username: 'Login',
  position: 'Stanowisko',
  phone: 'Telefon',
  hire_date: 'Data zatrudnienia',
  contract_type: 'Typ umowy',
  contract_start: 'Umowa od',
  contract_end: 'Umowa do',
}

const CONTRACT_TYPES: Record<string, string> = {
  uop_nieokreslony: 'UoP — czas nieokreślony',
  uop_okreslony: 'UoP — czas określony',
  zlecenie: 'Umowa zlecenie',
  dzielo: 'Umowa o dzieło',
  b2b: 'B2B',
  staz: 'Staż / Praktyka',
}

export default function ImportPracownikowPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'map' | 'result'>('upload')
  const [columns, setColumns] = useState<string[]>([])
  const [preview, setPreview] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [defaultPassword, setDefaultPassword] = useState('Pracownik1234!')
  const [defaultRole, setDefaultRole] = useState('employee')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const parseMut = useMutation({
    mutationFn: (f: File) => parseImportFile(f),
    onSuccess: (data) => {
      setColumns(data.columns)
      setPreview(data.preview)
      // Auto-map columns by name similarity
      const autoMap: Record<string, string> = {}
      data.columns.forEach((col: string, idx: number) => {
        const lower = col.toLowerCase()
        if (lower.includes('imię') || lower.includes('imie') || lower === 'name') autoMap[idx] = 'first_name'
        else if (lower.includes('nazwisk')) autoMap[idx] = 'last_name'
        else if (lower.includes('email') || lower.includes('mail')) autoMap[idx] = 'email'
        else if (lower.includes('login') || lower.includes('user')) autoMap[idx] = 'username'
        else if (lower.includes('stanowisk') || lower.includes('pozycj')) autoMap[idx] = 'position'
        else if (lower.includes('telefon') || lower.includes('phone')) autoMap[idx] = 'phone'
        else if (lower.includes('zatrudni') || lower.includes('hire')) autoMap[idx] = 'hire_date'
      })
      setMapping(autoMap)
      setStep('map')
    },
    onError: () => setError('Nie można odczytać pliku. Sprawdź czy to plik Excel (.xlsx).'),
  })

  const importMut = useMutation({
    mutationFn: () => confirmImport(file!, mapping, defaultPassword, defaultRole),
    onSuccess: (data) => { setResult(data); setStep('result') },
    onError: () => setError('Błąd podczas importu.'),
  })

  const handleFile = (f: File) => {
    setFile(f); setError('')
    parseMut.mutate(f)
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Import pracowników z Excela"
        subtitle="Wczytaj listę pracowników z pliku .xlsx"
        actions={<Btn variant="secondary" onClick={() => navigate('/pracownicy')}><ArrowLeft size={16} /> Powrót</Btn>}
      />

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="p-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-green-500 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <Upload size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Przeciągnij plik Excel lub kliknij, aby wybrać</p>
            <p className="text-sm text-gray-400 mt-1">Obsługiwane formaty: .xlsx</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {parseMut.isPending && <p className="text-center text-gray-500 mt-4">Wczytuję plik...</p>}
          {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-2">Wskazówka — nagłówki kolumn w Excelu:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(USER_FIELDS).map(([field, label]) => (
                <div key={field} className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">System automatycznie dopasuje kolumny po nazwie. Możesz też ręcznie przypisać pola.</p>
          </div>
        </Card>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && (
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Przypisz kolumny do pól systemu</h2>
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-48 text-sm text-gray-700 font-medium truncate" title={col}>
                    {col || `Kolumna ${idx + 1}`}
                  </div>
                  <div className="text-gray-400">→</div>
                  <select
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                    value={mapping[idx] || ''}
                    onChange={e => setMapping(m => ({ ...m, [idx]: e.target.value }))}
                  >
                    <option value="">— Pomiń kolumnę —</option>
                    {Object.entries(USER_FIELDS).map(([f, l]) => (
                      <option key={f} value={f}>{l}</option>
                    ))}
                  </select>
                  {/* Preview value */}
                  {preview[0] && (
                    <span className="text-xs text-gray-400 w-32 truncate" title={preview[0][idx]}>
                      np. {preview[0][idx] || '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Ustawienia importu</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domyślne hasło</label>
                <input
                  value={defaultPassword} onChange={e => setDefaultPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domyślna rola</label>
                <select
                  value={defaultRole} onChange={e => setDefaultRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                >
                  <option value="employee">Pracownik</option>
                  <option value="manager">Kierownik</option>
                  <option value="hr">Kadry/HR</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Preview table */}
          {preview.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Podgląd danych (pierwsze 3 wiersze)</h2>
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr>
                      {columns.map((col, i) => (
                        <th key={i} className="border border-gray-200 px-2 py-1 bg-gray-50 text-left font-medium text-gray-600">
                          {col || `Kol.${i + 1}`}
                          {mapping[i] && <span className="block font-normal text-green-700">→ {USER_FIELDS[mapping[i]]}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-gray-200 px-2 py-1 text-gray-700">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {error && <ErrorMessage message={error} />}
          <div className="flex gap-3">
            <Btn onClick={() => importMut.mutate()} disabled={importMut.isPending}>
              {importMut.isPending ? 'Importuję...' : 'Importuj pracowników'}
            </Btn>
            <Btn variant="secondary" onClick={() => { setStep('upload'); setFile(null) }}>Wróć</Btn>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <Card className="p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Import zakończony</h2>
          <div className="flex justify-center gap-8 mt-4 mb-6">
            <div>
              <p className="text-3xl font-bold text-green-600">{result.created}</p>
              <p className="text-sm text-gray-500">Dodanych</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-400">{result.skipped}</p>
              <p className="text-sm text-gray-500">Pominiętych</p>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="text-left bg-red-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertCircle size={16} /> Błędy ({result.errors.length})
              </div>
              {result.errors.slice(0, 10).map((e: string, i: number) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Btn onClick={() => navigate('/pracownicy')}>Przejdź do listy</Btn>
            <Btn variant="secondary" onClick={() => { setStep('upload'); setFile(null); setResult(null) }}>Importuj kolejny plik</Btn>
          </div>
        </Card>
      )}
    </div>
  )
}
