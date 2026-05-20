const db = require("../database/connection");

async function getVehicleByPlate(req, res) {
  try {
    const businessId = req.user.business_id;
    const { plate } = req.params;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const [vehicles] = await db.query(
      `
      SELECT 
        v.id,
        v.plate,
        v.model,
        v.color,
        c.name AS customer_name,
        c.phone AS customer_phone
      FROM vehicles v
      INNER JOIN customers c ON v.customer_id = c.id
      WHERE v.business_id = ?
      AND v.plate = ?
      LIMIT 1
      `,
      [businessId, cleanPlate],
    );

    if (vehicles.length === 0) {
      return res.status(404).json({
        mensagem: "Veículo não encontrado.",
      });
    }

    res.json({
      mensagem: "Veículo encontrado com sucesso.",
      vehicle: vehicles[0],
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao buscar veículo.",
      erro: error.message,
    });
  }
}

module.exports = {
  getVehicleByPlate,
};
