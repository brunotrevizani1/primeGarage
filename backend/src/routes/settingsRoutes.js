const express = require("express");

const {
  getCustomerPageSettings,
  updateCustomerPageSettings,
} = require("../controllers/settingsController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get(
  "/customer-page",
  authMiddleware,
  permissionMiddleware("gerenciar_configuracoes"),
  getCustomerPageSettings,
);

router.put(
  "/customer-page",
  authMiddleware,
  permissionMiddleware("gerenciar_configuracoes"),
  updateCustomerPageSettings,
);

module.exports = router;
