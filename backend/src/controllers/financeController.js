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
      "INSERT INTO payments (business_id, service_order_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?) RETURNING id",
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
      WHERE business_id = ? AND status = 'pago' AND DATE(paid_at) = CURRENT_DATE`,
      [businessId],
    );

    const [byPaymentMethod] = await db.query(
      `SELECT payment_method, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS quantity
      FROM payments
      WHERE business_id = ? AND status = 'pago' AND DATE(paid_at) = CURRENT_DATE
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

    // Auto-baixa: mark overdue installments as paid
    try {
      const [overdueInstallments] = await db.query(
        `SELECT p.id, p.amount, pm.bank_id
         FROM payments p
         INNER JOIN payment_methods pm ON p.payment_method_id = pm.id
         WHERE p.business_id = ?
           AND p.status = 'pendente'
           AND p.due_date IS NOT NULL
           AND p.due_date <= CURRENT_DATE
           AND pm.auto_baixa = true`,
        [businessId],
      );

      for (const inst of overdueInstallments) {
        await db.query(
          `UPDATE payments SET status = 'pago', paid_at = NOW(), notes = 'Baixa automática por vencimento'
           WHERE id = ? AND business_id = ?`,
          [inst.id, businessId],
        );
        if (inst.bank_id) {
          await db.query(
            "UPDATE banks SET balance = balance + ? WHERE id = ? AND business_id = ?",
            [Number(inst.amount), inst.bank_id, businessId],
          );
        }
      }
    } catch { /* don't block the listing if the auto-baixa sweep fails */ }

    const conditions = ["p.business_id = ?"];
    const params = [businessId];

    if (date) {
      // Use due_date for installment records, created_at for regular ones
      conditions.push("COALESCE(DATE(p.due_date), DATE(p.created_at)) = ?");
      params.push(date);
    }

    if (status === "pendente" || status === "pago") {
      conditions.push("p.status = ?");
      params.push(status);
    }

    if (customer_name && customer_name.trim()) {
      conditions.push("c.name ILIKE ?");
      params.push(`%${customer_name.trim()}%`);
    }

    if (vehicle_plate && vehicle_plate.trim()) {
      conditions.push("v.plate ILIKE ?");
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

    // Fallback where clause (created_at only) used if the query below fails unexpectedly
    const legacyConditions = conditions.map((c) =>
      c.includes("COALESCE(DATE(p.due_date)") ? "DATE(p.created_at) = ?" : c,
    );
    const whereClause = conditions.join(" AND ");
    const legacyWhere = legacyConditions.join(" AND ");

    let total, rows;
    try {
      [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM payments p
         INNER JOIN service_orders so ON p.service_order_id = so.id
         INNER JOIN customers c ON so.customer_id = c.id
         INNER JOIN vehicles v ON so.vehicle_id = v.id
         LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
         WHERE ${whereClause}`,
        [...params],
      );

      [rows] = await db.query(
        `SELECT
          p.id, p.amount, p.status, p.paid_at, p.payment_method_id, p.created_at,
          p.due_date, p.installment_number, p.total_installments, p.parent_payment_id, p.notes,
          pm.name AS payment_method_name, so.id AS order_id, so.delivered_time,
          c.name AS customer_name, c.phone AS customer_phone,
          v.plate AS vehicle_plate, sv.name AS service_name
        FROM payments p
        INNER JOIN service_orders so ON p.service_order_id = so.id
        INNER JOIN customers c ON so.customer_id = c.id
        INNER JOIN vehicles v ON so.vehicle_id = v.id
        INNER JOIN services sv ON so.service_id = sv.id
        LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
        WHERE ${whereClause}
        ORDER BY CASE WHEN p.status = 'pendente' THEN 0 ELSE 1 END ASC,
                 CASE WHEN p.status = 'pago' THEN p.paid_at ELSE p.created_at END DESC
        LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset],
      );
    } catch {
      // Fallback: retry with the simpler created_at-only filter
      [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM payments p
         INNER JOIN service_orders so ON p.service_order_id = so.id
         INNER JOIN customers c ON so.customer_id = c.id
         INNER JOIN vehicles v ON so.vehicle_id = v.id
         LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
         WHERE ${legacyWhere}`,
        [...params],
      );

      [rows] = await db.query(
        `SELECT
          p.id, p.amount, p.status, p.paid_at, p.payment_method_id, p.created_at,
          pm.name AS payment_method_name, so.id AS order_id, so.delivered_time,
          c.name AS customer_name, c.phone AS customer_phone,
          v.plate AS vehicle_plate, sv.name AS service_name
        FROM payments p
        INNER JOIN service_orders so ON p.service_order_id = so.id
        INNER JOIN customers c ON so.customer_id = c.id
        INNER JOIN vehicles v ON so.vehicle_id = v.id
        INNER JOIN services sv ON so.service_id = sv.id
        LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
        WHERE ${legacyWhere}
        ORDER BY CASE WHEN p.status = 'pendente' THEN 0 ELSE 1 END ASC,
                 CASE WHEN p.status = 'pago' THEN p.paid_at ELSE p.created_at END DESC
        LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset],
      );
    }

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
      "UPDATE payments SET status = 'pendente', payment_method_id = NULL, bank_id = NULL, paid_at = NULL, notes = NULL WHERE id = ? AND business_id = ?",
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
    const { payment_method_id, installment_count } = req.body;

    if (!payment_method_id) {
      return res.status(400).json({ mensagem: "Forma de pagamento é obrigatória." });
    }

    const [payments] = await db.query(
      "SELECT id, status, amount, service_order_id FROM payments WHERE id = ? AND business_id = ?",
      [id, businessId],
    );

    if (payments.length === 0) {
      return res.status(404).json({ mensagem: "Registro não encontrado." });
    }

    if (payments[0].status === "pago") {
      return res.status(400).json({ mensagem: "Este registro já foi baixado." });
    }

    const [methods] = await db.query(
      "SELECT id FROM payment_methods WHERE id = ? AND business_id = ? AND is_active = true",
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
    const totalAmount = Number(payments[0].amount);
    const N = installment_count && Number(installment_count) > 1 ? Number(installment_count) : 1;

    if (N === 1) {
      try {
        await db.query(
          "UPDATE payments SET status = 'pago', payment_method_id = ?, bank_id = ?, paid_at = NOW(), due_date = CURRENT_DATE WHERE id = ? AND business_id = ?",
          [payment_method_id, bankId, id, businessId],
        );
      } catch {
        await db.query(
          "UPDATE payments SET status = 'pago', payment_method_id = ?, bank_id = ?, paid_at = NOW() WHERE id = ? AND business_id = ?",
          [payment_method_id, bankId, id, businessId],
        );
      }

      if (bankId) {
        await db.query(
          "UPDATE banks SET balance = balance + ? WHERE id = ? AND business_id = ?",
          [totalAmount, bankId, businessId],
        );
      }
    } else {
      // Get fee for this installment count
      const [instRows] = await db.query(
        "SELECT fee_percentage FROM payment_method_installments WHERE payment_method_id = ? AND installment_count = ?",
        [payment_method_id, N],
      );
      const feePercentage = instRows.length > 0 ? Number(instRows[0].fee_percentage) : 0;

      // Amount per installment with fee applied
      const basePerInstallment = totalAmount / N;
      const perInstallment = Math.round(basePerInstallment * (1 + feePercentage / 100) * 100) / 100;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      // Update original payment as installment 1 — paid now
      await db.query(
        `UPDATE payments
         SET status = 'pago', payment_method_id = ?, bank_id = ?, paid_at = NOW(),
             amount = ?, installment_number = 1, total_installments = ?, due_date = ?
         WHERE id = ? AND business_id = ?`,
        [payment_method_id, bankId, perInstallment, N, todayStr, id, businessId],
      );

      if (bankId) {
        await db.query(
          "UPDATE banks SET balance = balance + ? WHERE id = ? AND business_id = ?",
          [perInstallment, bankId, businessId],
        );
      }

      // Create future installment records
      const serviceOrderId = payments[0].service_order_id;
      for (let i = 2; i <= N; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

        await db.query(
          `INSERT INTO payments
             (business_id, service_order_id, amount, status, payment_method_id, bank_id,
              parent_payment_id, installment_number, total_installments, due_date, notes)
           VALUES (?, ?, ?, 'pendente', ?, ?, ?, ?, ?, ?, ?)`,
          [businessId, serviceOrderId, perInstallment, payment_method_id, bankId, id, i, N, dueDateStr, `Parcela ${i}/${N}`],
        );
      }
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

    // Enrich with installments and auto_baixa
    if (methods.length > 0) {
      try {
        const methodIds = methods.map((m) => m.id);
        const placeholders = methodIds.map(() => "?").join(",");

        const [autoCols] = await db.query(
          `SELECT id, auto_baixa FROM payment_methods WHERE id IN (${placeholders})`,
          methodIds,
        );
        const autoMap = {};
        autoCols.forEach((row) => {
          autoMap[row.id] = {
            auto_baixa: Boolean(row.auto_baixa),
          };
        });

        const [installments] = await db.query(
          `SELECT payment_method_id, installment_count, fee_percentage
           FROM payment_method_installments
           WHERE payment_method_id IN (${placeholders})
           ORDER BY installment_count ASC`,
          methodIds,
        );

        const installmentMap = {};
        for (const inst of installments) {
          if (!installmentMap[inst.payment_method_id]) installmentMap[inst.payment_method_id] = [];
          installmentMap[inst.payment_method_id].push({
            installment_count: inst.installment_count,
            fee_percentage: Number(inst.fee_percentage),
          });
        }

        methods.forEach((m) => {
          const extra = autoMap[m.id] || {};
          m.auto_baixa = extra.auto_baixa || false;
          m.installments = installmentMap[m.id] || [];
        });
      } catch {
        methods.forEach((m) => {
          m.auto_baixa = false;
          m.installments = [];
        });
      }
    }

    res.json({ methods });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao buscar formas de pagamento.", erro: error.message });
  }
}

