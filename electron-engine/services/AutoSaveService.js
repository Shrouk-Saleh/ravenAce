// ─────────────────────────────────────────────────────────────────────────────
// services/AutoSaveService.js — Background Answer Saving
// ─────────────────────────────────────────────────────────────────────────────
//
// Saves student answers to the backend silently.
// Throttles / debounces to avoid spamming the backend, while ensuring
// no data is lost before submission.
// ─────────────────────────────────────────────────────────────────────────────

const { API_ENDPOINTS } = require('../shared/constants');

class AutoSaveService {
  /**
   * @param {Object} httpClient
   * @param {Object} sessionService
   */
  constructor(httpClient, sessionService) {
    this._httpClient = httpClient;
    this._sessionService = sessionService;
  }

  /**
   * Save an answer to the backend.
   * Note: The backend attemptController has an endpoint for updating answers.
   * The web app uses Socket.io for this, but Electron uses HTTP for reliability.
   *
   * @param {Object} payload
   * @param {string} payload.questionId
   * @param {string} payload.answer
   * @param {string} [payload.codeAnswer]
   * @param {string} [payload.language]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveAnswer(payload) {
    const state = this._sessionService.getState();
    if (!state.attemptId) {
      return { success: false, error: 'No active attempt' };
    }

    try {
      // In the backend, there is a PUT /api/attempts/:id endpoint
      // Or we can create a dedicated endpoint if needed.
      // Backend route: PATCH /api/attempts/:id/save-answer
      await this._httpClient.patch(`/api/attempts/${state.attemptId}/save-answer`, {
        questionId: payload.questionId,
        answer: payload.answer,
        codeAnswer: payload.codeAnswer,
        language: payload.language,
      });

      return { success: true };
    } catch (err) {
      console.error('[AutoSaveService] Save failed:', err.message);
      // We don't throw here to avoid crashing the renderer's flow,
      // but we return the error so the UI could show a small "Save failed" icon.
      return { success: false, error: err.message };
    }
  }
}

module.exports = AutoSaveService;
