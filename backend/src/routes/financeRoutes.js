const express = require("express");
const {
  createPayment,
  getTodayFinance,
} = require("../controllers/financeController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.post(
  "/payments",
  authMiddleware,
  permissionMiddleware("ver_financeiro"),
  createPayment,
);

router.get(
  "/today",
  authMiddleware,
  permissionMiddleware("ver_financeiro"),
  getTodayFinance,
);

module.exports = router;
