import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { IMAGE_BASE_URL } from '../utils/constants'

const medalColors = { 1: 'text-yellow-500', 2: 'text-gray-400', 3: 'text-amber-600' }

function Leaderboard() {
  const { examId } = useParams()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/leaderboard/${examId}`)
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [examId])

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  const { exam, leaderboard, currentUser } = data || {}

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
          <Link to="/exams" className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Exams
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-h1 text-on-surface">Leaderboard</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{exam?.title}</p>
        </div>

        {/* Top 3 podium */}
        {leaderboard?.length >= 1 && (
          <div className="flex items-end justify-center gap-4 mb-8 px-4">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, i) => {
              if (!entry) return <div key={i} className="flex-1" />
              const isFirst = entry.rank === 1
              return (
                <div key={entry.rank}
                  className={`flex-1 flex flex-col items-center gap-2 rounded-xl p-4 border transition-all
                    ${entry.isCurrentUser ? 'border-primary bg-surface-container' : 'border-outline-variant bg-surface-container-lowest'}
                    ${isFirst ? 'pb-8 scale-105' : ''}`}>
                  <div className={`w-12 h-12 rounded-full bg-primary-container flex items-center justify-center`}>
                    {entry.profilePhoto
                      ? <img src={entry.profilePhoto.startsWith('http') ? entry.profilePhoto : `http://localhost:5000${entry.profilePhoto}`} className="w-12 h-12 rounded-full object-cover" alt="" />
                      : <span className="material-symbols-outlined text-on-primary-container text-[22px]">person</span>
                    }
                  </div>
                  <span className={`material-symbols-outlined text-[28px] ${medalColors[entry.rank] || 'text-outline'}`}>
                    {entry.rank <= 3 ? 'emoji_events' : 'circle'}
                  </span>
                  <p className="text-label-md text-on-surface font-bold text-center">{entry.name}</p>
                  <p className="text-h2 text-primary">{entry.score}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {Math.floor(entry.timeTaken/60)}m {entry.timeTaken%60}s
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Full table */}
        {leaderboard?.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined text-outline text-[48px] mb-3 block">leaderboard</span>
            <p className="text-body-lg text-on-surface-variant">No passing scores yet.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="divide-y divide-outline-variant">
              {leaderboard?.map(entry => (
                <div key={entry.rank}
                  className={`flex items-center gap-4 px-5 py-4 transition-all
                    ${entry.isCurrentUser ? 'bg-surface-container border-l-4 border-primary' : 'hover:bg-surface-container-low'}`}>
                  {/* Rank */}
                  <span className={`w-8 text-center font-bold text-label-md flex-shrink-0
                    ${medalColors[entry.rank] || 'text-on-surface-variant'}`}>
                    {entry.rank <= 3
                      ? <span className="material-symbols-outlined text-[20px]">emoji_events</span>
                      : `#${entry.rank}`}
                  </span>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                    {entry.profilePhoto
                      ? <img src={entry.profilePhoto.startsWith('http') ? entry.profilePhoto : `${IMAGE_BASE_URL}${entry.profilePhoto}`} className="w-9 h-9 rounded-full object-cover" alt="" />
                      : <span className="material-symbols-outlined text-on-primary-container text-[18px]">person</span>
                    }
                  </div>

                  {/* Name */}
                  <p className="flex-1 text-label-md text-on-surface font-bold">
                    {entry.name} {entry.isCurrentUser && <span className="text-primary">(You)</span>}
                  </p>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-label-md text-on-surface font-bold">{entry.score}/{exam?.totalScore}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {Math.floor(entry.timeTaken/60)}m {entry.timeTaken%60}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current user rank if outside top 50 */}
        {currentUser && currentUser.rank > 50 && (
          <div className="mt-4 p-4 border-2 border-primary rounded-xl flex items-center gap-4">
            <span className="text-label-md text-primary font-bold">Your rank: #{currentUser.rank}</span>
            <span className="text-label-md text-on-surface">{currentUser.score}/{exam?.totalScore}</span>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default Leaderboard
