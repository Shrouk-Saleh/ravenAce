// ─────────────────────────────────────────────────────────────────────────────
// core/launcher/ProtocolHandler.js — Deep Link URL Parser
// ─────────────────────────────────────────────────────────────────────────────
//
// Parses the ravenace:// deep link URL and extracts parameters.
// URL format: ravenace://start?token=<one-time-token>
//
// This module is pure parsing — no network calls, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

const { PROTOCOL_SCHEME } = require('../../shared/constants');

class ProtocolHandler {
  /**
   * Parse a deep link URL into its components.
   *
   * @param {string} rawUrl - The full deep link URL (e.g., ravenace://start?token=xxx)
   * @returns {{ valid: boolean, action: string|null, token: string|null, error: string|null }}
   */
  static parse(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { valid: false, action: null, token: null, error: 'No URL provided' };
    }

    // Normalize: some OS versions may encode the URL differently
    const url = rawUrl.trim();

    if (!url.startsWith(`${PROTOCOL_SCHEME}://`)) {
      return { valid: false, action: null, token: null, error: `Invalid protocol. Expected ${PROTOCOL_SCHEME}://` };
    }

    try {
      // URL constructor works with custom protocols
      const parsed = new URL(url);

      // Action is the "hostname" in custom protocols
      // ravenace://start?token=xxx → hostname = "start"
      const action = parsed.hostname || null;
      const token = parsed.searchParams.get('token') || null;

      if (!action) {
        return { valid: false, action: null, token: null, error: 'No action specified in URL' };
      }

      if (action !== 'start') {
        return { valid: false, action, token: null, error: `Unknown action: ${action}` };
      }

      if (!token) {
        return { valid: false, action, token: null, error: 'No token provided in URL' };
      }

      // Basic token format validation (UUIDs or hex strings)
      if (token.length < 16 || token.length > 256) {
        return { valid: false, action, token: null, error: 'Token has invalid length' };
      }

      return { valid: true, action, token, error: null };
    } catch (err) {
      return { valid: false, action: null, token: null, error: `Failed to parse URL: ${err.message}` };
    }
  }
}

module.exports = ProtocolHandler;
