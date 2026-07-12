import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { FaArrowLeft, FaQuestionCircle, FaExclamationCircle, FaCheckCircle, FaSpinner } from 'react-icons/fa'

function EditExam() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  useEffect(() => {
    api.get(`/exams/${id}`)
      .then(res => {
        const e = res.data.data.exam
        setForm({
          title: e.title,
          description: e.description || '',
          category: e.category || '',
          duration: e.duration,
          totalScore: e.totalScore,
          passingScore: e.passingScore,
          maxAttempts: e.maxAttempts,
          shuffle: e.shuffle,
        })
      })
      .catch(() => setError('Could not load exam.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setSaving(true)

    if (Number(form.passingScore) > Number(form.totalScore)) {
      setSaving(false)
      return setError('Passing score cannot be greater than total score.')
    }

    try {
      await api.put(`/exams/${id}`, form)
      setSuccess('Exam updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="text-primary animate-spin text-[40px]" />
      </div>
    </AppLayout>
  )

  if (!form) return (
    <AppLayout>
      <p className="text-body-lg text-on-surface-variant text-center py-16">{error}</p>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate('/instructor/exams')}
            className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors">
            <FaArrowLeft className="text-[18px]" /> My Exams
          </button>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-h1 text-on-surface">Edit Exam</h1>
          <button
            onClick={() => navigate(`/instructor/exams/${id}/questions`)}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
          >
            <FaQuestionCircle className="text-[18px]" />
            Manage Questions
          </button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-error-container flex items-center gap-2">
              <FaExclamationCircle className="text-on-error-container text-[18px]" />
              <p className="text-label-md text-on-error-container">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-5 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
              <FaCheckCircle className="text-green-600 text-[18px]" />
              <p className="text-label-md text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-label-sm text-outline">Exam Title *</label>
              <input name="title" value={form.title} onChange={handleChange} required
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm text-outline">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all resize-none" />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm text-outline">Category</label>
              <input name="category" value={form.category} onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'duration',     label: 'Duration (minutes)', min: 1 },
                { name: 'totalScore',   label: 'Total Score',        min: 1 },
                { name: 'passingScore', label: 'Passing Score',      min: 0 },
                { name: 'maxAttempts',  label: 'Max Attempts',       min: 1 },
              ].map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-label-sm text-outline">{f.label}</label>
                  <input type="number" name={f.name} min={f.min} value={form[f.name]} onChange={handleChange} required
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all" />
                </div>
              ))}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-11 h-6 rounded-full transition-all ${form.shuffle ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.shuffle ? 'left-6' : 'left-1'}`} />
                <input type="checkbox" name="shuffle" checked={form.shuffle} onChange={handleChange} className="sr-only" />
              </div>
              <div>
                <p className="text-label-md text-on-surface">Shuffle Questions</p>
                <p className="text-label-sm text-on-surface-variant">Randomise order per attempt</p>
              </div>
            </label>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate('/instructor/exams')}
                className="flex-1 py-3 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:opacity-90 transition-all disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

export default EditExam
