const db = require("../database/connection");

async function createPayment(req, res) {
  try {
    const businessId = req.user.business_id;
    const { service_order_id, amount, payment_method, status } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!service_order_id || !amount || !payment_method) {
      return res.status(400).json({
        mensagem: "Atendimento, valor e forma de pagamento são obrigatórios.",
      });
    }

    const [orders] = await db.query(
      `
      SELECT id
      FROM service_orders
      WHERE id = ? AND business_id = ?
      `,
      [service_order_id, businessId],
    );

    if (orders.length === 0) {
      return res.status(404).json({
        mensagem: "Atendimento não encontrado.",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO payments
      (business_id, service_order_id, amount, payment_method, status)
      VALUES (?, ?, ?, ?, ?)
      `,
      [businessId, service_order_id, amount, payment_method, status || "pago"],
    );

    await db.query(
      `
      UPDATE service_orders
      SET payment_method = ?
      WHERE id = ? AND business_id = ?
      `,
      [payment_method, service_order_id, businessId],
    );

    res.status(201).json({
      mensagem: "Pagamento registrado com sucesso.",
      payment: {
        id: result.insertId,
        service_order_id,
        amount,
        payment_method,
        status: status || "pago",
      },
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao registrar pagamento.",
      erro: error.message,
    });
  }
}

async function getTodayFinance(req, res) {
  try {
    const businessId = req.user.business_id;

    const [summary] = await db.query(
      `
      SELECT
        COALESCE(SUM(amount), 0) AS total_day,
        COUNT(*) AS paid_orders,
        COALESCE(AVG(amount), 0) AS average_ticket
      FROM payments
      WHERE business_id = ?
      AND status = 'pago'
      AND DATE(paid_at) = CURDATE()
      `,
      [businessId],
    );

    const [byPaymentMethod] = await db.query(
      `
      SELECT
        payment_method,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(*) AS quantity
      FROM payments
      WHERE business_id = ?
      AND status = 'pago'
      AND DATE(paid_at) = CURDATE()
      GROUP BY payment_method
      `,
      [businessId],
    );

    res.json({
      mensagem: "Resumo financeiro do dia listado com sucesso.",
      finance: {
        total_day: Number(summary[0].total_day),
        paid_orders: summary[0].paid_orders,
        average_ticket: Number(summary[0].average_ticket),
        by_payment_method: byPaymentMethod,
      },
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao buscar financeiro do dia.",
      erro: error.message,
    });
  }
}

module.exports = {
  createPayment,
  getTodayFinance,
};
