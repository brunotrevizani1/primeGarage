const express = require("express");
const { getFinancialReport, getOrdersReport, getCustomersReport, getTeamReport } = require("../controllers/reportController");
const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get("/financial", authMiddleware, permissionMiddleware("ver_financeiro"), getFinancialReport);
router.get("/orders", authMiddleware, permissionMiddleware("ver_fila"), getOrdersReport);
router.get("/customers", authMiddleware, permissionMiddleware("ver_cliente"), getCustomersReport);
router.get("/team", authMiddleware, getTeamReport);

module.exports = router;
