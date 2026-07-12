import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

// Initial blank state for the question form
const blankForm = {
  text: '',
  type: 'mcq',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
  category: '',
  modelAnswer: '',
  gradingCriteria: '',
  maxScore: 10,
  testCases: [{ input: '', expectedOutput: '', isHidden: false }],
  codeTemplate: '',
}

function QuestionManager() {
  const { examId }  = useParams()
  const navigate    = useNavigate()
  const [exam, setExam]           = useState(null)
  const [bankQuestions, setBankQuestions] = useState([])  // instructor's full bank
  const [showForm, setShowForm]   = useState(false)       // new question form
  const [showBank, setShowBank]   = useState(false)       // pick from bank
  const [form, setForm]           = useState(blankForm)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [bankSearch, setBankSearch] = useState('')
  const [loading, setLoading]     = useState(true)

  const [statsModalOpen, setStatsModalOpen] = useState(false)
  const [statsData, setStatsData] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const handleViewStats = async (q) => {
    setStatsData({ question: q, stats: null })
    setStatsModalOpen(true)
    setLoadingStats(true)
    try {
      const { data } = await api.get(`/questions/${q._id}/stats`)
      setStatsData({ question: q, stats: data.data.stats })
    } catch (err) {
      alert('Failed to load stats.')
      setStatsModalOpen(false)
    } finally {
      setLoadingStats(false)
    }
  }

  const loadData = async () => {
    try {
      const [examRes, bankRes] = await Promise.all([
        api.get(`/exams/${examId}`),
        api.get('/questions'),
      ])
      setExam(examRes.data.data.exam)
      setBankQuestions(bankRes.data.data.questions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [examId])

  // IDs already on this exam
  const linkedIds = new Set((exam?.questions || []).map(q => q._id))

  const handleFormChange = (e, idx) => {
    if (idx !== undefined) {
      // editing one of the 4 MCQ option fields
      const opts = [...form.options]
      opts[idx] = e.target.value
      setForm({ ...form, options: opts })
    } else {
      const { name, value } = e.target
      // when switching type, reset correctAnswer
      if (name === 'type') {
        setForm({ ...form, type: value, correctAnswer: '', options: ['', '', '', ''], modelAnswer: '', gradingCriteria: '', testCases: [{ input: '', expectedOutput: '', isHidden: false }], codeTemplate: '' })
      } else {
        setForm({ ...form, [name]: value })
      }
    }
  }

  const handleCreateQuestion = async (e) => {
    e.preventDefault()
    setError(''); setSaving(true)
    try {
      // 1. Create question in bank
      const { data } = await api.post('/questions', {
        ...form,
        options: form.type === 'truefalse' ? [] : form.options,
        testCases: form.type === 'coding' ? form.testCases : [],
      })
      // 2. Link it to this exam immediately
      await api.post('/questions/add-to-exam', {
        examId,
        questionId: data.data.question._id,
      })
      setForm(blankForm)
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create question.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddFromBank = async (questionId) => {
    try {
      await api.post('/questions/add-to-exam', { examId, questionId })
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add question.')
    }
  }

  const handleRemove = async (questionId) => {
    if (!confirm('Remove this question from the exam?')) return
    try {
      await api.post('/questions/remove-from-exam', { examId, questionId })
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove.')
    }
  }

  const filteredBank = bankQuestions.filter(q =>
    !linkedIds.has(q._id) &&
    (q.text.toLowerCase().includes(bankSearch.toLowerCase()) ||
     q.category?.toLowerCase().includes(bankSearch.toLowerCase()))
  )

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate('/instructor/exams')}
            className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> My Exams
          </button>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-h1 text-on-surface">{exam?.title}</h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              {exam?.questions?.length || 0} question{exam?.questions?.length !== 1 ? 's' : ''} · {exam?.duration} min
            </p>
          </div>
          <Link
            to={`/instructor/exams/${examId}/edit`}
            className="flex items-center gap-1 px-4 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            Exam Settings
          </Link>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => { setShowForm(!showForm); setShowBank(false); setError('') }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-label-md transition-all
              ${showForm ? 'bg-surface-container-high text-on-surface' : 'bg-primary-container text-on-primary-container hover:opacity-90'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'New Question'}
          </button>
          <button
            onClick={() => { setShowBank(!showBank); setShowForm(false) }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-label-md border transition-all
              ${showBank ? 'bg-surface-container-high border-outline text-on-surface' : 'border-outline-variant text-on-surface hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined text-[18px]">library_add</span>
            {showBank ? 'Close Bank' : 'Add from Bank'}
          </button>
        </div>

        {/* New Question Form */}
        {showForm && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
            <h2 className="text-h2 text-on-surface mb-5">New Question</h2>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container flex items-center gap-2">
                <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
                <p className="text-label-md text-on-error-container">{error}</p>
              </div>
            )}
            <form onSubmit={handleCreateQuestion} className="space-y-5">
              {/* Question type */}
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Question Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'mcq',       label: 'Multiple Choice',  icon: 'radio_button_checked' },
                    { value: 'truefalse', label: 'True / False',     icon: 'toggle_on' },
                    { value: 'written',   label: 'Written (AI)',      icon: 'draw' },
                    { value: 'coding',    label: 'Coding (Gemini AI)', icon: 'code' },
                  ].map(t => (
                    <label key={t.value} className="relative cursor-pointer">
                      <input type="radio" name="type" value={t.value}
                        checked={form.type === t.value}
                        onChange={handleFormChange}
                        className="sr-only peer" />
                      <div className="p-4 border border-outline-variant rounded-lg flex items-center gap-3 transition-all peer-checked:border-primary peer-checked:bg-surface-container">
                        <span className="material-symbols-outlined text-outline peer-checked:text-primary text-[20px]">{t.icon}</span>
                        <span className="text-label-md text-on-surface">{t.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Question text */}
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Question Text *</label>
                <textarea name="text" value={form.text} onChange={handleFormChange}
                  placeholder="Type the question here..." required rows={3}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all resize-none" />
              </div>

              {/* MCQ options */}
              {form.type === 'mcq' && (
                <div className="space-y-2">
                  <label className="text-label-sm text-outline">Answer Options *</label>
                  <p className="text-label-sm text-on-surface-variant">Fill in all 4 options, then pick the correct one below.</p>
                  {form.options.map((opt, i) => (
                    <div key={i} className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-label-sm text-on-surface-variant font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        value={opt}
                        onChange={(e) => handleFormChange(e, i)}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        required
                        className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                      />
                    </div>
                  ))}
                  <div className="space-y-1 pt-1">
                    <label className="text-label-sm text-outline">Correct Answer *</label>
                    <select name="correctAnswer" value={form.correctAnswer}
                      onChange={handleFormChange} required
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all">
                      <option value="">— Select correct option —</option>
                      {form.options.map((opt, i) => (
                        opt && <option key={i} value={opt}>{String.fromCharCode(65 + i)}: {opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* True/False correct answer */}
              {form.type === 'truefalse' && (
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Correct Answer *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map(opt => (
                      <label key={opt} className="relative cursor-pointer">
                        <input type="radio" name="correctAnswer" value={opt}
                          checked={form.correctAnswer === opt}
                          onChange={handleFormChange}
                          className="sr-only peer" required />
                        <div className={`py-3 border border-outline-variant rounded-lg flex items-center justify-center gap-2 transition-all peer-checked:border-primary peer-checked:bg-surface-container`}>
                          <span className="material-symbols-outlined text-[18px] text-outline peer-checked:text-primary">
                            {opt === 'True' ? 'check_circle' : 'cancel'}
                          </span>
                          <span className="text-label-md text-on-surface">{opt}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Written question fields */}
              {form.type === 'written' && (
                <>
                  <div className="space-y-1">
                    <label className="text-label-sm text-outline">Model Answer * <span className="text-on-surface-variant font-normal">(used by AI to grade student responses)</span></label>
                    <textarea name="modelAnswer" value={form.modelAnswer} onChange={handleFormChange}
                      placeholder="Write the ideal answer here. The AI will compare student answers against this..." required rows={4}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all resize-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-outline">Grading Criteria <span className="text-on-surface-variant font-normal">(optional — extra rubric hints for the AI)</span></label>
                    <textarea name="gradingCriteria" value={form.gradingCriteria} onChange={handleFormChange}
                      placeholder="e.g. Award full marks if student mentions X, Y, Z. Deduct marks for..." rows={3}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all resize-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm text-outline">Max Score *</label>
                    <input type="number" name="maxScore" value={form.maxScore} onChange={handleFormChange}
                      min={1} max={100} required
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
                  </div>
                </>
              )}

              {/* Coding question fields */}
              {form.type === 'coding' && (
                <div className="space-y-4 border-t border-outline-variant pt-4 mt-2">
                  <div className="space-y-1">
                    <label className="text-label-sm text-outline">Starter Code (optional)</label>
                    <textarea name="codeTemplate" value={form.codeTemplate || ''} onChange={handleFormChange}
                      placeholder="e.g. def add(a, b):&#10;    pass" rows={3} spellCheck={false}
                      className="w-full px-4 py-3 bg-[#1e1e2e] text-green-300 font-mono border border-outline-variant rounded-lg text-body-md focus:border-primary focus:outline-none input-halo transition-all resize-y" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm text-outline">Test Cases *</label>
                      <button type="button" onClick={() => {
                        const tc = form.testCases || [];
                        setForm({ ...form, testCases: [...tc, { input: '', expectedOutput: '', isHidden: false }] })
                      }}
                        className="text-label-sm text-primary hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">add</span> Add Test Case
                      </button>
                    </div>
                    
                    {(form.testCases || []).map((tc, idx) => (
                      <div key={idx} className="p-4 bg-surface-container rounded-lg border border-outline-variant relative group">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-label-sm text-outline">Input (stdin)</label>
                            <textarea value={tc.input} onChange={e => {
                              const newTc = [...form.testCases]; newTc[idx].input = e.target.value; setForm({ ...form, testCases: newTc })
                            }} rows={2} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-mono focus:border-primary focus:outline-none resize-none" placeholder="e.g. 5 10" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-label-sm text-outline">Expected Output (stdout) *</label>
                            <textarea value={tc.expectedOutput} required onChange={e => {
                              const newTc = [...form.testCases]; newTc[idx].expectedOutput = e.target.value; setForm({ ...form, testCases: newTc })
                            }} rows={2} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-mono focus:border-primary focus:outline-none resize-none" placeholder="e.g. 15" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={tc.isHidden} onChange={e => {
                              const newTc = [...form.testCases]; newTc[idx].isHidden = e.target.checked; setForm({ ...form, testCases: newTc })
                            }} className="w-4 h-4 text-primary bg-surface-container-lowest border-outline-variant rounded focus:ring-primary focus:ring-2" />
                            <span className="text-label-sm text-on-surface-variant">Hidden from student during exam</span>
                          </label>
                          {form.testCases.length > 1 && (
                            <button type="button" onClick={() => {
                              const newTc = form.testCases.filter((_, i) => i !== idx); setForm({ ...form, testCases: newTc })
                            }} className="text-error opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-label-sm text-outline">Max Score *</label>
                    <input type="number" name="maxScore" value={form.maxScore || 10} onChange={handleFormChange}
                      min={1} max={100} required
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
                  </div>
                </div>
              )}

              {/* Explanation + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Category</label>
                  <input name="category" value={form.category} onChange={handleFormChange}
                    placeholder="e.g. JavaScript"
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Explanation (optional)</label>
                  <input name="explanation" value={form.explanation} onChange={handleFormChange}
                    placeholder="Shown after submission"
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? 'Saving...' : 'Add Question to Exam'}
                {!saving && <span className="material-symbols-outlined text-[18px]">add_circle</span>}
              </button>
            </form>
          </div>
        )}

        {/* Add from bank panel */}
        {showBank && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
            <h2 className="text-h2 text-on-surface mb-4">Question Bank</h2>
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input type="text" placeholder="Search questions..."
                value={bankSearch} onChange={(e) => setBankSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
            </div>
            {filteredBank.length === 0 ? (
              <p className="text-label-md text-on-surface-variant text-center py-6">
                {bankQuestions.length === 0 ? 'No questions in bank yet.' : 'All bank questions are already on this exam.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredBank.map(q => (
                  <div key={q._id} className="flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-label-md text-on-surface truncate">{q.text}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-label-sm text-on-surface-variant capitalize">
                          {q.type === 'truefalse' ? 'True/False' : q.type === 'written' ? 'Written' : q.type === 'coding' ? 'Coding' : 'MCQ'}
                        </span>
                        {q.category && <span className="text-label-sm text-on-surface-variant">· {q.category}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleAddFromBank(q._id)}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-surface-container text-label-sm text-on-surface rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all">
                      <span className="material-symbols-outlined text-[16px]">add</span> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current exam questions list */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
          <div className="px-6 py-4 border-b border-outline-variant">
            <h2 className="text-h2 text-on-surface">Questions on This Exam</h2>
          </div>
          {(!exam?.questions || exam.questions.length === 0) ? (
            <div className="px-6 py-12 text-center">
              <span className="material-symbols-outlined text-outline text-[40px] mb-2 block">quiz</span>
              <p className="text-body-md text-on-surface-variant">No questions yet. Add one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {exam.questions.map((q, i) => (
                <div key={q._id} className="flex items-start gap-4 px-6 py-4">
                  <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-label-sm text-on-surface-variant font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md text-on-surface">{q.text}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-label-sm text-on-surface-variant capitalize px-2 py-0.5 bg-surface-container rounded-full">
                        {q.type === 'truefalse' ? 'True/False' : q.type === 'written' ? 'Written (AI)' : q.type === 'coding' ? 'Coding' : 'MCQ'}
                      </span>
                      {q.category && (
                        <span className="text-label-sm text-on-surface-variant">{q.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <button onClick={() => handleViewStats(q)}
                      className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all"
                      title="View Statistics">
                      <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                    </button>
                    <button onClick={() => handleRemove(q._id)}
                      className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-all"
                      title="Remove from exam">
                      <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Modal */}
      {statsModalOpen && statsData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h2 text-on-surface">Question Statistics</h2>
              <button onClick={() => setStatsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-body-md text-on-surface mb-6 p-3 bg-surface-container rounded-lg">"{statsData.question.text}"</p>
            
            {loadingStats ? (
              <div className="flex justify-center py-8">
                <span className="material-symbols-outlined text-primary animate-spin text-[32px]">refresh</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant text-center">
                    <span className="text-display-sm text-on-surface block">{statsData.stats.totalAttempts}</span>
                    <span className="text-label-sm text-on-surface-variant">Total Attempts</span>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant text-center">
                    {['mcq', 'truefalse'].includes(statsData.question.type) ? (
                      <>
                        <span className="text-display-sm text-green-600 block">
                          {statsData.stats.totalAttempts > 0 
                            ? Math.round((statsData.stats.correctCount / statsData.stats.totalAttempts) * 100) 
                            : 0}%
                        </span>
                        <span className="text-label-sm text-on-surface-variant">Success Rate</span>
                      </>
                    ) : (
                      <>
                        <span className="text-display-sm text-primary block">
                          {statsData.stats.averageScore ? statsData.stats.averageScore.toFixed(1) : 0}
                          <span className="text-label-sm ml-1 text-on-surface-variant">/ {statsData.question.maxScore}</span>
                        </span>
                        <span className="text-label-sm text-on-surface-variant">Average Score</span>
                      </>
                    )}
                  </div>
                </div>

                {['mcq', 'truefalse'].includes(statsData.question.type) && (
                  <div className="flex items-center gap-4 mt-2 p-3 border border-outline-variant rounded-lg">
                    <div className="flex-1 text-center">
                      <span className="text-h3 text-green-600">{statsData.stats.correctCount}</span>
                      <p className="text-label-sm text-on-surface-variant">Correct</p>
                    </div>
                    <div className="w-px h-8 bg-outline-variant"></div>
                    <div className="flex-1 text-center">
                      <span className="text-h3 text-error">{statsData.stats.incorrectCount}</span>
                      <p className="text-label-sm text-on-surface-variant">Incorrect</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default QuestionManager
