const express = require("express");
const { getMyBusiness } = require("../controllers/businessController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getMyBusiness);

module.exports = router;
