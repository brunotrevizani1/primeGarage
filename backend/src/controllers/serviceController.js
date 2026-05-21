const db = require("../database/connection");

async function createService(req, res) {
  try {
    const businessId = req.user.business_id;

    const {
      category_id,
      name,
      description,
      price,
      duration_minutes,
      image_url,
    } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!category_id || !name || !price) {
      return res.status(400).json({
        mensagem: "Categoria, nome e preço são obrigatórios.",
      });
    }

    const [categories] = await db.query(
      `
      SELECT id
      FROM service_categories
      WHERE id = ? AND business_id = ? AND status = 'active'
      `,
      [category_id, businessId],
    );

    if (categories.length === 0) {
      return res.status(404).json({
        mensagem: "Categoria não encontrada ou inativa.",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO services 
      (business_id, category_id, name, description, price, duration_minutes, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        businessId,
        category_id,
        name.trim(),
        description || null,
        price,
        duration_minutes || null,
        image_url || null,
      ],
    );

    res.status(201).json({
      mensagem: "Serviço criado com sucesso.",
      service: {
        id: result.insertId,
        name,
        price,
      },
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao criar serviço.",
      erro: error.message,
    });
  }
}

async function listServices(req, res) {
  try {
    const businessId = req.user.business_id;

    const [services] = await db.query(
      `
      SELECT 
        s.id,
        s.business_id,
        s.category_id,
        sc.name AS category_name,
        s.name,
        s.description,
        s.price,
        s.duration_minutes,
        s.image_url,
        s.status,
        s.created_at
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.business_id = ?
      ORDER BY s.created_at DESC
      `,
      [businessId],
    );

    res.json({
      mensagem: "Serviços listados com sucesso.",
      services,
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao listar serviços.",
      erro: error.message,
    });
  }
}

async function updateService(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const {
      category_id,
      name,
      description,
      price,
      duration_minutes,
      image_url,
      status,
    } = req.body;

    if (!category_id || !name || !price) {
      return res.status(400).json({
        mensagem: "Categoria, nome e preço são obrigatórios.",
      });
    }

    const [categories] = await db.query(
      `
      SELECT id
      FROM service_categories
      WHERE id = ? AND business_id = ?
      `,
      [category_id, businessId],
    );

    if (categories.length === 0) {
      return res.status(404).json({
        mensagem: "Categoria não encontrada.",
      });
    }

    const [result] = await db.query(
      `
      UPDATE services
      SET 
        category_id = ?,
        name = ?,
        description = ?,
        price = ?,
        duration_minutes = ?,
        image_url = ?,
        status = ?
      WHERE id = ? AND business_id = ?
      `,
      [
        category_id,
        name.trim(),
        description || null,
        price,
        duration_minutes || null,
        image_url || null,
        status || "active",
        id,
        businessId,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Serviço não encontrado.",
      });
    }

    res.json({
      mensagem: "Serviço atualizado com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao atualizar serviço.",
      erro: error.message,
    });
  }
}

async function disableService(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE services
      SET status = 'inactive'
      WHERE id = ? AND business_id = ?
      `,
      [id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Serviço não encontrado.",
      });
    }

    res.json({
      mensagem: "Serviço desativado com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao desativar serviço.",
      erro: error.message,
    });
  }
}

module.exports = {
  createService,
  listServices,
  updateService,
  disableService,
};
