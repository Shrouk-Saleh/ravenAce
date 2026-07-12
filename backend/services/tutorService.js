/**
 * tutorService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Tutor chatbot service. Uses Ollama chat API with full conversation history.
 * The tutor knows about the exam topic and acts as a helpful course assistant.
 * It provides hints and explanations but never gives direct answers to exam questions.
 */

const { chat } = require("./geminiService");

// System prompt that defines the tutor's behavior
const TUTOR_SYSTEM_PROMPT = `You are Raven ACE AI Tutor, a helpful and encouraging academic assistant.

Your role:
- Explain concepts clearly and concisely
- Answer questions about course material
- Provide hints that guide students toward understanding (never give direct exam answers)
- Encourage the student when they struggle
- Break down complex topics into simple steps
- Use examples to illustrate concepts

Rules you MUST follow:
- Never solve exam questions directly — only explain the underlying concepts
- Keep responses concise (3-6 sentences unless a longer explanation is needed)
- Be friendly, patient, and encouraging
- If asked for a direct exam answer, say: "I can't give you the answer directly, but let me help you understand the concept behind it."
- Always stay on topic related to the exam subject`;

/**
 * Send a message to the AI tutor and get a response.
 *
 * @param {object} params
 * @param {string} params.examTitle     - Title of the exam (context)
 * @param {string} params.examCategory  - Category/subject of the exam
 * @param {Array}  params.history       - Previous ChatMessage documents
 * @param {string} params.newMessage    - The student's new message
 * @returns {Promise<string>} The tutor's reply
 */
async function getTutorReply({ examTitle, examCategory, history, newMessage }) {
  // Build the messages array for Ollama /api/chat
  const messages = [
    {
      role: "system",
      content: `${TUTOR_SYSTEM_PROMPT}\n\nCurrent exam subject: "${examTitle}"${examCategory ? ` (${examCategory})` : ""}.`,
    },
  ];

  // Add conversation history (last 20 messages to stay within context window)
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add the new student message
  messages.push({ role: "user", content: newMessage });

  return chat(messages, { temperature: 0.6 });
}

module.exports = { getTutorReply };
