const db = require("../database/connection");

function permissionMiddleware(requiredPermissions) {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          mensagem: "Usuário não autenticado.",
        });
      }

      if (user.role === "super_admin" || user.role === "owner") {
        return next();
      }

      const permissionsArray = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      const [permissions] = await db.query(
        `
        SELECT p.id
        FROM user_permissions up
        INNER JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = ?
        AND p.code IN (?)
        LIMIT 1
        `,
        [user.id, permissionsArray],
      );

      if (permissions.length === 0) {
        return res.status(403).json({
          mensagem: "Usuário não possui permissão para acessar este recurso.",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        mensagem: "Erro ao validar permissão.",
        erro: error.message,
      });
    }
  };
}

module.exports = permissionMiddleware;
