const db = require("./connection");

async function alterPaymentsTable() {
  try {
    await db.query(`
      ALTER TABLE payments
        MODIFY COLUMN payment_method ENUM('dinheiro', 'pix', 'cartao', 'fiado', 'cortesia') NULL DEFAULT NULL
    `);

    await db.query(`
      ALTER TABLE payments
        ADD COLUMN payment_method_id INT NULL AFTER payment_method
    `);

    await db.query(`
      ALTER TABLE payments
        ADD CONSTRAINT fk_payments_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
    `);

    console.log("Tabela payments alterada com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao alterar tabela payments:", error);
    process.exit(1);
  }
}

alterPaymentsTable();
