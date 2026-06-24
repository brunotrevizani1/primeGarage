const db = require("./connection");

async function run() {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM payments LIKE 'bank_id'");
    if (cols.length > 0) {
      console.log("Coluna bank_id já existe na tabela payments.");
      process.exit(0);
    }

    await db.query(`
      ALTER TABLE payments
        ADD COLUMN bank_id INT NULL AFTER payment_method_id,
        ADD CONSTRAINT fk_payments_bank FOREIGN KEY (bank_id) REFERENCES banks(id)
    `);

    console.log("Coluna bank_id adicionada à tabela payments com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

run();
