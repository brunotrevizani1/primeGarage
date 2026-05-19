const express = require("express");
const {
  createService,
  listServices,
  updateService,
  disableService,
} = require("../controllers/serviceController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("gerenciar_servicos"),
  createService,
);

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("gerenciar_servicos"),
  listServices,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("gerenciar_servicos"),
  updateService,
);

router.patch(
  "/:id/disable",
  authMiddleware,
  permissionMiddleware("gerenciar_servicos"),
  disableService,
);

module.exports = router;
