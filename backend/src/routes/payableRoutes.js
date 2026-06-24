const express = require("express");
const { getPayables, createPayable, updatePayable, deletePayable, payPayable, reopenPayable } = require("../controllers/payableController");
const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get("/", authMiddleware, permissionMiddleware("ver_financeiro"), getPayables);
router.post("/", authMiddleware, permissionMiddleware("ver_financeiro"), createPayable);
router.put("/:id", authMiddleware, permissionMiddleware("ver_financeiro"), updatePayable);
router.delete("/:id", authMiddleware, permissionMiddleware("ver_financeiro"), deletePayable);
router.put("/:id/pay", authMiddleware, permissionMiddleware("ver_financeiro"), payPayable);
router.put("/:id/reopen", authMiddleware, permissionMiddleware("ver_financeiro"), reopenPayable);

module.exports = router;
