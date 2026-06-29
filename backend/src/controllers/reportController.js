const db = require("../database/connection");

function getRange(query) {
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
        SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(CASE WHEN status = 'entregue' THEN price ELSE 0 END), 0) AS total_revenue,
        COALESCE(AVG(CASE WHEN status = 'entregue' THEN price END), 0) AS avg_ticket
      FROM service_orders
      WHERE business_id = ?
        AND DATE(created_at) BETWEEN ? AND ?`,
      [businessId, start, end],
    );

    const [byService] = await db.query(
      `SELECT
        sv.name AS service_name,
        COUNT(*) AS count,
        COALESCE(SUM(so.price), 0) AS revenue
      FROM service_orders so
      INNER JOIN services sv ON so.service_id = sv.id
      WHERE so.business_id = ?
        AND DATE(so.created_at) BETWEEN ? AND ?
        AND so.status = 'entregue'
      GROUP BY sv.id, sv.name
      ORDER BY count DESC
      LIMIT 10`,
      [businessId, start, end],
    );

    const [byDay] = await db.query(
      `SELECT
        DATE(created_at) AS date,
        COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN status = 'entregue' THEN price ELSE 0 END), 0) AS revenue
      FROM service_orders
      WHERE business_id = ?
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      [businessId, start, end],
    );

    res.json({
      period: { start, end },
      total: Number(summary.total),
      delivered: Number(summary.delivered),
      cancelled: Number(summary.cancelled),
      in_progress: Number(summary.total) - Number(summary.delivered) - Number(summary.cancelled),
      total_revenue: Number(summary.total_revenue),
      avg_ticket: Number(summary.avg_ticket),
      by_service: byService.map((r) => ({ ...r, revenue: Number(r.revenue) })),
      by_day: byDay.map((r) => ({ ...r, revenue: Number(r.revenue), date: String(r.date).split("T")[0] })),
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

    const [topCustomers] = await db.query(
      `SELECT
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
      LIMIT 10`,
      [businessId, start, end],
    );

    const [newCustomers] = await db.query(
      `SELECT
        c.name,
        c.phone,
        c.created_at,
        v.plate AS vehicle_plate,
        v.model AS vehicle_model
      FROM customers c
      INNER JOIN vehicles v ON v.customer_id = c.id AND v.business_id = c.business_id
      WHERE c.business_id = ?
        AND DATE(c.created_at) BETWEEN ? AND ?
      ORDER BY c.created_at DESC
      LIMIT 20`,
      [businessId, start, end],
    );

    res.json({
      period: { start, end },
      total_customers: Number(totals.total_customers),
      new_in_period: Number(totals.new_in_period),
      top_customers: topCustomers.map((r) => ({ ...r, total_spent: Number(r.total_spent) })),
      new_customers: newCustomers,
    });
  } catch (error) {
    res.status(500).json({ mensagem: "Erro ao gerar relatório de clientes.", erro: error.message });
  }
}

module.exports = { getFinancialReport, getOrdersReport, getCustomersReport };
