// ─────────────────────────────────────────────────────────────────────────────
// core/security/SecurityRiskEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralized risk calculator.
// Receives evidence from all monitors, updates cumulative risk score,
// handles temporal decay, and emits risk level changes.
// ─────────────────────────────────────────────────────────────────────────────

const EventEmitter = require('events');

const RISK_LEVELS = {
  NORMAL: 'Normal',         // 0 - 30
  SUSPICIOUS: 'Suspicious', // 31 - 60
  HIGH: 'High Risk',        // 61 - 80
  CRITICAL: 'Critical'      // 81 - 100
};

class SecurityRiskEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.currentScore = 0;
    this.evidenceLog = [];
    
    // Decay configuration
    this.decayEnabled = config.decayEnabled !== false; // Default true
    this.decayRate = config.decayRate || 5; // Points to remove per interval
    this.decayIntervalMs = (config.decayIntervalMinutes || 15) * 60 * 1000;
    
    this._decayTimer = null;
    if (this.decayEnabled) {
      this.startDecay();
    }
  }

  /**
   * Translates severity strings to base score increments
   */
  _severityToScore(severity) {
    switch (severity?.toLowerCase()) {
      case 'low': return 10;
      case 'medium': return 25;
      case 'high': return 50;
      case 'critical': return 100;
      default: return 0;
    }
  }

  /**
   * Determine the categorical level based on numerical score
   */
  _getRiskLevel(score) {
    if (score <= 30) return RISK_LEVELS.NORMAL;
    if (score <= 60) return RISK_LEVELS.SUSPICIOUS;
    if (score <= 80) return RISK_LEVELS.HIGH;
    return RISK_LEVELS.CRITICAL;
  }

  /**
   * Process incoming evidence from a monitor
   */
  processEvidence(evidence) {
    const previousLevel = this._getRiskLevel(this.currentScore);
    
    // Calculate score increment (Base Severity * Confidence)
    const baseScore = evidence.scoreOverride || this._severityToScore(evidence.severity);
    const confidenceMultiplier = typeof evidence.confidence === 'number' ? evidence.confidence : 1.0;
    const increment = Math.round(baseScore * confidenceMultiplier);
    
    // Update score (cap at 100)
    this.currentScore = Math.min(100, this.currentScore + increment);
    
    // Store evidence for audit
    this.evidenceLog.push({
      timestamp: Date.now(),
      ...evidence,
      appliedIncrement: increment,
      resultingScore: this.currentScore
    });

    const newLevel = this._getRiskLevel(this.currentScore);

    console.log(`[RiskEngine] +${increment} pts from ${evidence.source} (${evidence.type}). New Score: ${this.currentScore} [${newLevel}]`);

    // Emit event if the state changed or if it's a critical hit
    if (newLevel !== previousLevel || newLevel === RISK_LEVELS.CRITICAL) {
      this.emit('riskLevelChanged', {
        previousLevel,
        newLevel,
        score: this.currentScore,
        triggeringEvidence: evidence
      });
    }

    return this.currentScore;
  }

  startDecay() {
    if (this._decayTimer) clearInterval(this._decayTimer);
    
    this._decayTimer = setInterval(() => {
      if (this.currentScore > 0) {
        const previousLevel = this._getRiskLevel(this.currentScore);
        this.currentScore = Math.max(0, this.currentScore - this.decayRate);
        const newLevel = this._getRiskLevel(this.currentScore);

        console.log(`[RiskEngine] Score decayed by ${this.decayRate}. New Score: ${this.currentScore} [${newLevel}]`);

        if (newLevel !== previousLevel) {
          this.emit('riskLevelChanged', {
            previousLevel,
            newLevel,
            score: this.currentScore,
            triggeringEvidence: { type: 'temporal_decay', description: 'Risk score naturally decayed over time.' }
          });
        }
      }
    }, this.decayIntervalMs);
  }

  stopDecay() {
    if (this._decayTimer) {
      clearInterval(this._decayTimer);
      this._decayTimer = null;
    }
  }

  getCurrentState() {
    return {
      score: this.currentScore,
      level: this._getRiskLevel(this.currentScore)
    };
  }
}

module.exports = SecurityRiskEngine;
