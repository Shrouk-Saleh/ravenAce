const express = require("express");
const {
  getNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

// read-all must come BEFORE /:id to avoid param conflict
router.patch("/read-all",      markAllRead);
router.get("/",                getNotifications);
router.patch("/:id/read",      markOneRead);
router.delete("/:id",          deleteNotification);

module.exports = router;
