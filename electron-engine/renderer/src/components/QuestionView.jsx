import React, { useState } from 'react';

/**
 * QuestionView Component
 * Renders the appropriate UI based on the question type.
 */
export default function QuestionView({ question, answer, onAnswerChange }) {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  if (!question) return null;

  const colors = {
    bgPrimary: '#0c1d3a',
    bgSurface: '#121f36',
    bgCard: '#1a2c4e',
    textPrimary: '#e8ecf4',
    textSecondary: '#8899b4',
    accent: '#4a9eff',
    success: '#34d399',
    error: '#f87171',
    border: 'rgba(255, 255, 255, 0.08)',
  };

  const renderContent = () => {
    switch (question.type) {
      case 'mcq':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {question.options?.map((option, idx) => {
              const isSelected = answer === option;
              return (
                <button 
                  key={idx}
                  type="button"
                  onClick={() => onAnswerChange(option)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 10,
                    border: `1.5px solid ${isSelected ? colors.accent : colors.border}`,
                    background: isSelected ? 'rgba(74,158,255,0.1)' : colors.bgSurface,
                    padding: '14px 16px',
                    textAlign: 'left',
                    color: colors.textPrimary,
                    fontSize: 14,
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 0 1px ${colors.accent}` : 'none',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    height: 20,
                    width: 20,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? colors.accent : colors.textSecondary}`,
                    transition: 'border-color 0.2s ease',
                  }}>
                    {isSelected && <div style={{ height: 10, width: 10, borderRadius: '50%', background: colors.accent }} />}
                  </div>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        );

      case 'truefalse':
        return (
          <div style={{ display: 'flex', gap: 16 }}>
            {['True', 'False'].map((option) => {
              const isSelected = answer === option;
              return (
                <button 
                  key={option}
                  type="button"
                  onClick={() => onAnswerChange(option)}
                  style={{
                    display: 'flex',
                    flex: 1,
                    cursor: 'pointer',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 10,
                    border: `1.5px solid ${isSelected ? colors.accent : colors.border}`,
                    background: isSelected ? 'rgba(74,158,255,0.1)' : colors.bgSurface,
                    padding: '14px 16px',
                    color: colors.textPrimary,
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 0 1px ${colors.accent}` : 'none',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    height: 20,
                    width: 20,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? colors.accent : colors.textSecondary}`,
                  }}>
                    {isSelected && <div style={{ height: 10, width: 10, borderRadius: '50%', background: colors.accent }} />}
                  </div>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        );

      case 'written':
        return (
          <textarea
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Type your answer here..."
            style={{
              height: 192,
              width: '100%',
              resize: 'none',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.bgSurface,
              padding: 16,
              fontSize: 14,
              color: colors.textPrimary,
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        );

      case 'coding':
        const allowedLangs = question.allowedLanguages || ['python'];
        // The answer object defaults to { code: template, language: firstAllowed }
        const ca = typeof answer === 'object' && answer !== null ? answer : { 
          code: question.codeTemplate || '', 
          language: allowedLangs[0] || 'python' 
        };

        const handleCodeChange = (newCode) => {
          onAnswerChange({ ...ca, code: newCode }, true);
        };

        const handleLangChange = (newLang) => {
          onAnswerChange({ ...ca, language: newLang }, true);
        };

        const handleRunCode = async () => {
          setIsRunning(true);
          try {
            const publicTc = question.testCases?.find(tc => !tc.isHidden);
            const input = publicTc ? publicTc.input : '';

            const res = await window.ravenAPI.runCode({
              sourceCode: ca.code,
              language: ca.language,
              stdin: input,
              timeLimit: question.timeLimit || 5,
              memoryLimit: question.memoryLimit || 128
            });
            setRunResult(res.data || res);
          } catch (err) {
            console.error('Run code error:', err);
            setRunResult({ error: err.message || 'Execution failed' });
          } finally {
            setIsRunning(false);
          }
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, textTransform: 'uppercase' }}>Language:</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {allowedLangs.map(lang => {
                  const isSelected = ca.language === lang;
                  return (
                    <button
                      key={lang}
                      onClick={() => handleLangChange(lang)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                        background: isSelected ? colors.accent : colors.bgSurface,
                        color: isSelected ? '#fff' : colors.textPrimary,
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : 'Python'}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <textarea
              value={ca.code || ''}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={`// Write your ${ca.language} code here...`}
              spellCheck="false"
              style={{
                height: 256,
                width: '100%',
                resize: 'none',
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: '#0d1117',
                padding: 16,
                fontFamily: 'monospace',
                fontSize: 14,
                color: colors.textPrimary,
                outline: 'none',
                lineHeight: 1.5
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleRunCode}
                disabled={isRunning || !ca.code?.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 8,
                  background: isRunning ? colors.bgSurface : 'rgba(52, 211, 153, 0.15)',
                  border: `1px solid ${isRunning ? colors.border : colors.success}`,
                  color: isRunning ? colors.textSecondary : colors.success,
                  cursor: isRunning || !ca.code?.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: 14
                }}
              >
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>Test with sample input</span>
            </div>

            {runResult && (
              <div style={{
                borderRadius: 8, border: `1px solid ${runResult.error ? colors.error : runResult.accepted ? colors.success : '#fbbf24'}`,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  background: runResult.error ? 'rgba(248,113,113,0.1)' : runResult.accepted ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                  color: runResult.error ? colors.error : runResult.accepted ? colors.success : '#fbbf24'
                }}>
                  {runResult.error ? '✗ Error' : runResult.accepted ? '✓ Accepted' : `✗ ${runResult.statusDescription}`}
                  {runResult.time && <span style={{ marginLeft: 8, opacity: 0.7 }}>{runResult.time}s</span>}
                </div>
                <pre style={{
                  padding: '12px 16px', margin: 0, background: '#0d1117', color: '#86efac',
                  fontSize: 13, fontFamily: 'monospace', overflowX: 'auto', maxHeight: 160
                }}>
                  {runResult.error || runResult.stdout || runResult.stderr || runResult.compileOutput || '(no output)'}
                </pre>
              </div>
            )}
            
            {question.testCases?.filter(tc => !tc.isHidden).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: colors.accent, marginBottom: 8, fontWeight: 600 }}>Public Test Cases</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {question.testCases.filter(tc => !tc.isHidden).map((tc, ti) => (
                    <div key={ti} style={{ background: colors.bgSurface, padding: 12, borderRadius: 8, fontSize: 12, fontFamily: 'monospace' }}>
                      <div style={{ color: colors.textSecondary }}>Input: <span style={{ color: colors.textPrimary }}>{tc.input || '(none)'}</span></div>
                      <div style={{ color: colors.textSecondary, marginTop: 4 }}>Expected: <span style={{ color: colors.accent }}>{tc.expectedOutput}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <p style={{ color: colors.error }}>Unknown question type: {question.type}</p>;
    }
  };

  return (
    <div>
      <div style={{ borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.bgCard, padding: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ borderRadius: 4, background: colors.bgSurface, padding: '4px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary }}>
            {question.type === 'mcq' ? 'Multiple Choice' : 
             question.type === 'truefalse' ? 'True / False' : 
             question.type === 'written' ? 'Written Answer' : 
             'Coding Challenge'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>
            {question.points} Points
          </span>
        </div>
        
        <h3 style={{ marginBottom: 24, fontSize: 18, fontWeight: 500, lineHeight: 1.6 }}>
          {question.text}
        </h3>

        {renderContent()}
      </div>
    </div>
  );
}
