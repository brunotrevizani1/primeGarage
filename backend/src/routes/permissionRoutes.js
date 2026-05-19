const express = require("express");
const { listPermissions } = require("../controllers/permissionController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, listPermissions);

module.exports = router;
