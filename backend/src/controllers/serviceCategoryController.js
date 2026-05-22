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
      AND status = 'active'
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

async function disableCategory(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    await connection.beginTransaction();

    const [categories] = await connection.query(
      `
      SELECT id
      FROM service_categories
      WHERE id = ? AND business_id = ?
      LIMIT 1
      `,
      [id, businessId],
    );

    if (categories.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        mensagem: "Categoria não encontrada.",
      });
    }

    await connection.query(
      `
      UPDATE service_categories
      SET status = 'inactive'
      WHERE id = ? AND business_id = ?
      `,
      [id, businessId],
    );

    await connection.query(
      `
      UPDATE services
      SET status = 'inactive'
      WHERE category_id = ? AND business_id = ?
      `,
      [id, businessId],
    );

    await connection.commit();

    res.json({
      mensagem: "Categoria excluída com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      mensagem: "Erro ao excluir categoria.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  disableCategory,
};
