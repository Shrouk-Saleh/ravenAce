/**
 * similarityUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Text similarity utilities for the plagiarism detection feature.
 * Uses TF-IDF cosine similarity — no external dependencies needed.
 */

// ── tokenize ───────────────────────────────────────────────────────────────
// Lowercase, strip punctuation, split into word tokens.
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// ── buildTFVector ──────────────────────────────────────────────────────────
// Compute term frequency for each token in the text.
function buildTFVector(tokens) {
  const freq = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }
  const total = tokens.length || 1;
  const tf = {};
  for (const [term, count] of Object.entries(freq)) {
    tf[term] = count / total;
  }
  return tf;
}

// ── cosineSimilarity ───────────────────────────────────────────────────────
/**
 * Compute cosine similarity between two text strings.
 * Returns a value in [0, 1] where 1 means identical content.
 *
 * @param {string} textA
 * @param {string} textB
 * @returns {number}
 */
function cosineSimilarity(textA, textB) {
  if (!textA || !textB) return 0;

  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const tfA = buildTFVector(tokensA);
  const tfB = buildTFVector(tokensB);

  // Union of all terms
  const allTerms = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    const a = tfA[term] || 0;
    const b = tfB[term] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ── findSimilarPairs ────────────────────────────────────────────────────────
/**
 * Given a list of {studentId, questionId, answer} objects,
 * find all pairs that exceed the similarity threshold.
 *
 * @param {Array<{studentId: string, questionId: string, answer: string}>} answers
 * @param {number} [threshold=0.85]
 * @returns {Array<{student1, student2, question, similarity, answer1, answer2}>}
 */
function findSimilarPairs(answers, threshold = 0.85) {
  const pairs = [];

  for (let i = 0; i < answers.length; i++) {
    for (let j = i + 1; j < answers.length; j++) {
      const a = answers[i];
      const b = answers[j];

      // Only compare same question
      if (a.questionId.toString() !== b.questionId.toString()) continue;
      // Don't compare to yourself
      if (a.studentId.toString() === b.studentId.toString()) continue;
      // Don't bother if either answer is too short (< 20 chars)
      if (a.answer.length < 20 || b.answer.length < 20) continue;

      const sim = cosineSimilarity(a.answer, b.answer);

      if (sim >= threshold) {
        pairs.push({
          student1: a.studentId,
          student2: b.studentId,
          question: a.questionId,
          similarity: parseFloat(sim.toFixed(4)),
          flagged: true,
          answer1: a.answer,
          answer2: b.answer,
        });
      }
    }
  }

  return pairs;
}

module.exports = { cosineSimilarity, findSimilarPairs };
