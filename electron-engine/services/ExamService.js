// ─────────────────────────────────────────────────────────────────────────────
// services/ExamService.js — Exam Data Fetching
// ─────────────────────────────────────────────────────────────────────────────
//
// Fetches the exam questions and initial state for the active attempt.
// Uses POST /api/attempts/start which resumes an existing in-progress attempt
// (returning populated questions), or the GET /api/attempts/:id endpoint.
// ─────────────────────────────────────────────────────────────────────────────

class ExamService {
  /**
   * @param {Object} httpClient - Injected HttpClient instance
   * @param {Object} sessionService - To get current attempt/exam ID
   */
  constructor(httpClient, sessionService) {
    this._httpClient = httpClient;
    this._sessionService = sessionService;
  }

  /**
   * Fetch the full exam data (questions, duration, etc.) for the active attempt.
   * Uses POST /api/attempts/start with the examId — if the attempt is already
   * in-progress, the backend returns the existing attempt with populated questions.
   *
   * @returns {Promise<Object>} The attempt data containing exam and questions
   */
  async getExamData() {
    const state = this._sessionService.getState();
    if (!state.attemptId || !state.examId) {
      throw new Error("No active attempt/exam ID found in session.");
    }

    try {
      // POST /api/attempts/start with examId resumes the in-progress attempt
      // and returns it with populated questions and exam data.
      const response = await this._httpClient.post('/api/attempts/start', {
        examId: state.examId
      });
      
      // Backend returns: { status, data: { attempt } }
      const attempt = response.data?.attempt || response.attempt || null;
      return attempt;
    } catch (err) {
      console.error("[ExamService] Failed to fetch exam data:", err.message);
      throw err;
    }
  }

  /**
   * Runs code snippet through AI backend execution.
   */
  async runCode(payload) {
    try {
      const response = await this._httpClient.post('/api/ai/run-code', {
        sourceCode: payload.sourceCode,
        language: payload.language,
        stdin: payload.stdin,
        timeLimit: payload.timeLimit || 5,
        memoryLimit: payload.memoryLimit || 128
      });
      return response?.data || response;
    } catch (err) {
      console.error("[ExamService] Run code failed:", err.message);
      throw err;
    }
  }
}

module.exports = ExamService;
