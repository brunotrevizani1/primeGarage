const db = require("../database/connection");

function permissionMiddleware(permissionCode) {
  return async (req, res, next) => {
    try {
      if (req.user.role === "super_admin") {
        return next();
      }

      const [permissions] = await db.query(
        `
        SELECT p.code
        FROM user_permissions up
        INNER JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = ?
        AND p.code = ?
        AND up.allowed = true
        `,
        [req.user.id, permissionCode],
      );

      if (permissions.length === 0) {
        return res.status(403).json({
          mensagem: "Você não tem permissão para acessar esta funcionalidade.",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        mensagem: "Erro ao verificar permissão.",
        erro: error.message,
      });
    }
  };
}

module.exports = permissionMiddleware;
