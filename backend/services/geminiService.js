/**
 * geminiService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the old Ollama engine with Google's Gemini API for 100x faster,
 * more accurate grading and tutoring.
 *
 * Uses native fetch to connect to the Gemini REST API.
 */

const keys = [];
if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEYS) {
  const extraKeys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
  keys.push(...extraKeys);
}
const apiKeys = [...new Set(keys)]; // remove duplicates
let currentKeyIndex = 0;

// We use gemini-2.5-flash as the default because it's insanely fast and intelligent.
// We make it a 'let' so we can fallback to 1.5-flash if we run completely out of daily quota.
let GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Helper to call the Gemini API
 */
async function geminiRequest(body, retries = 3) {
  if (apiKeys.length === 0) {
    throw new Error("No GEMINI_API_KEY or GEMINI_API_KEYS set in .env!");
  }

  let lastError;
  let keysTriedCount = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const currentKey = apiKeys[currentKeyIndex];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${currentKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        const errObj = new Error(`Gemini API Error (${response.status}): ${errText}`);
        errObj.status = response.status;
        throw errObj;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }
      return text;
    } catch (err) {
      lastError = err;

      if (err.status === 429) {
        keysTriedCount++;

        if (apiKeys.length > 1 && keysTriedCount < apiKeys.length) {
          // Rate limit reached. Rotate to the next key.
          console.warn(`[Gemini] Key ${currentKeyIndex + 1} hit quota. Rotating API key...`);
          currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
          // We have a fresh key we haven't tried yet. Retry immediately without counting against max retries.
          attempt--;
          continue;
        } else if (GEMINI_MODEL === "gemini-2.5-flash") {
          // ALL keys exhausted on 2.5-flash! Fall back to 1.5-flash
          console.warn("[Gemini] ALL API keys hit daily quota on 2.5-flash! Auto-falling back to 1.5-flash.");
          GEMINI_MODEL = "gemini-1.5-flash";
          keysTriedCount = 0; // reset keys tried count for the new model
          attempt--; // retry immediately with the new model
          continue;
        }
      }

      console.warn(`[Gemini] API request failed (attempt ${attempt + 1}):`, err.message);

      // Retry on 5xx or 429, or network errors without a status code
      if (err.status && err.status !== 429 && err.status < 500) {
        throw err; // Stop retrying on 400, 401, 403, 404
      }

      if (attempt < retries) {
        // Exponential backoff: 2s, 4s, 8s
        const delayMs = Math.pow(2, attempt) * 2000;
        console.log(`Waiting ${delayMs}ms before retrying...`);
        await new Promise(r => setTimeout(r, delayMs));
        // Reset keys tried count so we can rotate again if it fails after backoff
        keysTriedCount = 0;
      }
    }
  }

  throw lastError;
}

// ── generate ───────────────────────────────────────────────────────────────
/**
 * Single prompt generation (used by plagiarism/code grader).
 */
async function generate(prompt, opts = {}) {
  const body = {
    contents: [
      { parts: [{ text: prompt }] }
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
    }
  };
  return await geminiRequest(body);
}

// ── chat ───────────────────────────────────────────────────────────────────
/**
 * Chat history for the AI Tutor.
 * Ollama format: {role: 'user'|'assistant'|'system', content: string}
 * Gemini format: {role: 'user'|'model', parts: [{text: string}]}
 */
async function chat(messages, opts = {}) {
  // Convert Ollama history format to Gemini history format
  let systemInstruction = "";
  const geminiContents = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction += msg.content + "\n";
      continue;
    }
    geminiContents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    });
  }

  const body = {
    contents: geminiContents,
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
    }
  };

  if (systemInstruction.trim()) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction.trim() }]
    };
  }

  return await geminiRequest(body);
}

// ── generateJSON ────────────────────────────────────────────────────────────
/**
 * Like generate(), but ensures the response is parsed as a JSON object.
 * Used by the written grader, cheat analysis, etc.
 */
async function generateJSON(prompt) {
  const body = {
    contents: [
      { parts: [{ text: prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks." }] }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json" // Gemini guarantees JSON output!
    }
  };

  const text = await geminiRequest(body);
  try {
    // Gemini might still wrap it in ```json ... ``` occasionally, so clean it
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Failed to parse Gemini JSON output: " + err.message);
  }
}

// ── isAvailable ─────────────────────────────────────────────────────────────
/**
 * Checks if the API key is present and the API is reachable.
 */
async function isAvailable() {
  if (apiKeys.length === 0) return false;
  try {
    // Simple fast fetch to model endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}?key=${apiKeys[currentKeyIndex]}`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = { generate, chat, generateJSON, isAvailable, OLLAMA_MODEL: GEMINI_MODEL };
