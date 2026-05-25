const express = require("express");

const {
  listCategories,
  createCategory,
  updateCategory,
  disableCategory,
} = require("../controllers/serviceCategoryController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware([
    "ver_categorias",
    "ver_servicos",
    "criar_atendimento",
    "editar_atendimento",
  ]),
  listCategories,
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("criar_categoria"),
  createCategory,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("editar_categoria"),
  updateCategory,
);

router.patch(
  "/:id/disable",
  authMiddleware,
  permissionMiddleware("excluir_categoria"),
  disableCategory,
);

module.exports = router;
