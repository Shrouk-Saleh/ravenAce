const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const CheatLog = require("../models/CheatLog");
const { MAX_VIOLATIONS, VIOLATION_TYPES } = require("../utils/constants");

// Mock background grading to avoid AI calls and long timeouts
jest.mock("../services/writtenGraderService", () => ({
  gradeWrittenAnswer: jest.fn().mockResolvedValue({ score: 10, feedback: "ok", strengths: [], weaknesses: [] })
}));
jest.mock("../services/codeGraderService", () => ({
  gradeCodeAnswer: jest.fn().mockResolvedValue({ score: 10, feedback: "ok", strengths: [], weaknesses: [], testResults: [], codeReview: "ok" })
}));

describe("B1 Regression: Anti-Cheat Auto-Submit (MAX_VIOLATIONS)", () => {
  const student = { name: "B1 Student", email: "b1student@example.com", password: "Password123!" };
  const instructor = { name: "B1 Instructor", email: "b1instructor@example.com", password: "Password123!" };

  let studentToken, instructorToken, examId, attemptId;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // 1. Setup Student
    const sRes = await request(app).post("/api/auth/register").send(student);
    studentToken = sRes.body.token;

    // 2. Setup Instructor
    await request(app).post("/api/auth/register").send(instructor);
    await User.updateOne({ email: instructor.email }, { role: "instructor" });
    const iRes = await request(app).post("/api/auth/login").send({ email: instructor.email, password: instructor.password });
    instructorToken = iRes.body.token;

    // 3. Create & Publish Exam
    const eRes = await request(app)
      .post("/api/exams")
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({
        title: "B1 Exam", category: "Test", duration: 30, totalScore: 100, passingScore: 50, maxAttempts: 3
      });
    examId = eRes.body.data.exam._id;
    await request(app).patch(`/api/exams/${examId}/publish`).set("Authorization", `Bearer ${instructorToken}`);

    // 4. Start Attempt
    const aRes = await request(app)
      .post("/api/attempts/start")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ examId });
    attemptId = aRes.body.data.attempt._id;
  });

  it(`should auto-submit attempt ONLY when violations reach MAX_VIOLATIONS (${MAX_VIOLATIONS})`, async () => {
    // We will log violations one by one
    for (let i = 1; i <= MAX_VIOLATIONS; i++) {
      const res = await request(app)
        .post(`/api/attempts/${attemptId}/cheat-event`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ eventType: VIOLATION_TYPES[0] });

      if (i < MAX_VIOLATIONS) {
        // Should NOT auto-submit yet
        expect(res.status).toBe(200);
        expect(res.body.autoSubmitted).toBe(false);
        expect(res.body.violationCount).toBe(i);
        expect(res.body.violationsLeft).toBe(MAX_VIOLATIONS - i);
        
        // Ensure DB still says "in-progress"
        const dbAttempt = await Attempt.findById(attemptId);
        expect(dbAttempt.status).toBe("in-progress");
      } else {
        // Reached MAX_VIOLATIONS! Should auto-submit
        expect(res.status).toBe(202);
        expect(res.body.autoSubmitted).toBe(true);
        expect(res.body.message).toContain("Attempt automatically submitted");
        expect(res.body.data.status).toBe("grading");
      }
    }
  });
});
