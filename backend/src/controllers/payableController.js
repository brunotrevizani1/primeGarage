const db = require("../database/connection");

async function getPayables(req, res) {
  try {
    const businessId = req.user.business_id;
    const { date, status, description, bank_id, amount_min, amount_max } = req.query;

    const conditions = ["p.business_id = ?"];
    const params = [businessId];

    if (date) {
      conditions.push("DATE(p.due_date) = ?");
      params.push(date);
    }

    if (status === "pendente" || status === "pago") {
      conditions.push("p.status = ?");
      params.push(status);
    }

    if (description && description.trim()) {
      conditions.push("p.description LIKE ?");
      params.push(`%${description.trim()}%`);
    }

    if (bank_id) {
      conditions.push("p.bank_id = ?");
      params.push(Number(bank_id));
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

    const [rows] = await db.query(
      `SELECT
        p.id, p.description, p.amount, p.due_date, p.status,
        p.bank_id, p.paid_at, p.created_at,
        b.name AS bank_name
      FROM payables p
      LEFT JOIN banks b ON p.bank_id = b.id
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN p.status = 'pendente' THEN 0 ELSE 1 END ASC,
        CASE WHEN p.status = 'pago' THEN p.paid_at ELSE p.due_date END DESC`,
      params,
    );

    res.json({ payables: rows.map((r) => ({ ...r, amount: Number(r.amount) })) });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar contas a pagar.", erro: error.message });
  }
}

async function createPayable(req, res) {
  try {
    const businessId = req.user.business_id;
    const { description, amount, due_date } = req.body;

    if (!description || !description.trim()) return res.status(400).json({ mensagem: "Descrição é obrigatória." });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ mensagem: "Valor inválido." });
    if (!due_date) return res.status(400).json({ mensagem: "Data de vencimento é obrigatória." });

    const [result] = await db.query(
      "INSERT INTO payables (business_id, description, amount, due_date) VALUES (?, ?, ?, ?)",
      [businessId, description.trim(), Number(amount), due_date],
    );

    res.status(201).json({
      mensagem: "Conta a pagar criada com sucesso.",
      payable: { id: result.insertId, description: description.trim(), amount: Number(amount), due_date, status: "pendente" },
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao criar conta a pagar.", erro: error.message });
  }
}

async function updatePayable(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { description, amount, due_date } = req.body;

    if (!description || !description.trim()) return res.status(400).json({ mensagem: "Descrição é obrigatória." });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ mensagem: "Valor inválido." });
    if (!due_date) return res.status(400).json({ mensagem: "Data de vencimento é obrigatória." });

    const [existing] = await db.query(
      "SELECT id, status FROM payables WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (existing.length === 0) return res.status(404).json({ mensagem: "Conta não encontrada." });
    if (existing[0].status === "pago") return res.status(400).json({ mensagem: "Não é possível editar uma conta já paga." });

    await db.query(
      "UPDATE payables SET description = ?, amount = ?, due_date = ? WHERE id = ? AND business_id = ?",
      [description.trim(), Number(amount), due_date, id, businessId],
    );

    res.json({ mensagem: "Conta atualizada com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao atualizar conta a pagar.", erro: error.message });
  }
}

async function deletePayable(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT id, status FROM payables WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (existing.length === 0) return res.status(404).json({ mensagem: "Conta não encontrada." });
    if (existing[0].status === "pago") return res.status(400).json({ mensagem: "Não é possível excluir uma conta já paga." });

    await db.query("DELETE FROM payables WHERE id = ? AND business_id = ?", [id, businessId]);

    res.json({ mensagem: "Conta excluída com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao excluir conta a pagar.", erro: error.message });
  }
}

async function payPayable(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { bank_id } = req.body;

    if (!bank_id) return res.status(400).json({ mensagem: "Banco é obrigatório." });

    const [[payable]] = await db.query(
      "SELECT id, status, amount FROM payables WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (!payable) return res.status(404).json({ mensagem: "Conta não encontrada." });
    if (payable.status === "pago") return res.status(400).json({ mensagem: "Esta conta já foi paga." });

    const [[bank]] = await db.query(
      "SELECT id FROM banks WHERE id = ? AND business_id = ? AND is_active = 1",
      [bank_id, businessId],
    );

    if (!bank) return res.status(404).json({ mensagem: "Banco não encontrado." });

    await db.query(
      "UPDATE payables SET status = 'pago', bank_id = ?, paid_at = NOW() WHERE id = ? AND business_id = ?",
      [bank_id, id, businessId],
    );

    await db.query(
      "UPDATE banks SET balance = balance - ? WHERE id = ? AND business_id = ?",
      [Number(payable.amount), bank_id, businessId],
    );

    res.json({ mensagem: "Pagamento registrado com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao registrar pagamento.", erro: error.message });
  }
}

async function reopenPayable(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [[payable]] = await db.query(
      "SELECT id, status, amount, bank_id FROM payables WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (!payable) return res.status(404).json({ mensagem: "Conta não encontrada." });
    if (payable.status !== "pago") return res.status(400).json({ mensagem: "Esta conta não está paga." });

    if (payable.bank_id) {
      await db.query(
        "UPDATE banks SET balance = balance + ? WHERE id = ? AND business_id = ?",
        [Number(payable.amount), payable.bank_id, businessId],
      );
    }

    await db.query(
      "UPDATE payables SET status = 'pendente', bank_id = NULL, paid_at = NULL WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    res.json({ mensagem: "Conta reaberta com sucesso." });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao reabrir conta.", erro: error.message });
  }
}

module.exports = { getPayables, createPayable, updatePayable, deletePayable, payPayable, reopenPayable };