async function createPaymentMethod(req, res) {
  try {
    const businessId = req.user.business_id;
    const { name, bank_id, auto_baixa, installments } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    let result;
    try {
      [result] = await db.query(
        "INSERT INTO payment_methods (business_id, name, bank_id, auto_baixa) VALUES (?, ?, ?, ?)",
        [businessId, name.trim(), bank_id || null, auto_baixa ? 1 : 0],
      );
    } catch {
      [result] = await db.query(
        "INSERT INTO payment_methods (business_id, name, bank_id) VALUES (?, ?, ?)",
        [businessId, name.trim(), bank_id || null],
      );
    }

    const methodId = result.insertId;

    if (Array.isArray(installments) && installments.length > 0) {
      try {
        for (const inst of installments) {
          if (Number(inst.installment_count) >= 1) {
            await db.query(
              "INSERT INTO payment_method_installments (payment_method_id, installment_count, fee_percentage) VALUES (?, ?, ?)",
              [methodId, inst.installment_count, inst.fee_percentage || 0],
            );
          }
        }
      } catch { /* don't block payment method creation if installment setup fails */ }
    }

    res.status(201).json({
      mensagem: "Forma de pagamento criada com sucesso.",
      method: {
        id: methodId,
        name: name.trim(),
        is_active: 1,
        bank_id: bank_id || null,
        auto_baixa: Boolean(auto_baixa),
      },
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao criar forma de pagamento.", erro: error.message });
  }
}

async function updatePaymentMethod(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { name, bank_id, is_active, auto_baixa, installments } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ mensagem: "Nome é obrigatório." });
    }

    let result;
    try {
      [result] = await db.query(
        "UPDATE payment_methods SET name = ?, bank_id = ?, is_active = ?, auto_baixa = ? WHERE id = ? AND business_id = ?",
        [name.trim(), bank_id || null, is_active ? 1 : 0, auto_baixa ? 1 : 0, id, businessId],
      );
    } catch {
      [result] = await db.query(
        "UPDATE payment_methods SET name = ?, bank_id = ?, is_active = ? WHERE id = ? AND business_id = ?",
        [name.trim(), bank_id || null, is_active ? 1 : 0, id, businessId],
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Forma de pagamento não encontrada." });
    }

    // Replace all installments
    try {
      await db.query("DELETE FROM payment_method_installments WHERE payment_method_id = ?", [id]);

      if (Array.isArray(installments) && installments.length > 0) {
        for (const inst of installments) {
          if (Number(inst.installment_count) >= 1) {
            await db.query(
              "INSERT INTO payment_method_installments (payment_method_id, installment_count, fee_percentage) VALUES (?, ?, ?)",
              [id, inst.installment_count, inst.fee_percentage || 0],
            );
          }
        }
      }
    } catch { /* don't block the method update if installment sync fails */ }

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
