const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");

describe("B2 Regression: maxAttempts bypass via abandon", () => {
  const student = {
    name: "Student User",
    email: "student@example.com",
    password: "Password123!",
  };

  const instructor = {
    name: "Instructor User",
    email: "instructor@example.com",
    password: "Password123!",
  };

  let studentToken;
  let instructorToken;
  let examId;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // 1. Register student
    const studentRes = await request(app).post("/api/auth/register").send({
      name: student.name,
      email: student.email,
      password: student.password,
    });
    studentToken = studentRes.body.token;

    // 2. Register instructor
    await request(app).post("/api/auth/register").send({
      name: instructor.name,
      email: instructor.email,
      password: instructor.password,
    });

    // Make instructor an actual instructor in DB
    await User.updateOne({ email: instructor.email }, { role: "instructor" });

    // Login instructor to get token with instructor role
    const instLogin = await request(app).post("/api/auth/login").send({
      email: instructor.email,
      password: instructor.password,
    });
    instructorToken = instLogin.body.token;

    // 3. Instructor creates an exam with maxAttempts = 1
    const examRes = await request(app)
      .post("/api/exams")
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({
        title: "Test Exam maxAttempts",
        description: "Testing maxAttempts bypass",
        category: "Test",
        duration: 30,
        totalScore: 100,
        passingScore: 50,
        maxAttempts: 1, // Strict limit!
        shuffle: false,
      });
    examId = examRes.body.data.exam._id;

    // 4. Instructor publishes the exam
    await request(app)
      .patch(`/api/exams/${examId}/publish`)
      .set("Authorization", `Bearer ${instructorToken}`);
  });

  it("should prevent starting a new attempt if a previous attempt was abandoned (B2 fix)", async () => {
    // 1. Student starts the exam (Attempt 1)
    const startRes1 = await request(app)
      .post("/api/attempts/start")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ examId });

    expect(startRes1.status).toBe(201);
    const attemptId = startRes1.body.data.attempt._id;

    // 2. Student abandons the attempt
    const abandonRes = await request(app)
      .post(`/api/attempts/${attemptId}/abandon`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(abandonRes.status).toBe(200);

    // Verify status in DB
    const attemptInDb = await Attempt.findById(attemptId);
    expect(attemptInDb.status).toBe("abandoned");

    // 3. Student tries to start the exam AGAIN (Attempt 2)
    // Before B2 fix, "abandoned" wasn't counted in completedCount, so this would succeed.
    // Now, it should return 403 Forbidden.
    const startRes2 = await request(app)
      .post("/api/attempts/start")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ examId });

    expect(startRes2.status).toBe(403);
    expect(startRes2.body.message).toContain("used all allowed attempts");
  });
});
