import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { FaCheck } from 'react-icons/fa'

function QuestionBank() {
  const [questions, setQuestions] = useState([])
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState(null)
  
  const [statsModalOpen, setStatsModalOpen] = useState(false)
  const [statsData, setStatsData] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const loadQuestions = async () => {
    setLoading(true)
    const params = {}
    if (search)   params.search   = search
    if (category) params.category = category
    try {
      const { data } = await api.get('/questions', { params })
      setQuestions(data.data.questions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => { loadQuestions() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this question from the bank?')) return
    setDeleting(id)
    try {
      await api.delete(`/questions/${id}`)
      setQuestions(prev => prev.filter(q => q._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-h1 text-on-surface">Question Bank</h1>
        <p className="text-body-md text-on-surface-variant mt-1">All your reusable questions across exams</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input type="text" placeholder="Search questions..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
        </div>
        <input type="text" placeholder="Filter by category..."
          value={category} onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
        <button onClick={loadQuestions}
          className="px-5 py-2.5 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">search</span>
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-outline text-[48px] mb-3 block">quiz</span>
          <p className="text-body-lg text-on-surface-variant">No questions found.</p>
          <p className="text-label-md text-on-surface-variant mt-1">Create questions from the exam question manager.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-6 py-3 bg-surface-container border-b border-outline-variant">
            <p className="text-label-sm text-on-surface-variant">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-outline-variant">
            {questions.map(q => (
              <div key={q._id} className="flex items-start gap-4 px-6 py-4 hover:bg-surface-container-low transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-label-md text-on-surface mb-1">{q.text}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-label-sm
                      ${q.type === 'mcq' ? 'bg-surface-container text-on-surface-variant' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {q.type === 'truefalse' ? 'True / False' : 'MCQ'}
                    </span>
                    {q.category && (
                      <span className="text-label-sm text-on-surface-variant">{q.category}</span>
                    )}
                    <span className="text-label-sm text-green-600 flex items-center gap-1"><FaCheck /> {q.correctAnswer}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button onClick={() => handleViewStats(q)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all"
                    title="View Statistics">
                    <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                  </button>
                  <button onClick={() => handleDelete(q._id)}
                    disabled={deleting === q._id}
                    className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-all disabled:opacity-40"
                    title="Delete question">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

export default QuestionBank
