// ─────────────────────────────────────────────────────────────────────────────
// services/SessionService.js — Exam Session Validation and State
// ─────────────────────────────────────────────────────────────────────────────
//
// Validates the one-time token with the backend and stores the resulting JWT.
// Maintains the current session state (active, expired, submitted).
// ─────────────────────────────────────────────────────────────────────────────

const { SESSION_STATES, API_ENDPOINTS } = require('../shared/constants');

class SessionService {
  /**
   * @param {Object} httpClient - Injected HttpClient instance
   */
  constructor(httpClient, mainWindow) {
    this._httpClient = httpClient;
    this._mainWindow = mainWindow;
    
    /** @type {import('../shared/types').SessionData} */
    this._sessionData = {
      attemptId: null,
      examId: null,
      studentId: null,
      jwt: null,
      state: SESSION_STATES.INITIALIZING,
      expiresAt: 0,
    };
  }

  /**
   * Validate a one-time token with the backend.
   * If successful, sets the JWT on the HttpClient and stores session data.
   *
   * @param {string} token
   * @returns {Promise<{valid: boolean, reason?: string}>}
   */
  async validate(token) {
    this._setState(SESSION_STATES.VALIDATING);

    try {
      const response = await this._httpClient.post(API_ENDPOINTS.SECURE_SESSION_VALIDATE, { token });
      
      // Backend returns { status: "success", data: { valid, jwt, attemptId, ... } }
      // HttpClient.post() returns response.data (the axios wrapper), so 'response' here is the Express body
      const payload = response.data || response;
      if (!payload || !payload.valid) {
        this._setState(SESSION_STATES.ERROR);
        return { valid: false, reason: payload?.message || 'Backend rejected token.' };
      }

      // Store the session data
      this._sessionData.jwt = payload.token || payload.jwt;
      this._sessionData.attemptId = payload.attemptId;
      this._sessionData.examId = payload.examId;
      this._sessionData.studentId = payload.studentId;
      
      // Decode JWT to find actual expiration (fallback to 60 mins if unparseable)
      this._sessionData.expiresAt = this._getJwtExpiration(this._sessionData.jwt) || (Date.now() + 60 * 60 * 1000);
      
      // Configure the HTTP client to use this new JWT for all future requests
      this._httpClient.setAuthToken(this._sessionData.jwt);
      
      this._setState(SESSION_STATES.ACTIVE);
      return { valid: true };

    } catch (err) {
      this._setState(SESSION_STATES.ERROR);
      return { 
        valid: false, 
        reason: err.isNetworkError 
          ? 'Network error. Please check your connection.' 
          : err.message 
      };
    }
  }

  /**
   * Extract expiration timestamp from JWT.
   * @param {string} token
   * @returns {number|null} Unix timestamp in ms
   */
  _getJwtExpiration(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      return payload.exp ? payload.exp * 1000 : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the current session state and data.
   * @returns {import('../shared/types').SessionData}
   */
  getState() {
    return { ...this._sessionData };
  }

  /**
   * Update session state.
   * @param {string} newState - One of SESSION_STATES
   */
  _setState(newState) {
    this._sessionData.state = newState;
    if (this._mainWindow && !this._mainWindow.isDestroyed()) {
      this._mainWindow.webContents.send('raven:session:state-changed', newState);
    }
  }

  /**
   * Manually mark the session as submitted.
   */
  markSubmitted() {
    this._setState(SESSION_STATES.SUBMITTED);
  }
}

module.exports = SessionService;
