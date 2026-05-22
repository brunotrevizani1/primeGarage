const express = require("express");

const {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listPermissions,
  getEmployeePermissions,
  updateEmployeePermissions,
} = require("../controllers/teamController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("ver_equipe"),
  listEmployees,
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("gerenciar_equipe"),
  createEmployee,
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("gerenciar_equipe"),
  updateEmployee,
);

router.patch(
  "/:id/delete",
  authMiddleware,
  permissionMiddleware("gerenciar_equipe"),
  deleteEmployee,
);

router.get(
  "/permissions/list",
  authMiddleware,
  permissionMiddleware("alterar_permissoes"),
  listPermissions,
);

router.get(
  "/:id/permissions",
  authMiddleware,
  permissionMiddleware("alterar_permissoes"),
  getEmployeePermissions,
);

router.put(
  "/:id/permissions",
  authMiddleware,
  permissionMiddleware("alterar_permissoes"),
  updateEmployeePermissions,
);

module.exports = router;
