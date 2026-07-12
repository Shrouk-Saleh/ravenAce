const express = require("express");
const {
  getAllExams,
  getExamById,
  createExam,
  updateExam,
  togglePublish,
  deleteExam,
} = require("../controllers/examController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// All exam routes require login
router.use(protect);

router.get("/",            getAllExams);               // role-filtered inside controller
router.get("/:id",         getExamById);               // any logged-in user
router.post("/",           authorize("instructor"),          createExam);
router.put("/:id",         authorize("instructor"),          updateExam);
router.patch("/:id/publish", authorize("instructor"),        togglePublish);
router.delete("/:id",      authorize("instructor", "admin"), deleteExam);

module.exports = router;
