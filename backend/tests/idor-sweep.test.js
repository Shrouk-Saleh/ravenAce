const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const AiAnalysis = require("../models/AiAnalysis");

describe("Step 5: IDOR Sweep (B3 & D2 + all attempt GET routes)", () => {
  // Users
  const instructorA = { name: "Inst A", email: "insta@example.com", password: "Password123!" };
  const instructorB = { name: "Inst B", email: "instb@example.com", password: "Password123!" };
  const studentA = { name: "Stud A", email: "studa@example.com", password: "Password123!" };
  const studentB = { name: "Stud B", email: "studb@example.com", password: "Password123!" };

  let tokenInstA, tokenInstB, tokenStudA, tokenStudB;
  let examId, attemptId;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // 1. Register & Login Instructor A
    await request(app).post("/api/auth/register").send(instructorA);
    await User.updateOne({ email: instructorA.email }, { role: "instructor" });
    const resIA = await request(app).post("/api/auth/login").send({ email: instructorA.email, password: instructorA.password });
    tokenInstA = resIA.body.token;

    // 2. Register & Login Instructor B
    await request(app).post("/api/auth/register").send(instructorB);
    await User.updateOne({ email: instructorB.email }, { role: "instructor" });
    const resIB = await request(app).post("/api/auth/login").send({ email: instructorB.email, password: instructorB.password });
    tokenInstB = resIB.body.token;

    // 3. Register Student A
    const resSA = await request(app).post("/api/auth/register").send(studentA);
    tokenStudA = resSA.body.token;

    // 4. Register Student B
    const resSB = await request(app).post("/api/auth/register").send(studentB);
    tokenStudB = resSB.body.token;

    const userStudA = await User.findOne({ email: studentA.email });

    // 5. Instructor A creates & publishes an exam
    const examRes = await request(app).post("/api/exams").set("Authorization", `Bearer ${tokenInstA}`).send({
      title: "IDOR Exam A", category: "Test", duration: 30, totalScore: 100, passingScore: 50, maxAttempts: 1
    });
    examId = examRes.body.data.exam._id;
    await request(app).patch(`/api/exams/${examId}/publish`).set("Authorization", `Bearer ${tokenInstA}`);

    // 6. Student A starts an attempt
    const attemptRes = await request(app).post("/api/attempts/start").set("Authorization", `Bearer ${tokenStudA}`).send({ examId });
    attemptId = attemptRes.body.data.attempt._id;

    // Mark attempt as submitted so analysis routes can run
    await Attempt.findByIdAndUpdate(attemptId, { status: "submitted" });

    // 7. Seed dummy AiAnalysis records to avoid 404 "not found" errors 
    // so we can test the actual IDOR authorization block
    await AiAnalysis.create({ attempt: attemptId, student: userStudA._id, exam: examId, type: "performance" });
    await AiAnalysis.create({ attempt: attemptId, student: userStudA._id, exam: examId, type: "cheat" });
  });

  describe("Student Routes IDOR (Student B -> Student A's Attempt)", () => {
    
    it("GET /api/attempts/:id/status should deny access", async () => {
      const res = await request(app)
        .get(`/api/attempts/${attemptId}/status`)
        .set("Authorization", `Bearer ${tokenStudB}`);
      expect([403, 404]).toContain(res.status); // 404 is also valid if scoped to req.user._id
    });

    it("GET /api/attempts/:id should deny access", async () => {
      const res = await request(app)
        .get(`/api/attempts/${attemptId}`)
        .set("Authorization", `Bearer ${tokenStudB}`);
      expect([403, 404]).toContain(res.status);
    });

    it("GET /api/results/:id should deny access", async () => {
      const res = await request(app)
        .get(`/api/results/${attemptId}`)
        .set("Authorization", `Bearer ${tokenStudB}`);
      expect([403, 404]).toContain(res.status);
    });

    it("GET /api/ai/analyze-performance/:id (B3) should deny access", async () => {
      const res = await request(app)
        .get(`/api/ai/analyze-performance/${attemptId}`)
        .set("Authorization", `Bearer ${tokenStudB}`);
      // Must be 403 Forbidden (based on aiController logic)
      expect(res.status).toBe(403);
    });
  });

  describe("Instructor Routes IDOR (Instructor B -> Instructor A's student Attempt)", () => {

    it("GET /api/attempts/:id/violations should deny access", async () => {
      const res = await request(app)
        .get(`/api/attempts/${attemptId}/violations`)
        .set("Authorization", `Bearer ${tokenInstB}`);
      expect(res.status).toBe(403);
    });

    it("GET /api/results/attempt/:id/detail should deny access", async () => {
      const res = await request(app)
        .get(`/api/results/attempt/${attemptId}/detail`)
        .set("Authorization", `Bearer ${tokenInstB}`);
      expect(res.status).toBe(403);
    });

    it("GET /api/ai/analyze-cheat/:id (D2) should deny access", async () => {
      const res = await request(app)
        .get(`/api/ai/analyze-cheat/${attemptId}`)
        .set("Authorization", `Bearer ${tokenInstB}`);
      expect(res.status).toBe(403);
    });
  });
});
