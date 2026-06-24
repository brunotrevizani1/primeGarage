const db = require("../database/connection");

async function getBanks(req, res) {
  try {
    const businessId = req.user.business_id;
    const [banks] = await db.query(
      "SELECT id, name, balance, is_active, created_at FROM banks WHERE business_id = ? ORDER BY name ASC",
      [businessId],
    );
    res.json({ banks: banks.map((b) => ({ ...b, balance: Number(b.balance) })) });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar bancos.", erro: error.message });
  }
}

async function createBank(req, res) {
  try {
    const businessId = req.user.business_id;
    const { name, initial_balance = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    const [result] = await db.query(
      "INSERT INTO banks (business_id, name, balance) VALUES (?, ?, ?)",
      [businessId, name.trim(), Number(initial_balance) || 0],
    );

    res.status(201).json({
      mensagem: "Banco criado com sucesso.",
      bank: { id: result.insertId, name: name.trim(), balance: Number(initial_balance) || 0, is_active: 1 },
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao criar banco.", erro: error.message });
  }
}

async function updateBank(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { name, balance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    const [result] = await db.query(
      "UPDATE banks SET name = ?, balance = ? WHERE id = ? AND business_id = ?",
      [name.trim(), Number(balance) || 0, id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Banco não encontrado." });
    }

    res.json({ mensagem: "Banco atualizado com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao atualizar banco.", erro: error.message });
  }
}

async function deleteBank(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [inUsePayments] = await db.query(
      "SELECT id FROM payment_methods WHERE bank_id = ? LIMIT 1",
      [id],
    );

    const [inUsePayables] = await db.query(
      "SELECT id FROM payables WHERE bank_id = ? LIMIT 1",
      [id],
    );

    if (inUsePayments.length > 0 || inUsePayables.length > 0) {
      return res.status(400).json({ mensagem: "Este banco está em uso e não pode ser excluído." });
    }

    const [result] = await db.query(
      "DELETE FROM banks WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Banco não encontrado." });
    }

    res.json({ mensagem: "Banco excluído com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao excluir banco.", erro: error.message });
  }
}

async function getBankMovements(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [[bank]] = await db.query(
      "SELECT id, name FROM banks WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (!bank) return res.status(404).json({ mensagem: "Banco não encontrado." });

    const [rows] = await db.query(
      `SELECT 'entrada' AS type, CONCAT(c.name, ' — ', v.plate) AS description, p.amount, p.paid_at AS date
       FROM payments p
       INNER JOIN service_orders so ON p.service_order_id = so.id
       INNER JOIN customers c ON so.customer_id = c.id
       INNER JOIN vehicles v ON so.vehicle_id = v.id
       WHERE p.bank_id = ? AND p.business_id = ? AND p.status = 'pago'
       UNION ALL
       SELECT 'saida' AS type, py.description, py.amount, py.paid_at AS date
       FROM payables py
       WHERE py.bank_id = ? AND py.business_id = ? AND py.status = 'pago'
       ORDER BY date DESC`,
      [id, businessId, id, businessId],
    );

    res.json({
      bank,
      movements: rows.map((r) => ({ ...r, amount: Number(r.amount) })),
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar movimentações.", erro: error.message });
  }
}

module.exports = { getBanks, createBank, updateBank, deleteBank, getBankMovements };
