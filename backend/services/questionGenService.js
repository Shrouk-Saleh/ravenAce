/**
 * questionGenService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates exam questions from a topic using Ollama.
 * Can generate MCQ, True/False, and Written questions.
 * Returns questions ready to be saved to MongoDB.
 */

const { generateJSON } = require("./geminiService");

/**
 * Generate a batch of questions for a given topic.
 *
 * @param {object} params
 * @param {string} params.topic         - Topic to generate questions about
 * @param {string} [params.category]    - Exam category/subject
 * @param {string} [params.difficulty]  - "easy" | "medium" | "hard"
 * @param {number} [params.mcqCount]    - Number of MCQ questions (default 3)
 * @param {number} [params.tfCount]     - Number of True/False questions (default 2)
 * @param {number} [params.writtenCount]- Number of written questions (default 1)
 * @param {string} params.instructorId  - Instructor's MongoDB ObjectId
 * @returns {Promise<Array>} Array of question objects ready for Question.insertMany()
 */
async function generateQuestions({
  topic,
  category = "",
  difficulty = "medium",
  mcqCount = 3,
  tfCount = 2,
  writtenCount = 1,
  instructorId,
}) {
  const prompt = `You are an expert exam question writer. Generate exam questions about the following topic.

TOPIC: ${topic}
CATEGORY: ${category || topic}
DIFFICULTY: ${difficulty}

Generate exactly:
- ${mcqCount} Multiple Choice Questions (MCQ) — each with 4 options, one correct answer
- ${tfCount} True/False questions
- ${writtenCount} Written/Essay question(s) — open-ended, requires a paragraph answer

Rules:
- Questions must be clear, unambiguous, and educationally sound
- MCQ distractors (wrong answers) must be plausible but clearly incorrect
- Written questions should require explanation, not just a yes/no answer
- Vary the difficulty within the ${difficulty} range

Respond with ONLY a JSON object in this exact format:
{
  "mcq": [
    {
      "text": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctAnswer": "<exact text of correct option>",
      "explanation": "<why this is correct>",
      "tags": ["<tag1>", "<tag2>"]
    }
  ],
  "truefalse": [
    {
      "text": "<statement that is True or False>",
      "correctAnswer": "True",
      "explanation": "<why this is true/false>",
      "tags": ["<tag1>"]
    }
  ],
  "written": [
    {
      "text": "<open-ended question>",
      "modelAnswer": "<ideal comprehensive answer>",
      "gradingCriteria": "<what makes a good answer: key points to cover>",
      "tags": ["<tag1>"]
    }
  ]
}`;

  const data = await generateJSON(prompt);

  const questions = [];

  // ── Build MCQ questions ─────────────────────────────────────────────────
  for (const q of (data.mcq || []).slice(0, mcqCount)) {
    if (!q.text || !q.options || !q.correctAnswer) continue;
    questions.push({
      type: "mcq",
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      category: category || topic,
      tags: q.tags || [topic],
      difficulty,
      maxScore: 1,
      instructor: instructorId,
      aiGenerated: true,
    });
  }

  // ── Build True/False questions ──────────────────────────────────────────
  for (const q of (data.truefalse || []).slice(0, tfCount)) {
    if (!q.text || !q.correctAnswer) continue;
    const corrected = q.correctAnswer === "True" || q.correctAnswer === "False"
      ? q.correctAnswer
      : "True";
    questions.push({
      type: "truefalse",
      text: q.text,
      options: [],
      correctAnswer: corrected,
      explanation: q.explanation || "",
      category: category || topic,
      tags: q.tags || [topic],
      difficulty,
      maxScore: 1,
      instructor: instructorId,
      aiGenerated: true,
    });
  }

  // ── Build Written questions ─────────────────────────────────────────────
  for (const q of (data.written || []).slice(0, writtenCount)) {
    if (!q.text || !q.modelAnswer) continue;
    questions.push({
      type: "written",
      text: q.text,
      options: [],
      correctAnswer: "",
      modelAnswer: q.modelAnswer,
      gradingCriteria: q.gradingCriteria || "Grade based on accuracy and completeness.",
      explanation: "",
      category: category || topic,
      tags: q.tags || [topic],
      difficulty,
      maxScore: 10,
      instructor: instructorId,
      aiGenerated: true,
    });
  }

  return questions;
}

module.exports = { generateQuestions };
