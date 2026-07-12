const express = require("express");
const {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  addToExam,
  removeFromExam,
  getQuestionStats,
} = require("../controllers/questionController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// All question routes: must be logged in AND must be an instructor.
// router.use() applies middleware to every route registered after this line.
router.use(protect, authorize("instructor"));

router.get("/",                    getAllQuestions);  // supports ?search= and ?category=
router.get("/:id/stats",           getQuestionStats);
router.post("/",                   createQuestion);
router.put("/:id",                 updateQuestion);
router.delete("/:id",              deleteQuestion);
router.post("/add-to-exam",        addToExam);
router.post("/remove-from-exam",   removeFromExam);

module.exports = router;
