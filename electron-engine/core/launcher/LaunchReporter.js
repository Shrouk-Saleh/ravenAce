// ─────────────────────────────────────────────────────────────────────────────
// core/launcher/LaunchReporter.js — Reports Launch Results Back to React
// ─────────────────────────────────────────────────────────────────────────────
//
// After the Electron engine validates (or fails to validate) the one-time
// token, it needs to tell the React web app what happened.
//
// MECHANISM: HTTP callback to a local endpoint.
// ──────────────────────────────────────────────────────────────────────────
// The React app opens a short-lived listener (via a state polling approach)
// that checks the launch result. The Electron app stores its result in the
// backend via a dedicated endpoint, and React polls for it.
//
// Alternative considered: localStorage sharing, WebSocket, BroadcastChannel.
// HTTP via backend was chosen because:
//   - It works cross-process (Electron ↔ Browser are separate processes)
//   - It's reliable and doesn't depend on browser APIs
//   - The backend already exists and handles CORS
//   - It reuses the existing auth infrastructure
// ─────────────────────────────────────────────────────────────────────────────

const { LAUNCH_RESULTS } = require('../../shared/constants');

class LaunchReporter {
  /**
   * @param {Object} httpClient - Injected HttpClient instance for API calls
   */
  constructor(httpClient) {
    this._httpClient = httpClient;
    this._reported = false;
  }

  /**
   * Report the launch result.
   * Called once — subsequent calls are ignored.
   *
   * @param {import('../../shared/types').LaunchResult} result
   * @returns {Promise<void>}
   */
  async report(result) {
    if (this._reported) return;
    this._reported = true;

    const { status, message, attemptId } = result;

    // Validate the status is a known value
    if (!Object.values(LAUNCH_RESULTS).includes(status)) {
      console.error(`[LaunchReporter] Unknown launch status: ${status}`);
      return;
    }

    try {
      // Notify the backend about the launch result.
      // The React frontend polls this to know if Electron launched successfully.
      await this._httpClient.post('/api/secure-session/launch-status', {
        status,
        message: message || '',
        attemptId: attemptId || null,
      });
    } catch (err) {
      // Non-fatal — the launch itself isn't affected by reporting failure.
      // React will fall back to web exam after its timeout.
      console.warn(`[LaunchReporter] Failed to report launch status: ${err.message}`);
    }
  }

}

module.exports = LaunchReporter;
