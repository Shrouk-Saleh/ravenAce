/**
 * cheatAnalysisService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes anti-cheat violation logs for an attempt using Ollama.
 * Generates a risk score (0-100) and an explanation for the instructor.
 */

const { generateJSON } = require("./geminiService");

/**
 * Analyze cheat logs for an attempt.
 *
 * @param {object} params
 * @param {Array}  params.violations   - Array of CheatLog documents
 * @param {number} params.timeTaken    - Total time taken for the exam (seconds)
 * @param {number} params.totalQuestions
 * @param {number} params.score        - Student's final score
 * @param {number} params.passingScore
 * @returns {Promise<{riskScore, explanation, evidence, recommendation}>}
 */
async function analyzeCheatLogs({ violations, timeTaken, totalQuestions, score, passingScore }) {
  if (!violations || violations.length === 0) {
    return {
      riskScore: 0,
      explanation: "No violations were detected during this exam attempt.",
      evidence: [],
      recommendation: "No action required.",
    };
  }

  // Summarize the violations
  const violationSummary = {};
  for (const v of violations) {
    violationSummary[v.eventType] = (violationSummary[v.eventType] || 0) + 1;
  }

  const violationList = Object.entries(violationSummary)
    .map(([type, count]) => `${type}: ${count} time(s)`)
    .join(", ");

  const timeMinutes = Math.round(timeTaken / 60);
  const passed = score >= passingScore;

  const prompt = `You are an academic integrity analyst. Analyze these anti-cheat violation logs from an online exam.

EXAM STATISTICS:
- Total questions: ${totalQuestions}
- Time taken: ${timeMinutes} minutes
- Score: ${score} (passing score: ${passingScore}) — Student ${passed ? "PASSED" : "FAILED"}

VIOLATIONS DETECTED:
${violationList}
Total violations: ${violations.length}

Violation types explained:
- tab_switch: Student switched to another browser tab or window
- window_blur: Student's browser window lost focus
- copy_paste: Student attempted to paste text
- fullscreen_exit: Student exited fullscreen/exam mode
- right_click: Student attempted to right-click

Analyze whether these violations suggest academic dishonesty or could be innocent behavior.
Consider: frequency, timing, whether the student passed, and combination of violations.

Respond with ONLY a JSON object:
{
  "riskScore": <integer 0-100, where 0=no risk, 100=certain cheating>,
  "explanation": "<2-3 sentence explanation of your assessment>",
  "evidence": ["<specific evidence point 1>", "<specific evidence point 2>"],
  "recommendation": "<one of: No action required | Monitor closely | Review attempt | Flag for investigation | Invalidate attempt>"
}`;

  const result = await generateJSON(prompt);

  return {
    riskScore: Math.min(100, Math.max(0, Number(result.riskScore) || 0)),
    explanation: result.explanation || "Analysis complete.",
    evidence: Array.isArray(result.evidence) ? result.evidence : [],
    recommendation: result.recommendation || "No action required.",
  };
}

module.exports = { analyzeCheatLogs };
