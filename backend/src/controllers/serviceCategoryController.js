const db = require("../database/connection");

async function listCategories(req, res) {
  try {
    const businessId = req.user.business_id;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    const [categories] = await db.query(
      `
      SELECT id, name, status, created_at
      FROM service_categories
      WHERE business_id = ?
      ORDER BY name ASC
      `,
      [businessId],
    );

    res.json({
      mensagem: "Categorias listadas com sucesso.",
      categories,
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao listar categorias.",
      erro: error.message,
    });
  }
}

async function createCategory(req, res) {
  try {
    const businessId = req.user.business_id;
    const { name } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        mensagem: "Nome da categoria é obrigatório.",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO service_categories (business_id, name, status)
      VALUES (?, ?, 'active')
      `,
      [businessId, name.trim()],
    );

    res.status(201).json({
      mensagem: "Categoria criada com sucesso.",
      category: {
        id: result.insertId,
        name: name.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao criar categoria.",
      erro: error.message,
    });
  }
}

async function updateCategory(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { name, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        mensagem: "Nome da categoria é obrigatório.",
      });
    }

    await db.query(
      `
      UPDATE service_categories
      SET name = ?, status = ?
      WHERE id = ? AND business_id = ?
      `,
      [name.trim(), status || "active", id, businessId],
    );

    res.json({
      mensagem: "Categoria atualizada com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao atualizar categoria.",
      erro: error.message,
    });
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
};
