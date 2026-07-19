// ─────────────────────────────────────────────────────────────────────────────
// shared/types.js — JSDoc Type Definitions
// ─────────────────────────────────────────────────────────────────────────────
//
// These are NOT runtime types — they are JSDoc annotations used for editor
// IntelliSense and documentation. No runtime impact.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ViolationEvent
 * @property {string} timestamp     - ISO 8601 timestamp
 * @property {string} studentId     - MongoDB ObjectId string
 * @property {string} attemptId     - MongoDB ObjectId string
 * @property {string} examId        - MongoDB ObjectId string
 * @property {string} eventType     - One of VIOLATION_EVENTS values
 * @property {string} severity      - One of SEVERITY_LEVELS values
 * @property {ViolationMetadata} metadata
 */

/**
 * @typedef {Object} ViolationMetadata
 * @property {string} description       - Human-readable description
 * @property {string|null} processName  - Name of forbidden process (if applicable)
 * @property {string|null} shortcutKey  - Key combination (if applicable)
 * @property {Object} additionalInfo    - Any extra context
 */

/**
 * @typedef {Object} SessionData
 * @property {string} attemptId    - The active attempt ID
 * @property {string} examId       - The exam being taken
 * @property {string} studentId    - The student taking the exam
 * @property {string} jwt          - Short-lived JWT for API requests
 * @property {string} state        - One of SESSION_STATES values
 * @property {number} expiresAt    - Unix timestamp when session expires
 */

/**
 * @typedef {Object} ExamData
 * @property {string} _id           - Exam MongoDB ID
 * @property {string} title         - Exam title
 * @property {number} duration      - Duration in minutes
 * @property {number} totalScore    - Maximum achievable score
 * @property {number} passingScore  - Minimum passing score
 * @property {Array<QuestionData>} questions - Ordered questions
 */

/**
 * @typedef {Object} QuestionData
 * @property {string} _id           - Question MongoDB ID
 * @property {string} text          - Question text / prompt
 * @property {string} type          - 'mcq' | 'true-false' | 'written' | 'coding'
 * @property {Array<string>} options - MCQ answer options (empty for other types)
 * @property {number} [maxScore]    - Max score for written/coding
 * @property {Array<TestCase>} [testCases] - Test cases for coding questions
 */

/**
 * @typedef {Object} TestCase
 * @property {string} label          - Test case label
 * @property {string} input          - Test input
 * @property {string} expectedOutput - Expected output
 * @property {boolean} isHidden      - Whether hidden from student
 */

/**
 * @typedef {Object} SaveAnswerPayload
 * @property {string} questionId    - Question MongoDB ID
 * @property {string} [answer]      - Text answer (MCQ/TF/Written)
 * @property {string} [codeAnswer]  - Source code (Coding)
 * @property {string} [language]    - Programming language (Coding)
 */

/**
 * @typedef {Object} LaunchResult
 * @property {string} status     - One of LAUNCH_RESULTS values
 * @property {string} [message]  - Optional human-readable message
 * @property {string} [attemptId] - Set when LAUNCHED_SUCCESSFULLY
 */

/**
 * @typedef {Object} SecurityPolicyConfig
 * @property {ShortcutPolicy} shortcuts
 * @property {ProcessPolicy} processes
 * @property {HeartbeatPolicy} heartbeat
 * @property {AutoSavePolicy} autoSave
 * @property {Object<string, ViolationPolicy>} violations
 */

/**
 * @typedef {Object} ShortcutPolicy
 * @property {Array<string>} blocklist  - Shortcuts to block entirely
 * @property {Array<string>} allowlist  - Shortcuts to explicitly allow
 * @property {Array<string>} softBlock  - Shortcuts to warn about but not block
 */

/**
 * @typedef {Object} ProcessPolicy
 * @property {string} forbiddenList - Path to forbidden processes JSON file
 */

/**
 * @typedef {Object} HeartbeatPolicy
 * @property {number} intervalSeconds     - Seconds between heartbeats
 * @property {number} maxMissedBeats      - Missed beats before action
 * @property {string} actionOnFailure     - 'auto_submit' | 'warn'
 */

/**
 * @typedef {Object} AutoSavePolicy
 * @property {number} intervalSeconds       - Seconds between auto-saves
 * @property {number} retryIntervalSeconds  - Retry interval when offline
 * @property {number} maxOfflineBuffer      - Max buffered saves before flush
 */

/**
 * @typedef {Object} ViolationPolicy
 * @property {string} severity   - Default severity for this violation type
 * @property {boolean} enabled   - Whether this violation type is monitored
 */

/**
 * @typedef {Object} ForbiddenProcess
 * @property {string} name       - Process name (e.g., 'obs64.exe')
 * @property {string} platform   - 'win32' | 'darwin' | 'linux'
 * @property {string} severity   - Severity if detected
 */

module.exports = {};
// This file is for JSDoc types only — no runtime exports needed.
// Import it with: const types = require('./types') // enables IntelliSense
