const express = require("express");
const {
  createOrder,
  listTodayQueue,
  updateOrderStatus,
  updateOrder,
  getOrderById,
  applyDiscount,
  listOrders,
} = require("../controllers/orderController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("criar_atendimento"),
  createOrder,
);

router.get(
  "/today",
  authMiddleware,
  permissionMiddleware("ver_fila"),
  listTodayQueue,
);

router.get(
  "/:id",
  authMiddleware,
  permissionMiddleware("editar_atendimento"),
  getOrderById,
);

router.get("/", authMiddleware, permissionMiddleware("ver_fila"), listOrders);

router.patch(
  "/:id/status",
  authMiddleware,
  permissionMiddleware(["alterar_status", "cancelar_atendimento"]),
  updateOrderStatus,
);
router.patch(
  "/:id/status",
  authMiddleware,
  permissionMiddleware("alterar_status"),
  updateOrderStatus,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("editar_atendimento"),
  updateOrder,
);

router.patch(
  "/:id/discount",
  authMiddleware,
  permissionMiddleware("editar_atendimento"),
  applyDiscount,
);

module.exports = router;
