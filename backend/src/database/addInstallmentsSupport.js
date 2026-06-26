const db = require("./connection");

async function addInstallmentsSupport() {
  try {
    const [pmCols] = await db.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_methods' AND COLUMN_NAME = 'auto_baixa'
    `);
    if (pmCols.length === 0) {
      await db.query(`ALTER TABLE payment_methods ADD COLUMN auto_baixa TINYINT(1) DEFAULT 0`);
      console.log("Coluna auto_baixa adicionada em payment_methods.");
    } else {
      console.log("Coluna auto_baixa já existe.");
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_method_installments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_method_id INT NOT NULL,
        installment_count INT NOT NULL,
        fee_percentage DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_installment (payment_method_id, installment_count),
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
      )
    `);
    console.log("Tabela payment_method_installments criada (ou já existia).");

    const [pCols] = await db.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'parent_payment_id'
    `);
    if (pCols.length === 0) {
      await db.query(`ALTER TABLE payments ADD COLUMN parent_payment_id INT NULL`);
      await db.query(`ALTER TABLE payments ADD COLUMN installment_number INT NULL`);
      await db.query(`ALTER TABLE payments ADD COLUMN total_installments INT NULL`);
      await db.query(`ALTER TABLE payments ADD COLUMN due_date DATE NULL`);
      await db.query(`ALTER TABLE payments ADD COLUMN notes VARCHAR(255) NULL`);
      console.log("Colunas de parcelamento adicionadas em payments.");
    } else {
      console.log("Colunas de parcelamento já existem.");
    }

    console.log("Migração concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro na migração:", error);
    process.exit(1);
  }
}

addInstallmentsSupport();
