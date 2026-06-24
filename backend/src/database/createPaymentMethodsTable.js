const db = require("./connection");

async function createPaymentMethodsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    console.log("Tabela payment_methods criada com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar tabela payment_methods:", error);
    process.exit(1);
  }
}

createPaymentMethodsTable();
