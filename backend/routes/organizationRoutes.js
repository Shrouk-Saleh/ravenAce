const express = require("express");
const {
  getProfile,
  updateProfile,
  uploadLogo,
  getDashboard,
  getInstructors,
  createInstructor,
  updateInstructor,
  toggleInstructorActive,
  deleteInstructor,
  resendInstructorInvite,
  getStudents,
  createStudent,
  updateStudent,
  toggleStudentActive,
  deleteStudent,
  resendStudentInvite,
} = require("../controllers/organizationController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  loadOrganization,
  requireActiveSubscription,
} = require("../middleware/orgMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// All routes require org owner authentication
router.use(protect, authorize("organization"), loadOrganization);

// ── Profile ─────────────────────────────────────────────────────
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/logo", upload.single("logo"), uploadLogo);

// ── Dashboard ───────────────────────────────────────────────────
router.get("/dashboard", getDashboard);

// ── Instructors (require active subscription) ───────────────────
router.get("/instructors", requireActiveSubscription, getInstructors);
router.post("/instructors", requireActiveSubscription, createInstructor);
router.put("/instructors/:id", requireActiveSubscription, updateInstructor);
router.patch("/instructors/:id/toggle", requireActiveSubscription, toggleInstructorActive);
router.delete("/instructors/:id", requireActiveSubscription, deleteInstructor);
router.post("/instructors/:id/resend-invite", requireActiveSubscription, resendInstructorInvite);

// ── Students (require active subscription) ──────────────────────
router.get("/students", requireActiveSubscription, getStudents);
router.post("/students", requireActiveSubscription, createStudent);
router.put("/students/:id", requireActiveSubscription, updateStudent);
router.patch("/students/:id/toggle", requireActiveSubscription, toggleStudentActive);
router.delete("/students/:id", requireActiveSubscription, deleteStudent);
router.post("/students/:id/resend-invite", requireActiveSubscription, resendStudentInvite);

module.exports = router;
