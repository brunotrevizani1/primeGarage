const db = require("../database/connection");

async function getMyBusiness(req, res) {
  try {
    const businessId = req.user.business_id;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    const [businesses] = await db.query(
      `
      SELECT id, name, phone, address, status, created_at
      FROM businesses
      WHERE id = ?
      `,
      [businessId],
    );

    if (businesses.length === 0) {
      return res.status(404).json({
        mensagem: "Lavajato não encontrado.",
      });
    }

    res.json({
      mensagem: "Lavajato encontrado com sucesso.",
      business: businesses[0],
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao buscar lavajato.",
      erro: error.message,
    });
  }
}

module.exports = {
  getMyBusiness,
};
