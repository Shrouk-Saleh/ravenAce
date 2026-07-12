/**
 * performanceService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a personalized performance analysis report after exam completion.
 * Uses Ollama to analyze the per-question results and provide:
 *   - Strengths and weaknesses
 *   - Specific topics to review
 *   - Readiness for a re-attempt
 */

const { generateJSON } = require("./geminiService");

/**
 * Generate a performance analysis for an attempt.
 *
 * @param {object} params
 * @param {string} params.examTitle
 * @param {string} params.examCategory
 * @param {number} params.score
 * @param {number} params.totalScore
 * @param {number} params.passingScore
 * @param {boolean} params.passed
 * @param {number} params.timeTaken        - seconds
 * @param {number} params.totalQuestions
 * @param {Array}  params.perQuestionResult - populated perQuestionResult array
 * @returns {Promise<{summary, strengths, weaknesses, recommendations, readinessScore}>}
 */
async function generatePerformanceAnalysis({
  examTitle,
  examCategory,
  score,
  totalScore,
  passingScore,
  passed,
  timeTaken,
  totalQuestions,
  perQuestionResult,
}) {
  const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
  const timeMinutes = Math.round(timeTaken / 60);

  // Build a compact summary of wrong answers for Ollama context
  const wrongAnswers = perQuestionResult
    .filter((r) => !r.isCorrect && !r.aiGraded)
    .map((r, i) => {
      const qText = r.question?.text || `Question ${i + 1}`;
      return `- "${qText.slice(0, 80)}" (answered: "${r.studentAnswer}", correct: "${r.correctAnswer}")`;
    })
    .slice(0, 10) // Cap at 10 to keep prompt manageable
    .join("\n");

  const aiGradedSummary = perQuestionResult
    .filter((r) => r.aiGraded)
    .map((r) => `- Score: ${r.score}/${r.maxScore} — Weaknesses: ${(r.weaknesses || []).join("; ")}`)
    .join("\n");

  const prompt = `You are an educational analyst generating a personalized performance report for a student.

EXAM: "${examTitle}" (${examCategory || "General"})
RESULT: ${passed ? "PASSED" : "FAILED"}
SCORE: ${score}/${totalScore} (${percentage}%) — Passing score: ${passingScore}
TIME TAKEN: ${timeMinutes} minutes for ${totalQuestions} questions

${wrongAnswers ? `INCORRECTLY ANSWERED QUESTIONS:\n${wrongAnswers}` : "All MCQ/TF questions answered correctly."}

${aiGradedSummary ? `AI-GRADED QUESTION PERFORMANCE:\n${aiGradedSummary}` : ""}

Generate a constructive, personalized performance analysis. Be specific about what topics/concepts the student should review.

Respond with ONLY a JSON object:
{
  "summary": "<2-3 sentence personalized summary of the student's performance>",
  "strengths": ["<specific strength based on what they got right>", "<another strength>"],
  "weaknesses": ["<specific topic they struggled with>", "<another weakness>"],
  "recommendations": [
    "<specific study recommendation 1, e.g. 'Review Chapter 3 on Data Structures'>",
    "<specific recommendation 2>",
    "<specific recommendation 3>"
  ],
  "readinessScore": <integer 0-100, how ready they are for a re-attempt>
}`;

  const result = await generateJSON(prompt);

  return {
    summary: result.summary || `You scored ${percentage}% on this exam.`,
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    readinessScore: Math.min(100, Math.max(0, Number(result.readinessScore) || percentage)),
  };
}

module.exports = { generatePerformanceAnalysis };
