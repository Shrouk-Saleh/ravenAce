import React, { useState, useEffect } from 'react';
import Timer from './components/Timer';
import QuestionView from './components/QuestionView';
import WarningToast from './components/WarningToast';

export default function App() {
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sessionState, setSessionState] = useState('ACTIVE');
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    // Wait for the bootstrap script to validate the session
    const handleSessionValidated = async () => {
      try {
        const data = await window.ravenAPI.getExamData();
        setExamData(data);
        
        if (data.savedAnswers) {
          const initialAnswers = {};
          data.savedAnswers.forEach(ans => {
            if (ans.codeAnswer !== undefined) {
              initialAnswers[ans.question] = { code: ans.codeAnswer, language: ans.language || 'python' };
            } else {
              initialAnswers[ans.question] = ans.answer || '';
            }
          });
          setAnswers(initialAnswers);
        }
      } catch (err) {
        setError(err.message || 'Failed to load exam data.');
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('session-validated', handleSessionValidated);

    // Listen for security warnings from main process
    const removeWarningListener = window.ravenAPI.onSecurityWarning((warning) => {
      setWarnings(prev => [...prev, { id: Date.now(), message: warning.message }]);
      
      // Auto-clear toast after 5s
      setTimeout(() => {
        setWarnings(prev => prev.filter(w => w.id !== warning.id));
      }, 5000);
    });

    // Listen for forced submission
    const removeForceSubmitListener = window.ravenAPI.onForcedSubmit((data) => {
      setError(`Your exam has been forcefully terminated due to a security violation.`);
      setSubmitting(false); // Stop submitting state to show error
    });

    // Listen for session state changes
    const removeSessionStateListener = window.ravenAPI.onSessionStateChanged((newState) => {
      setSessionState(newState);
      if (newState === 'locked') {
        setWarnings(prev => [...prev, { id: Date.now(), message: 'Session locked by administrator' }]);
      }
    });

    return () => {
      window.removeEventListener('session-validated', handleSessionValidated);
      if (removeWarningListener) removeWarningListener();
      if (removeForceSubmitListener) removeForceSubmitListener();
      if (removeSessionStateListener) removeSessionStateListener();
    };
  }, []);

  // Calculate duration in ms
  const totalDurationMs = examData?.exam?.duration ? examData.exam.duration * 60 * 1000 : 0;
  const timeAlreadySpent = examData?.startedAt ? Date.now() - new Date(examData.startedAt).getTime() : 0;
  const initialDurationMs = Math.max(0, totalDurationMs - timeAlreadySpent);

  useEffect(() => {
    if (examData && initialDurationMs <= 0 && examData.exam?.duration) {
      // It's safe to call handleSubmit here because the dependencies ensure it only fires
      // when examData changes and duration is exhausted.
      handleSubmit('timer_end');
    }
  }, [initialDurationMs, examData]);


  const handleAnswerChange = async (questionId, value, isCode = false) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Auto-save via main process
    try {
      if (isCode) {
        await window.ravenAPI.saveAnswer({
          questionId,
          codeAnswer: value.code,
          language: value.language
        });
      } else {
        await window.ravenAPI.saveAnswer({
          questionId,
          answer: value
        });
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleSubmit = async (reason = 'manual') => {
    if (submitting) return;
    
    if (reason === 'manual' && !window.confirm('Are you sure you want to submit your exam? You cannot undo this action.')) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await window.ravenAPI.submitExam(reason);
      
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to submit exam. Please try again.');
      }

      setSubmitting(false);
      setSubmissionResult(result.data);
    } catch (err) {
      setError(err.message || 'Failed to submit exam.');
      setSubmitting(false);
    }
  };

  const clearWarning = (id) => {
    setWarnings(prev => prev.filter(w => w.id !== id));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8899b4' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#4a9eff', animation: 'spin 1s linear infinite' }}>refresh</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#f87171', marginBottom: 16 }}>error</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Exam Error</h1>
        <p style={{ color: '#8899b4', maxWidth: 400 }}>{error}</p>
        <button 
          onClick={() => window.ravenAPI.requestExit()}
          style={{ marginTop: 24, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', padding: '8px 16px', fontSize: 14, fontWeight: 500, color: '#e8ecf4', background: 'transparent', cursor: 'pointer' }}
        >
          Close Engine
        </button>
      </div>
    );
  }

  if (submitting) {
    return (
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#4a9eff', marginBottom: 16, animation: 'spin 1s linear infinite' }}>refresh</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e8ecf4' }}>Submitting Exam...</h1>
        <p style={{ color: '#8899b4', marginTop: 8 }}>Please do not close the window.</p>
      </div>
    );
  }

  if (sessionState === 'expired') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(12,29,58,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#121f36', padding: 32, borderRadius: 16, textAlign: 'center', border: '1px solid #f87171', maxWidth: 400 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#f87171', marginBottom: 16 }}>timer_off</span>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Session Expired</h2>
          <p style={{ color: '#8899b4', marginBottom: 24 }}>Your secure exam session has expired. Please return to the web portal to start a new session if allowed.</p>
          <button 
            onClick={() => window.ravenAPI.requestExit()}
            style={{ borderRadius: 8, background: '#f87171', color: '#121f36', padding: '10px 24px', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', width: '100%' }}
          >
            Exit Secure Engine
          </button>
        </div>
      </div>
    );
  }

  if (submissionResult) {
    const data = submissionResult.data || submissionResult || {};
    return (
      <div style={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: data.passed ? '#34d399' : '#f87171', marginBottom: 16 }}>
          {data.passed ? 'check_circle' : 'cancel'}
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e8ecf4', marginBottom: 16 }}>
          {data.passed ? 'Exam Passed!' : 'Exam Failed'}
        </h1>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 24, borderRadius: 12, marginBottom: 32, width: '100%', maxWidth: 400 }}>
          <p style={{ fontSize: 18, color: '#8899b4', marginBottom: 8 }}>Final Score</p>
          <p style={{ fontSize: 64, fontWeight: 800, color: data.passed ? '#34d399' : '#f87171', lineHeight: 1 }}>{data.score}</p>
          {data.penaltyApplied > 0 && (
             <p style={{ color: '#f87171', marginTop: 16, fontSize: 14, background: 'rgba(248,113,113,0.1)', padding: 8, borderRadius: 6 }}>Penalty applied for rule violations: -{data.penaltyApplied}</p>
          )}
        </div>
        <button 
          onClick={() => window.ravenAPI.requestExit()}
          style={{ borderRadius: 8, background: '#4a9eff', color: '#fff', padding: '14px 32px', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseOver={(e) => e.target.style.opacity = 0.9}
          onMouseOut={(e) => e.target.style.opacity = 1}
        >
          Exit Secure Engine
        </button>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentQuestionIndex];
  const isFirst = currentQuestionIndex === 0;
  const isLast = currentQuestionIndex === examData.questions.length - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#0c1d3a', color: '#e8ecf4', fontFamily: "'Inter', sans-serif" }}>
      <WarningToast warnings={warnings} onClearWarning={clearWarning} />

      {/* Header Area */}
      <header style={{ display: 'flex', height: 64, flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#121f36', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(74,158,255,0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: '#4a9eff' }}>shield_lock</span>
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{examData.exam?.title || 'Secure Exam'}</h1>
            <p style={{ fontSize: 12, color: '#8899b4' }}>RavenACE Engine is actively monitoring this session.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {initialDurationMs > 0 && (
            <Timer 
              initialDurationMs={initialDurationMs} 
              onExpire={() => handleSubmit('timer_end')} 
            />
          )}
          <button 
            onClick={async () => {
              if (window.confirm('Are you sure you want to exit? Your exam will be submitted and the session will close.')) {
                await handleSubmit('manual');
                window.ravenAPI.requestExit();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 8,
              border: '1px solid rgba(248,113,113,0.5)',
              padding: '6px 12px',
              fontSize: 14,
              fontWeight: 500,
              color: '#f87171',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="Submit and Exit"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Exit
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar - Question Navigator */}
        <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.08)', background: '#121f36', overflowY: 'auto', padding: 16 }}>
          <h2 style={{ marginBottom: 16, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8899b4' }}>Questions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {examData.questions?.map((q, idx) => {
              const hasAnswer = !!answers[q._id];
              const isCurrent = idx === currentQuestionIndex;
              
              return (
                <button 
                  key={q._id} 
                  onClick={() => setCurrentQuestionIndex(idx)}
                  style={{
                    display: 'flex',
                    aspectRatio: '1',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    border: `1px solid ${isCurrent ? '#4a9eff' : hasAnswer ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: isCurrent ? '#4a9eff' : hasAnswer ? 'rgba(52,211,153,0.1)' : '#1a2c4e',
                    color: isCurrent ? '#0c1d3a' : hasAnswer ? '#34d399' : '#e8ecf4',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center - Question View */}
        <section style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Question {currentQuestionIndex + 1} of {examData.questions.length}</h2>
            </div>
            
            <QuestionView 
              question={currentQuestion}
              answer={answers[currentQuestion._id]}
              onAnswerChange={(val, isCode) => handleAnswerChange(currentQuestion._id, val, isCode)}
            />
          </div>
        </section>
      </main>
      
      {/* Footer / Controls */}
      <footer style={{ display: 'flex', height: 64, flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#121f36', padding: '0 24px' }}>
        <button 
          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          disabled={isFirst}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: '#e8ecf4',
            background: 'transparent',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Previous
        </button>
        
        <div style={{ display: 'flex', gap: 12 }}>
          {isLast ? (
            <button 
              onClick={() => handleSubmit('manual')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                border: 'none',
                background: '#34d399',
                padding: '8px 24px',
                fontSize: 14,
                fontWeight: 700,
                color: '#0c1d3a',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
              Submit Exam
            </button>
          ) : (
            <button 
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                border: 'none',
                background: '#4a9eff',
                padding: '8px 24px',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
            >
              Next
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
