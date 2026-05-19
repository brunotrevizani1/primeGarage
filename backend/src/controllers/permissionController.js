const db = require("../database/connection");

async function listPermissions(req, res) {
  try {
    const [permissions] = await db.query(`
      SELECT id, code, name, description
      FROM permissions
      ORDER BY name ASC
    `);

    res.json({
      mensagem: "Permissões listadas com sucesso.",
      permissions,
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao listar permissões.",
      erro: error.message,
    });
  }
}

module.exports = {
  listPermissions,
};
