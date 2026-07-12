import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaLaptop, FaMobileAlt, FaTabletAlt, FaDesktop, FaReact, FaNodeJs } from 'react-icons/fa'

function Showcase() {
  const [demoDark, setDemoDark] = useState(true)
  const [activeView, setActiveView] = useState('student') // 'student' or 'instructor'
  const [hideControls, setHideControls] = useState(false)

  // Color mappings for simulated UIs based on light/dark state
  const colors = {
    bg: demoDark ? 'bg-[#10131c]' : 'bg-[#f8f9ff]',
    surface: demoDark ? 'bg-[#1d2230]' : 'bg-[#ffffff]',
    surfaceLow: demoDark ? 'bg-[#181c28]' : 'bg-[#eff4ff]',
    surfaceLowest: demoDark ? 'bg-[#0a0d15]' : 'bg-[#ffffff]',
    text: demoDark ? 'text-[#e2e2e9]' : 'text-[#0b1c30]',
    textMuted: demoDark ? 'text-[#c3c6d7]' : 'text-[#434655]',
    border: demoDark ? 'border-[#434655]' : 'border-[#c3c6d7]',
    primary: 'bg-[#004ac6]',
    primaryText: 'text-[#004ac6]',
    primaryContainer: demoDark ? 'bg-[#204eb1]' : 'bg-[#e5eeff]',
    onPrimaryContainer: demoDark ? 'text-[#eeefff]' : 'text-[#004ac6]',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1d] via-[#101830] to-[#080b14] text-white flex flex-col relative font-sans overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Abstract Background Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Showcase Header */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Raven ACE Logo" className="w-12 h-12 object-contain filter drop-shadow-[0_2px_8px_rgba(0,74,198,0.4)]" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Raven ACE</h1>
            <span className="text-xs text-blue-400 font-semibold tracking-wider uppercase">AI Certification & Exams</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-medium text-sm rounded-lg border border-blue-500/30 transition-all active:scale-[0.98]">
            Go to App Login
          </Link>
        </div>
      </header>

      {/* Main Showcase Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col justify-center items-center z-10 relative">
        
        {/* Banner Title & Badges */}
        <div className="text-center max-w-3xl mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Online Exam & Certification <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent">System Dashboard Template</span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            A state-of-the-art examination suite with live cheat logging, Socket.io notifications, AI-powered tutoring, PDF exports, and deep analytics.
          </p>
        </div>

        {/* Device Showcase Panel */}
        <div className="w-full relative min-h-[500px] flex items-center justify-center py-6 mb-10">
          
          {/* 1. CENTRAL DESKTOP MONITOR */}
          <div className="relative z-10 w-full max-w-[760px] transform hover:scale-[1.01] transition-transform duration-500">
            {/* Monitor Screen Frame */}
            <div className="bg-slate-900 p-2.5 rounded-t-2xl border-4 border-slate-700 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden">
              
              {/* Chrome Top Bar */}
              <div className="h-7 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 text-[10px] text-slate-400">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="bg-slate-950/50 px-24 py-1 rounded border border-slate-700/50 flex items-center gap-1 select-none">
                  <span className="material-symbols-outlined text-[8px]">lock</span>
                  https://raven-ace.edu/dashboard
                </div>
                <div className="flex gap-2 items-center">
                  <span className="material-symbols-outlined text-[10px]">dark_mode</span>
                </div>
              </div>

              {/* Application UI Wrapper */}
              <div className={`${colors.bg} ${colors.text} h-[380px] flex flex-col font-sans transition-all duration-300 text-[10px]`}>
                
                {/* Simulated Header */}
                <div className={`${colors.surface} border-b ${colors.border} h-10 px-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <img src="/logo.png" className="w-5 h-5 object-contain" alt="" />
                    <span className="text-[11px] tracking-tight">Raven ACE</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`${colors.surfaceLow} px-3 py-1 rounded flex items-center gap-1.5 w-36 border ${colors.border}`}>
                      <span className="material-symbols-outlined text-[10px]">search</span>
                      <span className="text-[8px] opacity-60">Search exams...</span>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined text-[14px]">notifications</span>
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border border-white flex items-center justify-center text-[6px] text-white">3</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-[8px]">
                      JS
                    </div>
                  </div>
                </div>

                {/* Sidebar + Main content split */}
                <div className="flex-1 flex overflow-hidden">
                  
                  {/* Simulated Sidebar */}
                  <div className={`${colors.surface} border-r ${colors.border} w-28 py-3 flex flex-col justify-between`}>
                    <div className="flex flex-col gap-0.5">
                      {[
                        { icon: 'dashboard', label: 'Dashboard', active: true },
                        { icon: 'assignment', label: 'Exams' },
                        { icon: 'history', label: 'My Results' },
                        { icon: 'workspace_premium', label: 'Certificates' },
                        { icon: 'psychology', label: 'AI Tutor', special: true },
                      ].map((item) => (
                        <div key={item.label} className={`flex items-center gap-2 px-3 py-1.5 border-l-2 transition-all ${item.active ? 'border-blue-600 bg-blue-600/5 text-blue-500 font-bold' : 'border-transparent opacity-75'}`}>
                          <span className={`material-symbols-outlined text-[11px] ${item.special ? 'text-purple-500' : ''}`}>{item.icon}</span>
                          <span className="text-[8px] truncate">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between py-1 bg-black/10 rounded px-1.5">
                        <span className="text-[7px]">Dark Mode</span>
                        <div className="w-6 h-3 bg-blue-600 rounded-full relative flex items-center justify-end px-0.5">
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Core Viewport */}
                  <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                    
                    {activeView === 'student' ? (
                      <>
                        {/* Student Dashboard Content */}
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-[12px] font-bold">Welcome back, John! 👋</h4>
                            <p className="text-[8px] opacity-75">Here's your certification overview</p>
                          </div>
                          <span className={`${colors.primaryContainer} ${colors.onPrimaryContainer} text-[7px] font-semibold px-2 py-0.5 rounded`}>
                            Student Role
                          </span>
                        </div>

                        {/* Stat Cards */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Exams Available', val: '12', icon: 'assignment', color: 'text-blue-500' },
                            { label: 'Exams Passed', val: '4', icon: 'workspace_premium', color: 'text-green-500' },
                            { label: 'Time Spent', val: '2.5 hrs', icon: 'schedule', color: 'text-teal-500' },
                          ].map((c) => (
                            <div key={c.label} className={`${colors.surface} border ${colors.border} rounded p-2 flex items-center gap-1.5`}>
                              <span className={`material-symbols-outlined text-[14px] ${c.color}`}>{c.icon}</span>
                              <div>
                                <div className="text-[10px] font-bold">{c.val}</div>
                                <div className="text-[6px] opacity-60 truncate">{c.label}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Chart Area */}
                        <div className={`${colors.surface} border ${colors.border} rounded p-2`}>
                          <div className="flex justify-between items-center mb-1 text-[7px] font-bold">
                            <span>Score Analytics (Last 4 Exams)</span>
                            <span className="text-blue-500 font-semibold">Avg: 88%</span>
                          </div>
                          {/* Simulated SVG Graph */}
                          <div className="h-16 w-full relative">
                            <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#004ac6" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#004ac6" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <path d="M 0 50 Q 50 20, 100 35 T 200 15 L 200 60 L 0 60 Z" fill="url(#chart-grad)" />
                              <path d="M 0 50 Q 50 20, 100 35 T 200 15" fill="none" stroke="#004ac6" strokeWidth="1.5" />
                              <circle cx="50" cy="27" r="2.5" fill="#004ac6" />
                              <circle cx="100" cy="35" r="2.5" fill="#004ac6" />
                              <circle cx="150" cy="20" r="2.5" fill="#004ac6" />
                            </svg>
                            <div className="absolute inset-0 flex justify-between px-1 text-[5px] text-slate-400 items-end">
                              <span>Ex1: 75%</span>
                              <span>Ex2: 90%</span>
                              <span>Ex3: 82%</span>
                              <span>Ex4: 95%</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Instructor Dashboard Content */}
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-[12px] font-bold">Instructor Control Center 🛠️</h4>
                            <p className="text-[8px] opacity-75">AI generation & stats overview</p>
                          </div>
                          <span className="bg-purple-600/20 text-purple-400 text-[7px] font-semibold px-2 py-0.5 rounded border border-purple-500/20">
                            Instructor Role
                          </span>
                        </div>

                        {/* AI Question generator simulator */}
                        <div className={`${colors.surface} border ${colors.border} rounded p-3 flex flex-col gap-2`}>
                          <div className="flex items-center justify-between text-[7px] font-bold">
                            <span className="flex items-center gap-1 text-purple-400">
                              <span className="material-symbols-outlined text-[10px] animate-pulse">auto_awesome</span>
                              AI Question Generator
                            </span>
                            <span className="opacity-50">Gemini Pro API</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              readOnly 
                              value="Generate 5 medium difficulty MCQs on React Lifecycle hooks"
                              className="flex-1 bg-black/10 border border-slate-600/30 rounded px-2 py-1 text-[7px] text-slate-400 outline-none"
                            />
                            <button className="px-3 bg-purple-600 hover:bg-purple-700 text-white rounded text-[7px] font-bold flex items-center gap-0.5">
                              Generate
                            </button>
                          </div>

                          <div className="bg-black/20 p-2 rounded text-[7px] border border-slate-700/30 text-purple-300">
                            ✨ Generated Question #1: "What hook triggers cleanups when components unmount?"
                          </div>
                        </div>

                        {/* Recent submissions with exports */}
                        <div className={`${colors.surface} border ${colors.border} rounded p-2 flex flex-col gap-1.5`}>
                          <div className="flex justify-between items-center text-[7px] font-bold">
                            <span>Python Basics Exam — Attempt Log</span>
                            <div className="flex gap-1">
                              <button className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-0.5 text-[6px]">
                                <span className="material-symbols-outlined text-[8px]">download</span> Export CSV
                              </button>
                              <button className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-0.5 text-[6px]">
                                <span className="material-symbols-outlined text-[8px]">picture_as_pdf</span> Export PDF
                              </button>
                            </div>
                          </div>
                          
                          <table className="w-full text-left text-[6px]">
                            <thead>
                              <tr className="border-b border-slate-700/50 opacity-60">
                                <th className="pb-1">Student</th>
                                <th className="pb-1">Score</th>
                                <th className="pb-1">Status</th>
                                <th className="pb-1">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-slate-700/30">
                                <td className="py-1 font-semibold">David Lee</td>
                                <td className="py-1">88 / 100</td>
                                <td className="py-1 text-green-500">Passed</td>
                                <td className="py-1 text-blue-500 underline cursor-pointer">View Details</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-semibold">Emma Stone</td>
                                <td className="py-1">55 / 100</td>
                                <td className="py-1 text-red-500">Failed</td>
                                <td className="py-1 text-blue-500 underline cursor-pointer">View Details</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                  </div>
                </div>
              </div>

            </div>

            {/* Monitor Stand */}
            <div className="w-36 h-20 bg-gradient-to-b from-slate-700 to-slate-800 mx-auto relative shadow-md rounded-b flex flex-col justify-end items-center">
              <div className="w-20 h-px bg-slate-900" />
              <div className="w-48 h-3.5 bg-slate-900 rounded-full border-t border-slate-700 shadow-xl" />
            </div>
          </div>

          {/* 2. OVERLAPPING LAPTOP (Left Side) */}
          <div className="absolute left-[-2%] bottom-[5%] z-20 w-[300px] md:w-[360px] transform hover:scale-[1.03] transition-transform duration-500">
            {/* Screen */}
            <div className="bg-slate-950 p-1.5 rounded-t-xl border border-slate-700 shadow-xl">
              <div className="h-[180px] bg-slate-900 rounded overflow-hidden flex flex-col text-[7px] text-slate-300">
                {/* Screen Header */}
                <div className="h-6 bg-[#004ac6] text-white flex items-center justify-between px-2 font-bold">
                  <span className="flex items-center gap-1"><img src="/logo.png" className="w-4 h-4 object-contain" alt="" /> Raven ACE</span>
                  <span className="text-[6px] bg-white/20 px-1.5 rounded">All Exams</span>
                </div>
                {/* Catalog list */}
                <div className="flex-1 p-2 bg-[#f8f9ff] text-slate-800 flex flex-col gap-1.5 overflow-y-auto">
                  <div className="font-bold text-[8px] text-slate-900 border-b pb-1">Available Certifications</div>
                  
                  {[
                    { title: 'Python Core Essentials', cat: 'Development', dur: '45 mins', passing: '70%', status: 'Start' },
                    { title: 'React Lifecycle & Hooks', cat: 'Frontend', dur: '30 mins', passing: '80%', status: 'Start' },
                    { title: 'Database Administration SQL', cat: 'Data Science', dur: '60 mins', passing: '75%', status: 'Resume' },
                  ].map((exam, idx) => (
                    <div key={idx} className="bg-white p-2 rounded shadow-sm border border-slate-200 flex justify-between items-center hover:bg-slate-50 transition-all">
                      <div>
                        <div className="font-bold text-[7px] text-slate-900">{exam.title}</div>
                        <div className="text-[5px] text-slate-500">{exam.cat} · Duration: {exam.dur} · Passing: {exam.passing}</div>
                      </div>
                      <button className="px-2 py-0.5 bg-[#004ac6] text-white rounded font-bold text-[5px]">
                        {exam.status}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Keyboard Bottom Base */}
            <div className="relative h-3 w-[104%] -left-[2%] bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-xl border-t border-slate-600 shadow-2xl flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-950 rounded-b-sm" />
            </div>
          </div>

          {/* 3. OVERLAPPING TABLET (Right Side) */}
          <div className="absolute right-[-2%] bottom-[12%] z-20 w-[240px] md:w-[280px] transform hover:scale-[1.03] transition-transform duration-500">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-700 shadow-2xl">
              <div className="h-[280px] bg-white rounded overflow-hidden p-3 flex flex-col justify-between border border-slate-200 font-serif relative">
                
                {/* Certificate Background Ribbon Graphic */}
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

                {/* Premium Double Border Frame */}
                <div className="flex-1 bg-[#fcfbf7] border-[8px] border-[#0c1d3a] p-0.5 rounded flex flex-col justify-between items-center text-center relative select-none">
                  {/* Gold Corner Ornaments */}
                  <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-amber-600" />
                  <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-amber-600" />
                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-amber-600" />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-amber-600" />

                  {/* Outer thin border wrapper */}
                  <div className="border border-amber-600/40 w-full h-full p-2.5 flex flex-col justify-between items-center">
                           <div className="flex flex-col items-center">
                      <div className="flex flex-col items-center gap-1">
                        <img src="/logo.png" className="w-8 h-8 object-contain" alt="" />
                        <span className="text-[7px] tracking-[0.15em] font-sans font-bold text-[#0c1d3a] leading-none">RAVEN ACE</span>
                      </div>
                      <span className="text-[5.5px] tracking-[0.1em] font-sans font-bold text-amber-700 uppercase mt-1">Certificate of Achievement</span>
                    </div>

                    <div className="flex flex-col items-center my-0.5">
                      <p className="text-[5px] text-slate-500 font-serif italic">This certifies that</p>
                      <h6 className="text-[11px] font-bold font-serif text-[#0c1d3a] leading-none border-b border-slate-200 pb-0.5 px-3">Alex Smith</h6>
                      <p className="text-[5px] text-slate-500 font-serif italic mt-0.5">has successfully completed the proctored exam for</p>
                      <span className="text-[6.5px] font-sans font-bold text-[#004ac6] uppercase leading-none mt-0.5">Advanced React Engineering</span>
                    </div>

                    {/* Footer columns */}
                    <div className="w-full grid grid-cols-3 items-center pt-1 border-t border-slate-200/50">
                      
                      {/* Left: Signature */}
                      <div className="flex flex-col items-center justify-end h-full">
                        <span className="font-['Great_Vibes'] text-[10px] text-slate-800 leading-none">Benjamin</span>
                        <div className="w-10 h-px bg-slate-300 my-0.5" />
                        <span className="text-[4px] text-slate-400 font-sans uppercase">Signature</span>
                      </div>

                      {/* Center: QR Code */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-6 h-6 bg-white p-0.5 border border-slate-200 shadow-sm">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=https://verify.raven-ace.edu" className="w-full h-full object-contain" alt="" />
                        </div>
                        <div className="mt-0.5 bg-green-50 border border-green-200 text-[#15803d] flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[4.5px] font-bold uppercase">
                          VERIFIED
                        </div>
                      </div>

                      {/* Right: Raven SVG */}
                      <div className="flex flex-col items-center justify-end h-full">
                        <svg viewBox="0 0 100 100" className="w-4 h-4 text-[#0c1d3a] fill-current" xmlns="http://www.w3.org/2000/svg">
                          <path d="M78.5,35.2c-2.3-4.5-5.9-8.4-10.4-11c-2.7-1.5-5.7-2.6-8.8-3.1c-1.3-0.2-2.7-0.3-4-0.3c-1.1,0-2.2,0.1-3.3,0.2c-0.9,0.1-1.8,0.2-2.7,0.4c-4,0.7-7.9,2.4-11.2,4.9c-2.3,1.7-4.3,3.8-5.9,6.2c-1.7,2.5-2.9,5.3-3.6,8.2c-0.8,3.2-1.1,6.5-0.9,9.8c0.1,2.5,0.5,5,1.2,7.4l0.4,1.4l-1.3,0.6c-2.3,1.1-4.8,1.9-7.4,2.3c-1.4,0.2-2.8,0.3-4.2,0.3c-1.1,0-2.2-0.1-3.3-0.2L12,61.7l1.1,1.9c1.9,3.3,4.4,6.2,7.3,8.5c1.4,1.1,2.9,2.1,4.5,2.9c0.9,0.4,1.8,0.8,2.8,1.2c0.6,0.2,1.2,0.4,1.8,0.6l2.1,0.6c-0.2,0.9-0.3,1.8-0.5,2.7c-0.3,1.8-0.5,3.6-0.5,5.4l0,0.8l0.8-0.2c2.4-0.5,4.7-1.4,6.9-2.6c0.5-0.3,1.1-0.6,1.6-0.9c0.5-0.3,1-0.6,1.5-0.9c0.8-0.5,1.5-1,2.3-1.6c0.7-0.5,1.4-1.1,2-1.7c1.3-1.2,2.4-2.5,3.3-3.9l0.5-0.7l0.8,0.4c2.8,1.3,5.8,2.1,8.9,2.3c0.9,0.1,1.9,0.1,2.8,0.1c4-0.1,8-1.1,11.5-2.9c1.9-1,3.7-2.3,5.3-3.8c1.6-1.5,2.9-3.2,4-5.1C79,59.3,80.1,53.4,79.8,47.4C79.7,43.2,79.3,39.1,78.5,35.2z M49.8,27.8c0.7-0.7,1.7-1.1,2.7-1.2c1,0,2,0.2,2.8,0.7c0.8,0.5,1.4,1.3,1.7,2.2c0.3,0.9,0.3,2-0.1,2.9c-0.4,0.9-1.1,1.6-2,2c-0.9,0.4-1.9,0.5-2.9,0.2c-0.9-0.3-1.7-0.9-2.2-1.7c-0.5-0.8-0.7-1.8-0.5-2.8C49.3,29.3,49.5,28.5,49.8,27.8z" />
                        </svg>
                        <div className="w-8 h-px bg-slate-300 my-0.5" />
                        <span className="text-[4px] text-slate-400 font-sans uppercase">Certified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. OVERLAPPING MOBILE PHONE (Front-Right Overlay) */}
          <div className="absolute right-[22%] bottom-[-8%] z-30 w-[140px] md:w-[160px] transform hover:scale-[1.05] hover:rotate-1 transition-all duration-500">
            <div className="bg-slate-950 p-2.5 rounded-[22px] border-4 border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.8)] relative overflow-hidden">
              
              {/* Camera Notch */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-slate-950 rounded-full z-40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
                <div className="w-5 h-0.5 bg-slate-800 rounded" />
              </div>

              <div className="h-[210px] bg-[#10131c] rounded-[14px] overflow-hidden p-2 flex flex-col justify-between text-[7px] text-slate-300 relative select-none">
                
                {/* Live Exam Engine Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 pt-2">
                  <div className="flex items-center gap-1 font-bold text-[6px]">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    LIVE EXAM
                  </div>
                  <div className="bg-amber-600/20 text-amber-500 px-1 py-0.5 rounded font-mono font-bold text-[6px]">
                    ⏱️ 29:54
                  </div>
                </div>

                {/* Exam content question */}
                <div className="flex-1 py-2 flex flex-col gap-1.5">
                  <div className="font-bold text-[7px] text-white">Q3. Which of the following is correct about React useEffect cleanups?</div>
                  
                  <div className="flex flex-col gap-1">
                    {[
                      { text: 'It runs before component unmounts', selected: true },
                      { text: 'It only runs on the initial load', selected: false },
                      { text: 'It triggers custom browser popups', selected: false },
                    ].map((opt, oIdx) => (
                      <div key={oIdx} className={`p-1 rounded border flex items-center gap-1 transition-all ${opt.selected ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-black/10 border-slate-800 text-slate-400'}`}>
                        <div className={`w-2 h-2 rounded-full flex items-center justify-center border ${opt.selected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'}`}>
                          {opt.selected && <div className="w-1 h-1 bg-white rounded-full" />}
                        </div>
                        <span className="text-[5px] truncate">{opt.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anti-cheat real-time warning toast inside mobile screen */}
                <div className="bg-red-950/80 border border-red-500/30 rounded p-1.5 flex items-start gap-1 text-[5.5px] text-red-400">
                  <span className="material-symbols-outlined text-[8px] text-red-500 flex-shrink-0">warning</span>
                  <div className="leading-tight">
                    <span className="font-bold block">Anti-Cheat Violation!</span>
                    Tab Switch logged (1/3 allowed before auto-submit)
                  </div>
                </div>

                {/* Submit button */}
                <button className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[6px] mt-1">
                  Submit & Grade
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Tech Badges section */}
        <div className="w-full flex flex-wrap justify-center items-center gap-3 pt-6 border-t border-slate-800/80 max-w-4xl">
          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase mr-2">TECH STACK INTEGRATIONS:</span>
          {[
            { name: 'React SPA', icon: <FaReact className="text-blue-400" /> },
            { name: 'Vite Bundler', icon: <span className="text-amber-400 text-xs font-bold">V</span> },
            { name: 'Tailwind CSS', icon: <span className="text-teal-400 text-xs font-bold font-mono">T</span> },
            { name: 'Node / Express', icon: <FaNodeJs className="text-green-500" /> },
            { name: 'Socket.io', icon: <span className="text-purple-400 text-xs font-semibold">Socket</span> },
            { name: 'PDFKit Streams', icon: <span className="text-red-400 text-xs font-bold">PDF</span> },
            { name: 'Gemini AI Tutor', icon: <span className="text-blue-300 text-xs font-bold">AI</span> },
          ].map((badge) => (
            <div key={badge.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-full text-slate-300 font-semibold text-xs hover:border-slate-700 transition-colors">
              {badge.icon}
              <span>{badge.name}</span>
            </div>
          ))}
        </div>

        {/* Floating Controller Panel (hidden if hideControls is true) */}
        {!hideControls ? (
          <div className="fixed bottom-6 right-6 bg-[#1a233d]/90 border border-blue-500/30 backdrop-blur-md px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[90] flex items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Showcase Customizer</span>
              <span className="text-[9px] text-slate-400">Preview themes and views</span>
            </div>
            
            <div className="h-6 w-px bg-slate-700" />

            {/* Toggle Demo Dark Theme */}
            <button 
              onClick={() => setDemoDark(!demoDark)} 
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors ${demoDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'}`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {demoDark ? 'dark_mode' : 'light_mode'}
              </span>
              <span>{demoDark ? 'Dark Mockup' : 'Light Mockup'}</span>
            </button>

            {/* Toggle Dashboard views */}
            <button 
              onClick={() => setActiveView(activeView === 'student' ? 'instructor' : 'student')} 
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border border-blue-500/30 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">
                {activeView === 'student' ? 'school' : 'admin_panel_settings'}
              </span>
              <span>{activeView === 'student' ? 'Student View' : 'Instructor View'}</span>
            </button>

            <div className="h-6 w-px bg-slate-700" />

            {/* Hide controls option (for screenshots) */}
            <button 
              onClick={() => setHideControls(true)}
              className="p-1 px-2.5 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition-colors"
              title="Click to hide controls. Refresh page to bring them back."
            >
              <span className="material-symbols-outlined text-[14px]">visibility_off</span>
              Hide Controls
            </button>
          </div>
        ) : (
          /* Small indicator to bring controls back */
          <button 
            onClick={() => setHideControls(false)}
            className="fixed bottom-4 right-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 p-2 rounded-full text-slate-500 hover:text-white z-[90] transition-all"
            title="Bring controls back"
          >
            <span className="material-symbols-outlined text-[14px]">visibility</span>
          </button>
        )}

      </main>

      {/* Showcase Footer */}
      <footer className="w-full py-6 mt-10 text-center text-xs text-slate-600 border-t border-slate-900 z-10">
        <p>© 2026 Raven ACE. Developed using React, Express, Tailwind and Google Gemini AI.</p>
      </footer>
    </div>
  )
}

export default Showcase
