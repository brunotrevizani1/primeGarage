const express = require("express");
const { getBanks, createBank, updateBank, deleteBank, getBankMovements } = require("../controllers/bankController");
const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get("/", authMiddleware, permissionMiddleware("ver_financeiro"), getBanks);
router.post("/", authMiddleware, permissionMiddleware("ver_financeiro"), createBank);
router.put("/:id", authMiddleware, permissionMiddleware("ver_financeiro"), updateBank);
router.delete("/:id", authMiddleware, permissionMiddleware("ver_financeiro"), deleteBank);
router.get("/:id/movements", authMiddleware, permissionMiddleware("ver_financeiro"), getBankMovements);

module.exports = router;
