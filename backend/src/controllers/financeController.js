const db = require("../database/connection");

async function createPayment(req, res) {
  try {
    const businessId = req.user.business_id;
    const { service_order_id, amount, payment_method, status } = req.body;

    if (!businessId) {
      return res.status(400).json({ mensagem: "Usuário não está vinculado a nenhum lavajato." });
    }

    if (!service_order_id || !amount || !payment_method) {
      return res.status(400).json({ mensagem: "Atendimento, valor e forma de pagamento são obrigatórios." });
    }

    const [orders] = await db.query(
      "SELECT id FROM service_orders WHERE id = ? AND business_id = ?",
      [service_order_id, businessId],
    );

    if (orders.length === 0) {
      return res.status(404).json({ mensagem: "Atendimento não encontrado." });
    }

    const [result] = await db.query(
      "INSERT INTO payments (business_id, service_order_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?)",
      [businessId, service_order_id, amount, payment_method, status || "pago"],
    );

    await db.query(
      "UPDATE service_orders SET payment_method = ? WHERE id = ? AND business_id = ?",
      [payment_method, service_order_id, businessId],
    );

    res.status(201).json({
      mensagem: "Pagamento registrado com sucesso.",
      payment: { id: result.insertId, service_order_id, amount, payment_method, status: status || "pago" },
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao registrar pagamento.", erro: error.message });
  }
}

async function getTodayFinance(req, res) {
  try {
    const businessId = req.user.business_id;

    const [summary] = await db.query(
      `SELECT
        COALESCE(SUM(amount), 0) AS total_day,
        COUNT(*) AS paid_orders,
        COALESCE(AVG(amount), 0) AS average_ticket
      FROM payments
      WHERE business_id = ? AND status = 'pago' AND DATE(paid_at) = CURDATE()`,
      [businessId],
    );

    const [byPaymentMethod] = await db.query(
      `SELECT payment_method, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS quantity
      FROM payments
      WHERE business_id = ? AND status = 'pago' AND DATE(paid_at) = CURDATE()
      GROUP BY payment_method`,
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
    res.status(500).json({ mensagem: "Erro ao buscar financeiro do dia.", erro: error.message });
  }
}

async function getReceivables(req, res) {
  try {
    const businessId = req.user.business_id;
    const {
      status,
      page = 1,
      limit = 50,
      customer_name,
      vehicle_plate,
      payment_method_id,
      date,
      amount_min,
      amount_max,
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = ["p.business_id = ?"];
    const params = [businessId];

    if (date) {
      conditions.push("DATE(p.created_at) = ?");
      params.push(date);
    }

    if (status === "pendente" || status === "pago") {
      conditions.push("p.status = ?");
      params.push(status);
    }

    if (customer_name && customer_name.trim()) {
      conditions.push("c.name LIKE ?");
      params.push(`%${customer_name.trim()}%`);
    }

    if (vehicle_plate && vehicle_plate.trim()) {
      conditions.push("v.plate LIKE ?");
      params.push(`%${vehicle_plate.trim()}%`);
    }

    if (payment_method_id) {
      conditions.push("p.payment_method_id = ?");
      params.push(Number(payment_method_id));
    }

    if (amount_min) {
      conditions.push("p.amount >= ?");
      params.push(Number(amount_min));
    }

    if (amount_max) {
      conditions.push("p.amount <= ?");
      params.push(Number(amount_max));
    }

    const whereClause = conditions.join(" AND ");

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM payments p
       INNER JOIN service_orders so ON p.service_order_id = so.id
       INNER JOIN customers c ON so.customer_id = c.id
       INNER JOIN vehicles v ON so.vehicle_id = v.id
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       WHERE ${whereClause}`,
      [...params],
    );

    const [rows] = await db.query(
      `SELECT
        p.id,
        p.amount,
        p.status,
        p.paid_at,
        p.payment_method_id,
        p.created_at,
        pm.name AS payment_method_name,
        so.id AS order_id,
        so.delivered_time,
        c.name AS customer_name,
        c.phone AS customer_phone,
        v.plate AS vehicle_plate,
        sv.name AS service_name
      FROM payments p
      INNER JOIN service_orders so ON p.service_order_id = so.id
      INNER JOIN customers c ON so.customer_id = c.id
      INNER JOIN vehicles v ON so.vehicle_id = v.id
      INNER JOIN services sv ON so.service_id = sv.id
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN p.status = 'pendente' THEN 0 ELSE 1 END ASC,
        CASE WHEN p.status = 'pago' THEN p.paid_at ELSE p.created_at END DESC
      LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset],
    );

    const totalPages = Math.ceil(total / Number(limit)) || 1;

    res.json({
      receivables: rows.map((r) => ({ ...r, amount: Number(r.amount) })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasPreviousPage: Number(page) > 1,
        hasNextPage: Number(page) < totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar recebíveis.", erro: error.message });
  }
}

async function reopenPayment(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [payments] = await db.query(
      "SELECT id, status FROM payments WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (payments.length === 0) {
      return res.status(404).json({ mensagem: "Registro não encontrado." });
    }

    if (payments[0].status !== "pago") {
      return res.status(400).json({ mensagem: "Este registro não está pago." });
    }

    const [[pmWithBank]] = await db.query(
      "SELECT amount, bank_id FROM payments WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    await db.query(
      "UPDATE payments SET status = 'pendente', payment_method_id = NULL, bank_id = NULL, paid_at = NULL WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (pmWithBank && pmWithBank.bank_id) {
      await db.query(
        "UPDATE banks SET balance = balance - ? WHERE id = ? AND business_id = ?",
        [Number(pmWithBank.amount), pmWithBank.bank_id, businessId],
      );
    }

    res.json({ mensagem: "Registro reaberto com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao reabrir registro.", erro: error.message });
  }
}

async function receivePayment(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { payment_method_id } = req.body;

    if (!payment_method_id) {
      return res.status(400).json({ mensagem: "Forma de pagamento é obrigatória." });
    }

    const [payments] = await db.query(
      "SELECT id, status, amount FROM payments WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (payments.length === 0) {
      return res.status(404).json({ mensagem: "Registro não encontrado." });
    }

    if (payments[0].status === "pago") {
      return res.status(400).json({ mensagem: "Este registro já foi baixado." });
    }

    const [methods] = await db.query(
      "SELECT id FROM payment_methods WHERE id = ? AND business_id = ? AND is_active = 1",
      [payment_method_id, businessId],
    );

    if (methods.length === 0) {
      return res.status(404).json({ mensagem: "Forma de pagamento não encontrada." });
    }

    const [[method]] = await db.query(
      "SELECT bank_id FROM payment_methods WHERE id = ? AND business_id = ?",
      [payment_method_id, businessId],
    );

    const bankId = method && method.bank_id ? method.bank_id : null;

    await db.query(
      "UPDATE payments SET status = 'pago', payment_method_id = ?, bank_id = ?, paid_at = NOW() WHERE id = ? AND business_id = ?",
      [payment_method_id, bankId, id, businessId],
    );

    if (bankId) {
      await db.query(
        "UPDATE banks SET balance = balance + ? WHERE id = ? AND business_id = ?",
        [Number(payments[0].amount), bankId, businessId],
      );
    }

    res.json({ mensagem: "Baixa realizada com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao dar baixa.", erro: error.message });
  }
}

async function getPaymentMethods(req, res) {
  try {
    const businessId = req.user.business_id;

    const [methods] = await db.query(
      "SELECT id, name, bank_id, is_active, created_at FROM payment_methods WHERE business_id = ? ORDER BY name ASC",
      [businessId],
    );

    res.json({ methods });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar formas de pagamento.", erro: error.message });
  }
}

async function createPaymentMethod(req, res) {
  try {
    const businessId = req.user.business_id;
    const { name, bank_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    const [result] = await db.query(
      "INSERT INTO payment_methods (business_id, name, bank_id) VALUES (?, ?, ?)",
      [businessId, name.trim(), bank_id || null],
    );

    res.status(201).json({
      mensagem: "Forma de pagamento criada com sucesso.",
      method: { id: result.insertId, name: name.trim(), is_active: 1, bank_id: bank_id || null },
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao criar forma de pagamento.", erro: error.message });
  }
}

async function updatePaymentMethod(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { name, bank_id, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    const [result] = await db.query(
      "UPDATE payment_methods SET name = ?, bank_id = ?, is_active = ? WHERE id = ? AND business_id = ?",
      [name.trim(), bank_id || null, is_active ? 1 : 0, id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Forma de pagamento não encontrada." });
    }

    res.json({ mensagem: "Forma de pagamento atualizada com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao atualizar forma de pagamento.", erro: error.message });
  }
}

async function deletePaymentMethod(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [inUse] = await db.query(
      "SELECT id FROM payments WHERE payment_method_id = ? LIMIT 1",
      [id],
    );

    if (inUse.length > 0) {
      return res.status(400).json({ mensagem: "Esta forma de pagamento está em uso e não pode ser excluída." });
    }

    const [result] = await db.query(
      "DELETE FROM payment_methods WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Forma de pagamento não encontrada." });
    }

    res.json({ mensagem: "Forma de pagamento excluída com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao excluir forma de pagamento.", erro: error.message });
  }
}

module.exports = {
  createPayment,
  getTodayFinance,
  getReceivables,
  reopenPayment,
  receivePayment,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
};
