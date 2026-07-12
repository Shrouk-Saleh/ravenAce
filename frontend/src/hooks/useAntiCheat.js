import { useEffect, useRef } from 'react'
import api from '../api/axios'
import { VIOLATION_TYPES } from '../utils/constants'

// How long to wait after the exam loads before activating anti-cheat.
// This prevents false positives from:
//   - browser firing visibilitychange on initial load
//   - fullscreenchange firing once when ENTERING fullscreen
//   - password managers triggering paste events on mount
const ACTIVATION_DELAY_MS = 3000

// showToast is a React state setter (setToast) from ExamInterface.
// It receives { message, type } and renders a non-blocking banner.
// Providing it as a ref-tracked callback prevents stale closures without
// re-registering event listeners.
function useAntiCheat(attemptId, onAutoSubmit, showToast) {
  // Refs so the event handlers always have the latest values
  // without needing to re-register every time they change.
  const attemptRef       = useRef(null)
  const onAutoSubmitRef  = useRef(onAutoSubmit)
  const showToastRef     = useRef(showToast)
  const activeRef        = useRef(false) // is anti-cheat actually watching yet?
  const lastViolationRef = useRef(0)

  // Keep refs in sync with latest values
  useEffect(() => { attemptRef.current = attemptId },           [attemptId])
  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit },   [onAutoSubmit])
  useEffect(() => { showToastRef.current   = showToast },       [showToast])

  useEffect(() => {
    // Don't register anything until we have a real attempt ID
    if (!attemptId) return

    // ── Fullscreen ────────────────────────────────────────────────
    // requestFullscreen() is async and fires fullscreenchange once
    // when entering fullscreen. We must NOT treat that first event
    // as a violation. We use a flag to skip the "enter" event.
    let enteringFullscreen = false

    const enterFullscreen = () => {
      if (document.fullscreenElement) return // already in fullscreen
      enteringFullscreen = true
      document.documentElement
        .requestFullscreen()
        .then(() => {
          // A short delay then turn off the skip flag so future
          // exits ARE reported as violations.
          setTimeout(() => { enteringFullscreen = false }, 500)
        })
        .catch(() => {
          enteringFullscreen = false
          // Browser blocked fullscreen (common in dev). That's fine —
          // just don't punish the student for the browser refusing.
        })
    }

    const sendViolation = async (eventType) => {
      // Never report if anti-cheat isn't active yet
      if (!activeRef.current) return
      if (!attemptRef.current) return

      const now = Date.now()
      if (now - lastViolationRef.current < 2000) return
      lastViolationRef.current = now

      try {
        const { data } = await api.post(
          `/attempts/${attemptRef.current}/cheat-event`,
          { eventType }
        )

        if (data.autoSubmitted) {
          // Show non-blocking error toast, then navigate after a brief delay
          // so the student can read the message before the page changes.
          showToastRef.current?.({ message: 'Your exam has been auto-submitted due to too many violations.', type: 'error' })
          setTimeout(() => {
            onAutoSubmitRef.current?.(data.data?.attemptId || attemptRef.current)
          }, 2000)
        } else {
          const left  = data.violationsLeft
          const total = data.maxViolations
          const msg   = `⚠️ ${formatEvent(eventType)} detected. ${left} warning${left !== 1 ? 's' : ''} remaining before auto-submit.`
          showToastRef.current?.({ message: msg, type: 'warning' })
          // Auto-dismiss the toast after 5 seconds
          setTimeout(() => showToastRef.current?.(null), 5000)
        }
      } catch (err) {
        // Silently ignore network errors — don't crash the exam
        console.warn('Anti-cheat report failed:', err.message)
      }
    }

    // ── Event handlers ────────────────────────────────────────────

    const onFullscreenChange = () => {
      // Skip the event fired when we ourselves enter fullscreen
      if (enteringFullscreen) return
      // Only report when leaving fullscreen (not entering)
      if (!document.fullscreenElement) {
        sendViolation(VIOLATION_TYPES.FULLSCREEN_EXIT)
      }
    }

    const onVisibilityChange = () => {
      // document.hidden is true when the user switches tab or minimises.
      // We only care about hiding, not when they come back.
      if (document.hidden) {
        sendViolation(VIOLATION_TYPES.TAB_SWITCH)
      }
    }

    const onBlur = () => {
      // window.onblur captures clicking entirely outside the browser window (e.g., side-by-side cheating)
      if (!activeRef.current) return
      if (!document.hidden) {
        // If it's hidden, visibilitychange already fired.
        // We only send here if it's NOT hidden but lost focus (e.g. a separate monitor or window).
        sendViolation(VIOLATION_TYPES.TAB_SWITCH)
      }
    }

    // Copy and paste: only flag if the student MANUALLY triggers them.
    // We listen on the document but guard with activeRef so browser
    // internals during load don't count.
    const onCopy = (e) => {
      if (!activeRef.current) return
      e.preventDefault()
      sendViolation(VIOLATION_TYPES.COPY)
    }

    const onPaste = (e) => {
      if (!activeRef.current) return
      e.preventDefault()
      sendViolation(VIOLATION_TYPES.PASTE)
    }

    const onContextMenu = (e) => {
      if (!activeRef.current) return
      e.preventDefault()
      sendViolation(VIOLATION_TYPES.RIGHT_CLICK)
    }

    // ── Register listeners ────────────────────────────────────────
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur',               onBlur)
    document.addEventListener('copy',             onCopy)
    document.addEventListener('paste',            onPaste)
    document.addEventListener('contextmenu',      onContextMenu)

    // Enter fullscreen immediately
    enterFullscreen()

    // Activate violation reporting after the delay.
    // This is the key fix — nothing counts before this timer fires.
    const activationTimer = setTimeout(() => {
      activeRef.current = true
    }, ACTIVATION_DELAY_MS)

    // ── Cleanup ───────────────────────────────────────────────────
    // Runs when the exam component unmounts (exam finished or navigated away)
    return () => {
      clearTimeout(activationTimer)
      activeRef.current = false

      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur',               onBlur)
      document.removeEventListener('copy',             onCopy)
      document.removeEventListener('paste',            onPaste)
      document.removeEventListener('contextmenu',      onContextMenu)

      // Exit fullscreen cleanly when exam ends
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }

  // Only re-run this effect if the attemptId changes (i.e. a new exam starts).
  // We intentionally do NOT include reportViolation or onAutoSubmit
  // because they are handled via refs — so listeners are never re-registered.
  }, [attemptId])
}

// Human-readable event name for the alert message
function formatEvent(eventType) {
  const labels = {
    [VIOLATION_TYPES.TAB_SWITCH]:      'tab switching or losing window focus',
    [VIOLATION_TYPES.FULLSCREEN_EXIT]: 'exiting fullscreen',
    [VIOLATION_TYPES.COPY]:            'copying content',
    [VIOLATION_TYPES.PASTE]:           'pasting content',
    [VIOLATION_TYPES.RIGHT_CLICK]:     'right-clicking',
  }
  return labels[eventType] || eventType
}

export default useAntiCheat
