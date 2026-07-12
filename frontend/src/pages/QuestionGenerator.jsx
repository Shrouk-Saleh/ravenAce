import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AppLayout from '../components/AppLayout'

const DIFFICULTIES = ['easy', 'medium', 'hard']

function QuestionGenerator() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    topic: '',
    category: '',
    difficulty: 'medium',
    mcqCount: 3,
    tfCount: 2,
    writtenCount: 1,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name.includes('Count') ? parseInt(value) || 0 : value }))
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!form.topic.trim()) return
    setLoading(true); setError(''); setResult(null); setSelectedIndices(new Set())
    try {
      const { data } = await api.post('/ai/generate-questions', form)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate questions. Make sure Gemini API is available.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleSaveSelected = async () => {
    if (selectedIndices.size === 0) return
    setSaving(true)
    setError('')
    try {
      const questionsToSave = result.data.questions.filter((_, i) => selectedIndices.has(i))
      await api.post('/ai/save-questions', { questions: questionsToSave })
      navigate('/instructor/questions')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save questions.')
    } finally {
      setSaving(false)
    }
  }

  const typeColor = { mcq: 'bg-primary text-on-primary', truefalse: 'bg-secondary text-on-primary', written: 'bg-tertiary-container text-on-tertiary-container', coding: 'bg-surface-container-high text-on-surface' }
  const typeLabel = { mcq: 'MCQ', truefalse: 'True/False', written: 'Written', coding: 'Coding' }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-primary text-[32px]">auto_awesome</span>
            <h1 className="text-h1 text-on-surface">AI Question Generator</h1>
          </div>
          <p className="text-body-md text-on-surface-variant">Generate MCQ, True/False, and Written questions from any topic using Gemini AI</p>
        </div>

        {/* Form */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Topic */}
            <div className="space-y-1">
              <label className="text-label-sm text-outline">Topic *</label>
              <input
                name="topic" value={form.topic} onChange={handleChange} required
                placeholder="e.g. Binary Search Trees, Photosynthesis, The French Revolution..."
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Category (optional)</label>
                <input
                  name="category" value={form.category} onChange={handleChange}
                  placeholder="e.g. Computer Science, Biology..."
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Difficulty</label>
                <select
                  name="difficulty" value={form.difficulty} onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'mcqCount', label: 'MCQ Questions', icon: 'quiz', color: 'text-primary' },
                { name: 'tfCount',  label: 'True/False', icon: 'rule', color: 'text-secondary' },
                { name: 'writtenCount', label: 'Written', icon: 'edit_note', color: 'text-on-surface-variant' },
              ].map(({ name, label, icon, color }) => (
                <div key={name} className="space-y-1">
                  <label className="text-label-sm text-outline flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[16px] ${color}`}>{icon}</span> {label}
                  </label>
                  <input
                    type="number" name={name} value={form[name]} onChange={handleChange}
                    min={0} max={10}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error-container flex items-center gap-2">
                <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
                <p className="text-label-md text-on-error-container">{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={loading || !form.topic.trim()}
              className="w-full py-3 bg-primary text-on-primary rounded-xl text-label-md font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> Generating with Gemini...</>
              ) : (
                <><span className="material-symbols-outlined text-[20px]">auto_awesome</span> Generate Questions</>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">check_circle</span>
                <h2 className="text-h2 text-on-surface">{result.data.questions.length} Questions Generated</h2>
              </div>
              <p className="text-label-sm text-on-surface-variant">Select the ones you want to keep</p>
            </div>

            {result.data.questions.map((q, i) => (
              <div 
                key={i} 
                onClick={() => toggleSelection(i)}
                className={`bg-surface-container-lowest border rounded-xl p-5 transition-all cursor-pointer hover:border-primary/50 ${selectedIndices.has(i) ? 'border-primary ring-1 ring-primary' : 'border-outline-variant'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${selectedIndices.has(i) ? 'bg-primary border-primary' : 'border-outline-variant bg-surface-container'}`}>
                      {selectedIndices.has(i) && <span className="material-symbols-outlined text-[16px] text-on-primary">check</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-label-sm ${typeColor[q.type] || typeColor.mcq}`}>
                      {typeLabel[q.type] || q.type}
                    </span>
                    {q.difficulty && (
                      <span className="px-2 py-0.5 rounded-full text-label-sm bg-surface-container text-on-surface-variant capitalize">
                        {q.difficulty}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-label-sm bg-primary/10 text-primary">
                      AI Generated
                    </span>
                  </div>
                  <span className="text-label-sm text-on-surface-variant">Q{i + 1}</span>
                </div>

                <p className="text-body-lg text-on-surface mb-3">{q.text}</p>

                {q.type === 'mcq' && q.options?.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {q.options.map((opt, j) => (
                      <div key={j} className={`px-3 py-2 rounded-lg text-body-md ${opt === q.correctAnswer ? 'bg-primary/10 text-primary border border-primary/20 font-medium' : 'bg-surface-container text-on-surface-variant'}`}>
                        {opt === q.correctAnswer && <span className="material-symbols-outlined text-[14px] mr-1">check</span>}
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'truefalse' && (
                  <div className="flex gap-2 mb-3">
                    {['True','False'].map(v => (
                      <span key={v} className={`px-4 py-1.5 rounded-lg text-label-md ${v === q.correctAnswer ? 'bg-primary/10 text-primary border border-primary/20 font-medium' : 'bg-surface-container text-on-surface-variant'}`}>
                        {v === q.correctAnswer && <span className="material-symbols-outlined text-[14px] mr-1">check</span>}
                        {v}
                      </span>
                    ))}
                  </div>
                )}

                {q.type === 'written' && q.modelAnswer && (
                  <details className="mt-2">
                    <summary className="text-label-sm text-primary cursor-pointer hover:opacity-80">View model answer</summary>
                    <p className="mt-2 text-body-md text-on-surface-variant bg-surface-container p-3 rounded-lg">{q.modelAnswer}</p>
                  </details>
                )}

                {q.explanation && (
                  <p className="text-label-sm text-on-surface-variant mt-2 flex items-start gap-1">
                    <span className="material-symbols-outlined text-[14px] mt-0.5">info</span>
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveSelected}
                disabled={saving || selectedIndices.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-label-md hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Saving...</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">save</span> Save {selectedIndices.size} Selected</>
                )}
              </button>
              <button
                onClick={() => { setResult(null); setForm(f => ({...f, topic:''})); setSelectedIndices(new Set()) }}
                className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant rounded-xl text-label-md text-on-surface hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span> Discard All
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default QuestionGenerator
