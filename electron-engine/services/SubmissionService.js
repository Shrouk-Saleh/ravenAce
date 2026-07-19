// ─────────────────────────────────────────────────────────────────────────────
// services/SubmissionService.js — Secure Exam Submission
// ─────────────────────────────────────────────────────────────────────────────
//
// Handles submitting the exam securely to the backend.
// Reuses the backend's AI grading pipeline via the secure submission endpoint.
// ─────────────────────────────────────────────────────────────────────────────

const { API_ENDPOINTS, SESSION_STATES } = require('../shared/constants');

class SubmissionService {
  /**
   * @param {Object} httpClient
   * @param {Object} sessionService
   */
  constructor(httpClient, sessionService) {
    this._httpClient = httpClient;
    this._sessionService = sessionService;
  }

  /**
   * Submit the exam.
   *
   * @param {string} reason - 'manual', 'timer_end', 'forced', 'heartbeat_failed', 'auto_cheat'
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submit(reason = 'manual') {
    const state = this._sessionService.getState();
    if (!state.attemptId) {
      return { success: false, error: 'No active session to submit' };
    }

    if (state.state === SESSION_STATES.SUBMITTED) {
      return { success: true }; // Already submitted
    }

    try {
      console.log(`[SubmissionService] Submitting exam. Reason: ${reason}`);
      
      const response = await this._httpClient.post(API_ENDPOINTS.SECURE_SESSION_SUBMIT, {
        attemptId: state.attemptId,
        reason
      });

      this._sessionService.markSubmitted();
      return { success: true, data: response?.data || response };
    } catch (err) {
      console.error('[SubmissionService] Submission failed:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = SubmissionService;
