const db = require("../database/connection");

async function resetOrders() {
  console.log("Iniciando reset dos atendimentos...");

  // Recalcula o saldo dos bancos considerando só os A Pagar pagos (a única fonte confiável)
  const [banksResult] = await db.query("UPDATE banks SET balance = 0");
  const [recalcResult] = await db.query(`
    UPDATE banks b
    INNER JOIN (
      SELECT bank_id, SUM(amount) AS total FROM payables WHERE status = 'pago' AND bank_id IS NOT NULL GROUP BY bank_id
    ) py ON py.bank_id = b.id
    SET b.balance = b.balance - py.total
  `);
  console.log(`Saldos dos bancos recalculados (${banksResult.affectedRows} banco(s) zerado(s), ${recalcResult.affectedRows} ajustado(s) pelo A Pagar).`);

  const [paymentsResult] = await db.query("DELETE FROM payments");
  console.log(`${paymentsResult.affectedRows} pagamento(s) deletado(s).`);

  const [ordersResult] = await db.query("DELETE FROM service_orders");
  console.log(`${ordersResult.affectedRows} atendimento(s) deletado(s).`);

  console.log("Reset concluído.");
  process.exit(0);
}

resetOrders().catch((err) => {
  console.error("Erro ao resetar:", err.message);
  process.exit(1);
});
