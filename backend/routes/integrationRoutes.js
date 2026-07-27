const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { integrationAuth } = require("../middleware/integrationAuth");
const integrationController = require("../controllers/integrationController");

const router = express.Router();

module.exports = router;
