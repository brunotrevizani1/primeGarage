const express = require("express");
const {
  createPayment,
  getTodayFinance,
  getReceivables,
  reopenPayment,
  receivePayment,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} = require("../controllers/financeController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.post("/payments", authMiddleware, permissionMiddleware("ver_financeiro"), createPayment);
router.get("/today", authMiddleware, permissionMiddleware("ver_financeiro"), getTodayFinance);

router.get("/receivables", authMiddleware, permissionMiddleware("ver_financeiro"), getReceivables);
router.put("/receivables/:id/receive", authMiddleware, permissionMiddleware("ver_financeiro"), receivePayment);
router.put("/receivables/:id/reopen", authMiddleware, permissionMiddleware("ver_financeiro"), reopenPayment);

router.get("/payment-methods", authMiddleware, permissionMiddleware("ver_financeiro"), getPaymentMethods);
router.post("/payment-methods", authMiddleware, permissionMiddleware("ver_financeiro"), createPaymentMethod);
router.put("/payment-methods/:id", authMiddleware, permissionMiddleware("ver_financeiro"), updatePaymentMethod);
router.delete("/payment-methods/:id", authMiddleware, permissionMiddleware("ver_financeiro"), deletePaymentMethod);

module.exports = router;
