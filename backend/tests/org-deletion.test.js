const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Organization = require("../models/Organization");

describe("Step 6: B4 Regression (Cross-tenant exam access via Org Deletion)", () => {
  const admin = { name: "Admin", email: "admin@example.com", password: "Password123!" };
  const orgOwner = { name: "Org Owner", email: "owner@example.com", password: "Password123!" };
  const instructor = { name: "Org Inst", email: "inst@example.com", password: "Password123!" };
  const publicStudent = { name: "Pub Stud", email: "stud@example.com", password: "Password123!" };

  let tokenAdmin, tokenInst, tokenStud;
  let orgOwnerId, orgId, examId;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // 1. Setup Admin
    await request(app).post("/api/auth/register").send(admin);
    await User.updateOne({ email: admin.email }, { role: "admin" });
    const resAd = await request(app).post("/api/auth/login").send({ email: admin.email, password: admin.password });
    tokenAdmin = resAd.body.token;

    // 2. Setup Org Owner (by admin changing role)
    const resOwner = await request(app).post("/api/auth/register").send(orgOwner);
    orgOwnerId = resOwner.body.data.user._id;
    // Admin makes them an org owner
    await request(app).patch(`/api/admin/users/${orgOwnerId}/role`).set("Authorization", `Bearer ${tokenAdmin}`).send({ role: "organization" });
    const orgDoc = await Organization.findOne({ owner: orgOwnerId });
    orgId = orgDoc._id;

    // 3. Setup Instructor (assign to org manually via DB for test setup)
    await request(app).post("/api/auth/register").send(instructor);
    await User.updateOne({ email: instructor.email }, { role: "instructor", organization: orgId });
    const resInst = await request(app).post("/api/auth/login").send({ email: instructor.email, password: instructor.password });
    tokenInst = resInst.body.token;

    // 4. Setup Public Student (no org)
    await request(app).post("/api/auth/register").send(publicStudent);
    const resStud = await request(app).post("/api/auth/login").send({ email: publicStudent.email, password: publicStudent.password });
    tokenStud = resStud.body.token;

    // 5. Instructor creates and publishes an exam
    const examRes = await request(app).post("/api/exams").set("Authorization", `Bearer ${tokenInst}`).send({
      title: "Private Org Exam", category: "Test", duration: 30, totalScore: 100, passingScore: 50, maxAttempts: 1
    });
    examId = examRes.body.data.exam._id;
    await request(app).patch(`/api/exams/${examId}/publish`).set("Authorization", `Bearer ${tokenInst}`);
  });

  it("should not leak org exams to public students when the org is deleted (B4)", async () => {
    // 1. Verify exam is NOT visible to public student initially
    const res1 = await request(app).get("/api/exams").set("Authorization", `Bearer ${tokenStud}`);
    expect(res1.status).toBe(200);
    const examTitles1 = res1.body.data.exams.map(e => e.title);
    expect(examTitles1).not.toContain("Private Org Exam");

    // 2. Admin deletes the organization owner (which cascades to deleting the org)
    const delRes = await request(app).delete(`/api/admin/users/${orgOwnerId}`).set("Authorization", `Bearer ${tokenAdmin}`);
    expect(delRes.status).toBe(200);

    // 3. Verify exam is STILL NOT visible to public student (should have been unpublished)
    const res2 = await request(app).get("/api/exams").set("Authorization", `Bearer ${tokenStud}`);
    expect(res2.status).toBe(200);
    const examTitles2 = res2.body.data.exams.map(e => e.title);
    
    // If the B4 bug existed, the instructor's org would become null, the exam would still be published,
    // and thus it would appear in this list for a public student.
    expect(examTitles2).not.toContain("Private Org Exam");

    // Verify it was actually unpublished
    const examInDb = await Exam.findById(examId);
    expect(examInDb.isPublished).toBe(false);
  });
});
