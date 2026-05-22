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
  permissionMiddleware("gerenciar_servicos"),
  listCategories,
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("gerenciar_servicos"),
  createCategory,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("gerenciar_servicos"),
  updateCategory,
);

router.patch(
  "/:id/disable",
  authMiddleware,
  permissionMiddleware("gerenciar_servicos"),
  disableCategory,
);

module.exports = router;
