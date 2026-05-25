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

router.get(
  "/",
  authMiddleware,
  permissionMiddleware([
    "ver_servicos",
    "criar_atendimento",
    "editar_atendimento",
  ]),
  listServices,
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("criar_servico"),
  createService,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("editar_servico"),
  updateService,
);

router.patch(
  "/:id/disable",
  authMiddleware,
  permissionMiddleware("excluir_servico"),
  disableService,
);

module.exports = router;
