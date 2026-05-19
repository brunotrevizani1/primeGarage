const db = require("../database/connection");

async function createService(req, res) {
  try {
    const businessId = req.user.business_id;
    const { name, description, price, duration_minutes, image_url } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!name || !price) {
      return res.status(400).json({
        mensagem: "Nome e preço são obrigatórios.",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO services 
      (business_id, name, description, price, duration_minutes, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        businessId,
        name,
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
      SELECT id, name, description, price, duration_minutes, image_url, status, created_at
      FROM services
      WHERE business_id = ?
      ORDER BY created_at DESC
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
    const { name, description, price, duration_minutes, image_url, status } =
      req.body;

    await db.query(
      `
      UPDATE services
      SET name = ?, description = ?, price = ?, duration_minutes = ?, image_url = ?, status = ?
      WHERE id = ? AND business_id = ?
      `,
      [
        name,
        description || null,
        price,
        duration_minutes || null,
        image_url || null,
        status || "active",
        id,
        businessId,
      ],
    );

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

    await db.query(
      `
      UPDATE services
      SET status = 'inactive'
      WHERE id = ? AND business_id = ?
      `,
      [id, businessId],
    );

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
