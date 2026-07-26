const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const emailService = require("../utils/emailService");

// Mock the email service so we don't send real emails and can capture the OTP
jest.mock("../utils/emailService", () => ({
  sendOTP: jest.fn(),
  sendInvitation: jest.fn(),
}));

describe("B5 Regression: Auth Email Case Insensitivity", () => {
  const testUser = {
    name: "Jane Doe",
    emailMixed: "Jane.Doe@Example.com",
    emailUpper: "JANE.DOE@EXAMPLE.COM",
    emailLower: "jane.doe@example.com",
    password: "Password123!",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      name: testUser.name,
      email: testUser.emailMixed,
      password: testUser.password,
    });
  });

  it("should save user email as strictly lowercase when registering with mixed case", async () => {
    // Verify in DB directly
    const savedUser = await User.findOne({ name: testUser.name });
    expect(savedUser).toBeDefined();
    expect(savedUser.email).toBe(testUser.emailLower);
  });

  it("should login successfully using uppercase email if registered with mixed case", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.emailUpper, // logging in with completely different casing
      password: testUser.password,
    });

    // Before fix B5, this would fail with 401 "Invalid email or password"
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.token).toBeDefined();
  });

  it("should verify OTP using different email casing", async () => {
    // 1. Request OTP (using original lowercased email for simplicity)
    const forgotRes = await request(app).post("/api/auth/forgot-password").send({
      email: testUser.emailLower,
    });

    expect(forgotRes.status).toBe(200);
    expect(emailService.sendOTP).toHaveBeenCalledTimes(1);

    // 2. Extract the OTP that was "emailed"
    const sentEmail = emailService.sendOTP.mock.calls[0][0];
    const sentOTP = emailService.sendOTP.mock.calls[0][1];

    expect(sentEmail).toBe(testUser.emailLower);
    expect(sentOTP).toBeDefined();

    // 3. Verify OTP using UPPERCASE email
    const verifyRes = await request(app).post("/api/auth/verify-reset-otp").send({
      email: testUser.emailUpper, // verifying with different casing
      otp: sentOTP,
    });

    // Before fix B5, this would fail with 400 "No OTP was requested for this email."
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe("success");
    expect(verifyRes.body.resetToken).toBeDefined();
  });

  it("should automatically lowercase and trim emails on profile updates (Mongoose 8 native behavior)", async () => {
    // First, login to get a token
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.emailLower,
      password: testUser.password,
    });
    const token = loginRes.body.token;

    // Send an update with spaces and mixed case
    const weirdEmail = "   WEIRD.CaSe@EXAMPLE.COM   ";
    const updateRes = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: weirdEmail });

    expect(updateRes.status).toBe(200);
    
    // Check what the API returns
    expect(updateRes.body.data.user.email).toBe("weird.case@example.com");

    // Check directly in the database to be absolutely sure
    const dbUser = await User.findById(loginRes.body.data.user._id);
    expect(dbUser.email).toBe("weird.case@example.com");
  });
});
