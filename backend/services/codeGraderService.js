/**
 * codeGraderService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Grades coding questions by using Gemini to statically analyze the code,
 * evaluate it against the test cases, and generate a code review.
 * 
 * This completely eliminates the need for Docker/external environments.
 */

const { generateJSON } = require("./geminiService");

/**
 * Grade a coding answer.
 *
 * @param {object} params
 * @param {string} params.questionText  - The problem statement
 * @param {string} params.sourceCode    - Student's submitted source code
 * @param {string} params.language      - "python" | "javascript" | "cpp" | etc.
 * @param {Array}  params.testCases     - Question's test cases array
 * @param {number} params.maxScore      - Maximum points for this question
 * @returns {Promise<{score, feedback, strengths, weaknesses, testResults, codeReview}>}
 */
async function gradeCodeAnswer({
  questionText,
  sourceCode,
  language,
  testCases,
  maxScore,
}) {
  // Handle blank submission
  if (!sourceCode || sourceCode.trim().length === 0) {
    return {
      score: 0,
      feedback: "No code was submitted.",
      strengths: [],
      weaknesses: ["No code submitted."],
      testResults: testCases.map((tc) => ({
        label: tc.label || "",
        input: tc.input || "",
        expectedOutput: tc.expectedOutput,
        actualOutput: "",
        passed: false,
        isHidden: tc.isHidden || false,
        status: "No Submission",
        time: "0",
        memory: 0,
      })),
      codeReview: "No code was submitted for review.",
    };
  }

  // Sanitize test cases for the prompt to avoid sending MongoDB IDs
  const cleanTestCases = testCases.map((tc, idx) => ({
    label: tc.label || `Test Case ${idx + 1}`,
    input: tc.input || "",
    expectedOutput: tc.expectedOutput,
    isHidden: tc.isHidden || false,
  }));

  const prompt = `You are an expert programming instructor and code execution engine.
A student has submitted code in ${language} for the following problem:
"${questionText}"

STUDENT'S CODE:
\`\`\`${language}
${sourceCode}
\`\`\`

You need to thoroughly analyze the code and simulate running it against the following test cases.
TEST CASES:
${JSON.stringify(cleanTestCases, null, 2)}

Respond ONLY with a JSON object in this exact format. Do not use markdown blocks:
{
  "testResults": [
    {
      "label": "Test Case 1",
      "input": "...",
      "expectedOutput": "...",
      "actualOutput": "...",
      "passed": true,
      "isHidden": false,
      "status": "Accepted",
      "time": "0.1",
      "memory": 12
    }
  ],
  "codeReview": "A concise 3-5 sentence constructive code review focusing on logic, quality, and improvements.",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"]
}`;

  let resultData;
  try {
    // Generate JSON evaluation via Gemini
    resultData = await generateJSON(prompt, 2);
  } catch (err) {
    console.error("Gemini Code Evaluation Failed:", err);
    resultData = null;
  }

  // Fallback if Gemini completely fails
  if (!resultData || !resultData.testResults) {
    return {
      score: 0,
      feedback: "AI Evaluation Failed.",
      strengths: [],
      weaknesses: ["The AI grader was unable to process this code."],
      testResults: cleanTestCases.map(tc => ({
        ...tc,
        actualOutput: "AI Evaluation Error",
        passed: false,
        status: "Internal Error",
        time: "0",
        memory: 0
      })),
      codeReview: "AI failed to generate a review."
    };
  }

  const { testResults, codeReview, strengths, weaknesses } = resultData;

  // Calculate score proportionally to the test cases passed
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  const scoreFraction = totalCount > 0 ? passedCount / totalCount : 0;
  const score = Math.round(scoreFraction * maxScore);

  return {
    score,
    feedback: `${passedCount}/${totalCount} test cases passed. Score: ${score}/${maxScore}.`,
    strengths: strengths || [],
    weaknesses: weaknesses || [],
    testResults,
    codeReview: codeReview || "No code review provided.",
  };
}

module.exports = { gradeCodeAnswer };
