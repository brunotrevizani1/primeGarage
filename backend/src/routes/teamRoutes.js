const express = require("express");

const {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listPermissions,
  getEmployeePermissions,
  updateEmployeePermissions,
  getMyPermissions,
  listResponsibles,
} = require("../controllers/teamController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get("/my-permissions", authMiddleware, getMyPermissions);

router.get(
  "/permissions/list",
  authMiddleware,
  permissionMiddleware(["criar_funcionario", "editar_funcionario"]),
  listPermissions,
);

router.get(
  "/responsibles",
  authMiddleware,
  permissionMiddleware("criar_atendimento"),
  listResponsibles,
);

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("ver_equipe"),
  listEmployees,
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("criar_funcionario"),
  createEmployee,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("editar_funcionario"),
  updateEmployee,
);

router.patch(
  "/:id/delete",
  authMiddleware,
  permissionMiddleware("excluir_funcionario"),
  deleteEmployee,
);

router.get(
  "/:id/permissions",
  authMiddleware,
  permissionMiddleware("editar_funcionario"),
  getEmployeePermissions,
);

router.put(
  "/:id/permissions",
  authMiddleware,
  permissionMiddleware("editar_funcionario"),
  updateEmployeePermissions,
);

module.exports = router;
