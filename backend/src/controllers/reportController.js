const db = require("../database/connection");

function getRange(query) {
  if (query.start && query.end) {
    return { start: query.start, end: query.end };
  }
  const now = new Date();
  const year = Number(query.year) || now.getFullYear();
  const month = Number(query.month) || now.getMonth() + 1;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  return { start, end };
}

async function getFinancialReport(req, res) {
  try {
    const businessId = req.user.business_id;
    const { start, end } = getRange(req.query);

    const [[recSummary]] = await db.query(
      `SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN amount ELSE 0 END), 0) AS paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN amount ELSE 0 END), 0) AS pending_amount,
        SUM(CASE WHEN status = 'pago' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pending_count
      FROM payments
      WHERE business_id = ?
        AND DATE(COALESCE(due_date, created_at)) BETWEEN ? AND ?`,
      [businessId, start, end],
    );

    const [recByMethod] = await db.query(
      `SELECT
        COALESCE(pm.name, 'Não informado') AS name,
        COUNT(*) AS count,
        COALESCE(SUM(p.amount), 0) AS amount
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.business_id = ?
        AND p.status = 'pago'
        AND DATE(COALESCE(p.due_date, p.created_at)) BETWEEN ? AND ?
      GROUP BY pm.id, pm.name
      ORDER BY amount DESC`,
      [businessId, start, end],
    );

    const [[paySummary]] = await db.query(
      `SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN amount ELSE 0 END), 0) AS paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN amount ELSE 0 END), 0) AS pending_amount,
        SUM(CASE WHEN status = 'pago' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pending_count
      FROM payables
      WHERE business_id = ?
        AND DATE(due_date) BETWEEN ? AND ?`,
      [businessId, start, end],
    );

    const [payByBank] = await db.query(
      `SELECT
        COALESCE(b.name, 'Sem banco') AS name,
        COUNT(*) AS count,
        COALESCE(SUM(p.amount), 0) AS amount
      FROM payables p
      LEFT JOIN banks b ON p.bank_id = b.id
      WHERE p.business_id = ?
        AND p.status = 'pago'
        AND DATE(p.due_date) BETWEEN ? AND ?
      GROUP BY b.id, b.name
      ORDER BY amount DESC`,
      [businessId, start, end],
    );

    res.json({
      period: { start, end },
      receivables: {
        total_count: Number(recSummary.total_count),
        total_amount: Number(recSummary.total_amount),
        paid_count: Number(recSummary.paid_count),
        paid_amount: Number(recSummary.paid_amount),
        pending_count: Number(recSummary.pending_count),
        pending_amount: Number(recSummary.pending_amount),
        by_method: recByMethod.map((r) => ({ ...r, amount: Number(r.amount) })),
      },
      payables: {
        total_count: Number(paySummary.total_count),
        total_amount: Number(paySummary.total_amount),
        paid_count: Number(paySummary.paid_count),
        paid_amount: Number(paySummary.paid_amount),
        pending_count: Number(paySummary.pending_count),
        pending_amount: Number(paySummary.pending_amount),
        by_bank: payByBank.map((r) => ({ ...r, amount: Number(r.amount) })),
      },
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao gerar relatório financeiro.", erro: error.message });
  }
}

async function getOrdersReport(req, res) {
  try {
    const businessId = req.user.business_id;
    const { start, end } = getRange(req.query);

    const [[summary]] = await db.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'agendado'  THEN 1 ELSE 0 END) AS agendado,
        SUM(CASE WHEN status = 'na_fila'   THEN 1 ELSE 0 END) AS na_fila,
        SUM(CASE WHEN status = 'em_lavagem'THEN 1 ELSE 0 END) AS em_lavagem,
        SUM(CASE WHEN status = 'pronto'    THEN 1 ELSE 0 END) AS pronto,
        SUM(CASE WHEN status = 'entregue'  THEN 1 ELSE 0 END) AS entregue,
        SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelado
      FROM service_orders
      WHERE business_id = ?
        AND DATE(created_at) BETWEEN ? AND ?`,
      [businessId, start, end],
    );

    res.json({
      period: { start, end },
      total: Number(summary.total),
      agendado: Number(summary.agendado),
      na_fila: Number(summary.na_fila),
      em_lavagem: Number(summary.em_lavagem),
      pronto: Number(summary.pronto),
      entregue: Number(summary.entregue),
      cancelado: Number(summary.cancelado),
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao gerar relatório de atendimentos.", erro: error.message });
  }
}

async function getCustomersReport(req, res) {
  try {
    const businessId = req.user.business_id;
    const { start, end } = getRange(req.query);

    const [[totals]] = await db.query(
      `SELECT
        COUNT(DISTINCT c.id) AS total_customers,
        SUM(CASE WHEN DATE(c.created_at) BETWEEN ? AND ? THEN 1 ELSE 0 END) AS new_in_period
      FROM customers c
      WHERE c.business_id = ?`,
      [start, end, businessId],
    );

    const [customers] = await db.query(
      `SELECT
        c.id AS customer_id,
        c.name,
        c.phone,
        COUNT(so.id) AS total_orders,
        COALESCE(SUM(so.price), 0) AS total_spent
      FROM customers c
      INNER JOIN vehicles v ON v.customer_id = c.id AND v.business_id = c.business_id
      INNER JOIN service_orders so ON so.vehicle_id = v.id AND so.status = 'entregue'
      WHERE c.business_id = ?
        AND DATE(so.created_at) BETWEEN ? AND ?
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_orders DESC, total_spent DESC
      LIMIT 30`,
      [businessId, start, end],
    );

    const customerIds = customers.map((c) => c.customer_id);
    let servicesByCustomer = {};

    if (customerIds.length > 0) {
      const placeholders = customerIds.map(() => "?").join(",");
      const [serviceRows] = await db.query(
        `SELECT
          c.id AS customer_id,
          sv.name AS service_name,
          COUNT(*) AS count
        FROM customers c
        INNER JOIN vehicles v ON v.customer_id = c.id AND v.business_id = c.business_id
        INNER JOIN service_orders so ON so.vehicle_id = v.id AND so.status = 'entregue'
        INNER JOIN services sv ON so.service_id = sv.id
        WHERE c.business_id = ?
          AND c.id IN (${placeholders})
          AND DATE(so.created_at) BETWEEN ? AND ?
        GROUP BY c.id, sv.id, sv.name
        ORDER BY c.id, count DESC`,
        [businessId, ...customerIds, start, end],
      );

      for (const row of serviceRows) {
        if (!servicesByCustomer[row.customer_id]) servicesByCustomer[row.customer_id] = [];
        servicesByCustomer[row.customer_id].push({ name: row.service_name, count: Number(row.count) });
      }
    }

    res.json({
      period: { start, end },
      total_customers: Number(totals.total_customers),
      new_in_period: Number(totals.new_in_period),
      customers: customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        total_orders: Number(c.total_orders),
        total_spent: Number(c.total_spent),
        services: servicesByCustomer[c.customer_id] || [],
      })),
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao gerar relatório de clientes.", erro: error.message });
  }
}

async function getTeamReport(req, res) {
  try {
    const businessId = req.user.business_id;
    const { start, end } = getRange(req.query);

    const [employees] = await db.query(
      `SELECT id, name, commission_enabled, commission_rate
       FROM users
       WHERE business_id = ? AND role = 'employee' AND status = 'active'
       ORDER BY name ASC`,
      [businessId],
    );

    if (employees.length === 0) {
      return res.json({ period: { start, end }, team: [] });
    }

    const employeeIds = employees.map((e) => e.id);
    const placeholders = employeeIds.map(() => "?").join(",");

    const [orderRows] = await db.query(
      `SELECT
         responsible_user_id AS user_id,
         COUNT(*) AS total_orders,
         COALESCE(SUM(price), 0) AS total_value
       FROM service_orders
       WHERE business_id = ?
         AND responsible_user_id IN (${placeholders})
         AND status = 'entregue'
         AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY responsible_user_id`,
      [businessId, ...employeeIds, start, end],
    );

    const [serviceRows] = await db.query(
      `SELECT
         so.responsible_user_id AS user_id,
         sv.name AS service_name,
         COUNT(*) AS count
       FROM service_orders so
       INNER JOIN services sv ON so.service_id = sv.id
       WHERE so.business_id = ?
         AND so.responsible_user_id IN (${placeholders})
         AND so.status = 'entregue'
         AND DATE(so.created_at) BETWEEN ? AND ?
       GROUP BY so.responsible_user_id, sv.id, sv.name
       ORDER BY so.responsible_user_id, count DESC`,
      [businessId, ...employeeIds, start, end],
    );

    const ordersByEmployee = {};
    for (const r of orderRows) {
      ordersByEmployee[r.user_id] = { total_orders: Number(r.total_orders), total_value: Number(r.total_value) };
    }

    const servicesByEmployee = {};
    for (const r of serviceRows) {
      if (!servicesByEmployee[r.user_id]) servicesByEmployee[r.user_id] = [];
      servicesByEmployee[r.user_id].push({ name: r.service_name, count: Number(r.count) });
    }

    const team = employees.map((e) => {
      const stats = ordersByEmployee[e.id] || { total_orders: 0, total_value: 0 };
      const rate = Number(e.commission_rate) || 0;
      const commission = e.commission_enabled ? stats.total_value * (rate / 100) : null;
      return {
        name: e.name,
        commission_enabled: Boolean(e.commission_enabled),
        commission_rate: rate,
        total_orders: stats.total_orders,
        total_value: stats.total_value,
        commission,
        services: servicesByEmployee[e.id] || [],
      };
    });

    res.json({ period: { start, end }, team });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao gerar relatório da equipe.", erro: error.message });
  }
}

module.exports = { getFinancialReport, getOrdersReport, getCustomersReport, getTeamReport };
