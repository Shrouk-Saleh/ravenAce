// ─────────────────────────────────────────────────────────────────────────────
// services/SessionGuardian.js — Session Heartbeat and Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
//
// Periodically pings the backend to update the `lastSeen` timestamp.
// If the heartbeat fails multiple times (e.g. network lost), it triggers
// the offline behavior defined in the security policy (warn or auto_submit).
// ─────────────────────────────────────────────────────────────────────────────

const EventEmitter = require('events');
const { SESSION_STATES, API_ENDPOINTS } = require('../shared/constants');

class SessionGuardian extends EventEmitter {
  /**
   * @param {Object} httpClient
   * @param {Object} sessionService
   * @param {Object} policy - The security policy config
   */
  constructor(httpClient, sessionService, policy) {
    super();
    this._httpClient = httpClient;
    this._sessionService = sessionService;
    this._policy = policy.heartbeat;
    
    this._heartbeatTimer = null;
    this._missedBeats = 0;
  }

  /**
   * Start the heartbeat loop.
   */
  start() {
    if (this._heartbeatTimer) return;
    
    const intervalMs = (this._policy.intervalSeconds || 15) * 1000;
    
    this._heartbeatTimer = setInterval(async () => {
      await this._beat();
    }, intervalMs);

    // Immediate first beat
    this._beat();
  }

  /**
   * Stop the heartbeat loop.
   */
  stop() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  /**
   * Perform a single heartbeat ping.
   */
  async _beat() {
    const state = this._sessionService.getState();
    if (state.state !== SESSION_STATES.ACTIVE) {
      return; // Only heartbeat when active
    }

    try {
      await this._httpClient.post(API_ENDPOINTS.SECURE_SESSION_HEARTBEAT, {
        attemptId: state.attemptId
      });
      // Success — reset missed beats
      this._missedBeats = 0;
    } catch (err) {
      this._missedBeats++;
      console.warn(`[SessionGuardian] Heartbeat failed. Missed beats: ${this._missedBeats}/${this._policy.maxMissedBeats}`);
      
      if (this._missedBeats >= this._policy.maxMissedBeats) {
        this._handleHeartbeatFailure();
      }
    }
  }

  /**
   * Handle what happens when the heartbeat fails too many times.
   */
  _handleHeartbeatFailure() {
    this.stop();
    
    if (this._policy.actionOnFailure === 'auto_submit') {
      console.error('[SessionGuardian] Critical connection loss. Triggering forced submission.');
      this.emit('heartbeat_failed');
    } else {
      console.warn('[SessionGuardian] Connection lost. Showing warning to student.');
      // Would emit a warning event here.
    }
  }
}

module.exports = SessionGuardian;
