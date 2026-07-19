// ─────────────────────────────────────────────────────────────────────────────
// communication/HttpClient.js — HTTP Client for Backend Communication
// ─────────────────────────────────────────────────────────────────────────────
//
// Thin wrapper around axios configured for the RavenACE backend.
// Handles JWT injection, timeout, and error normalization.
//
// Used by all services that need to communicate with the backend.
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');
const appConfig = require('../config/appConfig.json');

class HttpClient {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl] - Override the default backend URL
   * @param {number} [options.timeout] - Override the default timeout (ms)
   */
  constructor(options = {}) {
    const envBaseUrl = process.env.RAVENACE_BACKEND_URL;
    const baseURL = (options.baseUrl || envBaseUrl || appConfig.backend.baseUrl) + appConfig.backend.apiPrefix;

    this._client = axios.create({
      baseURL,
      timeout: options.timeout || appConfig.backend.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this._jwt = null;
  }

  /**
   * Set the JWT token for authenticated requests.
   * Called after successful token validation.
   *
   * @param {string} token - The JWT token
   */
  setAuthToken(token) {
    this._jwt = token;
    this._client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear the JWT token (on session end).
   */
  clearAuthToken() {
    this._jwt = null;
    delete this._client.defaults.headers.common['Authorization'];
  }

  /**
   * Check if a JWT is currently set.
   * @returns {boolean}
   */
  hasAuthToken() {
    return !!this._jwt;
  }

  /**
   * GET request.
   * @param {string} url - Relative URL path
   * @param {Object} [config] - Axios config overrides
   * @returns {Promise<Object>} Response data
   */
  async get(url, config = {}) {
    try {
      const response = await this._client.get(url, config);
      return response.data;
    } catch (err) {
      throw this._normalizeError(err);
    }
  }

  /**
   * POST request.
   * @param {string} url - Relative URL path
   * @param {Object} [data] - Request body
   * @param {Object} [config] - Axios config overrides
   * @returns {Promise<Object>} Response data
   */
  async post(url, data = {}, config = {}) {
    try {
      const response = await this._client.post(url, data, config);
      return response.data;
    } catch (err) {
      throw this._normalizeError(err);
    }
  }

  /**
   * PATCH request.
   * @param {string} url - Relative URL path
   * @param {Object} [data] - Request body
   * @param {Object} [config] - Axios config overrides
   * @returns {Promise<Object>} Response data
   */
  async patch(url, data = {}, config = {}) {
    try {
      const response = await this._client.patch(url, data, config);
      return response.data;
    } catch (err) {
      throw this._normalizeError(err);
    }
  }

  /**
   * Normalize axios errors into a consistent format.
   * @param {Error} err
   * @returns {Error}
   * @private
   */
  _normalizeError(err) {
    if (err.response) {
      // Server responded with an error status
      const message = err.response.data?.message || `HTTP ${err.response.status}`;
      const normalized = new Error(message);
      normalized.status = err.response.status;
      normalized.data = err.response.data;
      normalized.isServerError = true;
      normalized.isNetworkError = false;
      return normalized;
    }

    if (err.request) {
      // Request was made but no response received (network error)
      const normalized = new Error('Network error — could not reach the server.');
      normalized.status = 0;
      normalized.isServerError = false;
      normalized.isNetworkError = true;
      return normalized;
    }

    // Something else went wrong
    return err;
  }
}

module.exports = HttpClient;
