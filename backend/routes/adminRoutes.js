const express = require("express");
const {
  getAllUsers,
  updateUserRole,
  toggleUserActive,
  deleteUser,
  getAllExamsAdmin,
  deleteExamAdmin,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, authorize("admin"));

router.get("/users",                    getAllUsers);
router.patch("/users/:id/role",         updateUserRole);
router.patch("/users/:id/toggle-active",toggleUserActive);
router.delete("/users/:id",             deleteUser);

router.get("/exams",                    getAllExamsAdmin);
router.delete("/exams/:id",             deleteExamAdmin);

module.exports = router;
