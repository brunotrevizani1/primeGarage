const express = require("express");
const {
  createOrder,
  listTodayQueue,
  updateOrderStatus,
  updateOrder,
  getOrderById,
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

module.exports = router;
