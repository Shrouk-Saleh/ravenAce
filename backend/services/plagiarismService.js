/**
 * plagiarismService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects suspiciously similar written answers across all student submissions
 * for an exam. Uses cosine similarity for fast detection, then Ollama to
 * generate a human-readable explanation for flagged pairs.
 */

const { findSimilarPairs } = require("../utils/similarityUtils");
const { generate } = require("./geminiService");
const Attempt = require("../models/Attempt");

/**
 * Run plagiarism detection for all written answers in an exam.
 *
 * @param {object} params
 * @param {string} params.examId     - The exam's MongoDB ObjectId
 * @param {number} [params.threshold] - Similarity threshold (0-1, default 0.85)
 * @returns {Promise<{pairs: Array, flaggedCount: number}>}
 */
async function detectPlagiarism({ examId, threshold = 0.85 }) {
  // ── 1. Fetch all completed attempts for this exam ──────────────────────
  const attempts = await Attempt.find({
    exam: examId,
    status: { $in: ["submitted", "timed-out", "auto-submitted"] },
  }).populate("savedAnswers.question", "type");

  if (attempts.length < 2) {
    return { pairs: [], flaggedCount: 0 };
  }

  // ── 2. Extract all written answers ────────────────────────────────────
  const answerPool = [];
  for (const attempt of attempts) {
    for (const sa of attempt.savedAnswers) {
      const question = sa.question;
      // Only process written-type questions
      if (!question || question.type !== "written") continue;
      if (!sa.answer || sa.answer.trim().length < 20) continue;

      answerPool.push({
        studentId: attempt.student,
        questionId: question._id,
        answer: sa.answer,
      });
    }
  }

  if (answerPool.length < 2) {
    return { pairs: [], flaggedCount: 0 };
  }

  // ── 3. Find similar pairs using cosine similarity ─────────────────────
  const rawPairs = findSimilarPairs(answerPool, threshold);

  if (rawPairs.length === 0) {
    return { pairs: [], flaggedCount: 0 };
  }

  // ── 4. Generate AI explanation for each flagged pair ──────────────────
  const pairs = [];
  for (const pair of rawPairs) {
    let aiExplanation = "";
    try {
      const prompt = `Two students submitted very similar answers (${Math.round(pair.similarity * 100)}% similar) to the same exam question.

Answer 1:
"${pair.answer1.slice(0, 400)}"

Answer 2:
"${pair.answer2.slice(0, 400)}"

In 2 sentences, explain specifically what makes these answers suspiciously similar and whether it appears to be coincidence or potential copying. Be objective and factual.`;

      aiExplanation = await generate(prompt, { temperature: 0.3 });
    } catch {
      aiExplanation = `Answers are ${Math.round(pair.similarity * 100)}% similar based on text analysis.`;
    }

    pairs.push({ ...pair, aiExplanation });
  }

  return {
    pairs,
    flaggedCount: pairs.filter((p) => p.flagged).length,
  };
}

module.exports = { detectPlagiarism };
