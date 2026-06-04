const express = require("express");

const {
  listCustomers,
  createCustomer,
  updateCustomer,
} = require("../controllers/customerController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("ver_cliente"),
  listCustomers,
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("editar_cliente"),
  createCustomer,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("editar_cliente"),
  updateCustomer,
);

module.exports = router;
