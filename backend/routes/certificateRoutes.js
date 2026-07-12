const express = require("express");
const {
  getMyCertificates,
  verifyCertificate,
  getCertificateById,
} = require("../controllers/certificateController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public — no token needed
router.get("/verify/:certId", verifyCertificate);

// Protected
router.use(protect);
router.get("/mine",   authorize("student"),         getMyCertificates);
router.get("/:id",                                  getCertificateById);

module.exports = router;
