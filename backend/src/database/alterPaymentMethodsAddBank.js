const db = require("./connection");

async function alterPaymentMethodsAddBank() {
  const [cols] = await db.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'payment_methods' AND COLUMN_NAME = 'bank_id'
  `);

  if (cols.length === 0) {
    await db.query(`ALTER TABLE payment_methods ADD COLUMN bank_id INT NULL`);
    await db.query(`ALTER TABLE payment_methods ADD CONSTRAINT fk_pm_bank FOREIGN KEY (bank_id) REFERENCES banks(id)`);
    console.log("Coluna bank_id adicionada em payment_methods.");
  } else {
    console.log("Coluna bank_id já existe.");
  }
  process.exit(0);
}

alterPaymentMethodsAddBank().catch((err) => { console.error(err); process.exit(1); });
