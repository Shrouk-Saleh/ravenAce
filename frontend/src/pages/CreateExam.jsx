import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { FaExclamationCircle, FaArrowRight } from 'react-icons/fa'

function CreateExam() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    duration: 30,
    totalScore: 100,
    passingScore: 60,
    maxAttempts: 1,
    shuffle: false,
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (Number(form.passingScore) > Number(form.totalScore)) {
      return setError('Passing score cannot be greater than total score.')
    }

    setLoading(true)
    try {
      const { data } = await api.post('/exams', form)
      // After creating, go straight to add questions
      navigate(`/instructor/exams/${data.data.exam._id}/questions`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create exam.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h1 text-on-surface">Create New Exam</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Fill in the exam details. You'll add questions next.</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-error-container flex items-center gap-2">
              <FaExclamationCircle className="text-on-error-container text-[18px]" />
              <p className="text-label-md text-on-error-container">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-label-sm text-outline">Exam Title *</label>
              <input
                name="title" value={form.title} onChange={handleChange} required
                placeholder="e.g. JavaScript Fundamentals"
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-label-sm text-outline">Description</label>
              <textarea
                name="description" value={form.description} onChange={handleChange}
                placeholder="Briefly describe what this exam covers..."
                rows={3}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-label-sm text-outline">Category</label>
              <input
                name="category" value={form.category} onChange={handleChange}
                placeholder="e.g. Programming, Math, Science"
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
              />
            </div>

            {/* Numeric grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'duration',     label: 'Duration (minutes)', min: 1   },
                { name: 'totalScore',   label: 'Total Score',        min: 1   },
                { name: 'passingScore', label: 'Passing Score',      min: 0   },
                { name: 'maxAttempts',  label: 'Max Attempts',       min: 1   },
              ].map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-label-sm text-outline">{f.label}</label>
                  <input
                    type="number" name={f.name} min={f.min}
                    value={form[f.name]} onChange={handleChange} required
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Shuffle toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`relative w-11 h-6 rounded-full transition-all ${form.shuffle ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.shuffle ? 'left-6' : 'left-1'}`} />
                <input
                  type="checkbox" name="shuffle"
                  checked={form.shuffle} onChange={handleChange}
                  className="sr-only"
                />
              </div>
              <div>
                <p className="text-label-md text-on-surface">Shuffle Questions</p>
                <p className="text-label-sm text-on-surface-variant">Each student sees questions in a random order</p>
              </div>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/instructor/exams')}
                className="flex-1 py-3 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 py-3 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating...' : 'Create & Add Questions'}
                {!loading && <FaArrowRight className="text-[18px]" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

export default CreateExam
