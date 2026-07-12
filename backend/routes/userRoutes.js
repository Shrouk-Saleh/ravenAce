const express = require("express");
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// All user routes require a valid JWT — no public access
router.use(protect);

router.get("/me",  getProfile);
router.put("/me",  updateProfile);

// upload.single('photo') tells Multer to look for ONE file in the
// form-data field named 'photo'. The client must send the request as
// Content-Type: multipart/form-data (not application/json).
// Multer runs first, saves the file, then uploadProfilePhoto runs.
router.post("/me/photo", upload.single("photo"), uploadProfilePhoto);

module.exports = router;
