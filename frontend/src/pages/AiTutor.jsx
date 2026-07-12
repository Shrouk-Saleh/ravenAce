import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AppLayout from '../components/AppLayout'

function AiTutor() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Load exam info + history
  useEffect(() => {
    const init = async () => {
      try {
        const [examRes, histRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.get(`/ai/tutor/history/${examId}`),
        ])
        setExam(examRes.data.data.exam)
        const hist = histRes.data.data.messages || []
        setMessages(hist.length > 0 ? hist : [
          { role: 'assistant', content: `Hi! I'm your AI tutor for **${examRes.data.data.exam?.title}**. Ask me anything about the topic — I'll explain concepts, provide hints, and help you understand the material. What would you like to know?` }
        ])
      } catch {
        setError('Could not load the tutor. Make sure Gemini is available.')
      } finally {
        setFetching(false)
      }
    }
    init()
  }, [examId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (e) => {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setError('')

    const userMsg = { role: 'user', content: msg, _id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const { data } = await api.post('/ai/tutor/chat', { examId, message: msg })
      setMessages(prev => [...prev, { role: 'assistant', content: data.data.reply, _id: Date.now() + 1 }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ I encountered an error. Make sure Gemini API is available.',
        _id: Date.now() + 1
      }])
      setError(err.response?.data?.message || 'AI service unavailable.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history for this exam?')) return
    await api.delete(`/ai/tutor/history/${examId}`)
    setMessages([{ role: 'assistant', content: `Chat cleared! Ask me anything about **${exam?.title}**.` }])
  }

  // Simple markdown-style bold
  const renderContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    )
  }

  if (fetching) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">psychology</span>
              <h1 className="text-h1 text-on-surface">AI Tutor</h1>
            </div>
            {exam && <p className="text-body-md text-on-surface-variant mt-1">{exam.title}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={clearHistory} className="flex items-center gap-1 px-3 py-2 border border-outline-variant rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Clear
            </button>
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 px-3 py-2 border border-outline-variant rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
            </button>
          </div>
        </div>

        {/* AI Model badge */}
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-on-primary rounded-full text-label-sm">
            <span className="material-symbols-outlined text-[14px]">smart_toy</span> Powered by Gemini AI
          </span>
          <span className="text-label-sm text-on-surface-variant">Hints only — no direct exam answers</span>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-error-container flex items-center gap-2 flex-shrink-0">
            <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
            <p className="text-label-md text-on-error-container">{error}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
          {messages.map((msg, i) => (
            <div key={msg._id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <span className="material-symbols-outlined text-on-primary text-[16px]">smart_toy</span>
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-body-md leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-sm'
                  : 'bg-surface-container-lowest border border-outline-variant text-on-surface rounded-bl-sm'
              }`}>
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2">
                <span className="material-symbols-outlined text-on-primary text-[16px]">smart_toy</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-surface-container-lowest border border-outline-variant rounded-bl-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay:'0ms'}}/>
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay:'150ms'}}/>
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay:'300ms'}}/>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about this topic..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-primary text-on-primary rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>

        <p className="text-label-sm text-on-surface-variant text-center mt-2 flex-shrink-0">
          Press Enter to send · The tutor will guide you but won't give direct exam answers
        </p>
      </div>
    </AppLayout>
  )
}

export default AiTutor
