const db = require("./connection");

async function createPayablesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      description VARCHAR(200) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      due_date DATE NOT NULL,
      status ENUM('pendente','pago') DEFAULT 'pendente',
      bank_id INT NULL,
      paid_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (bank_id) REFERENCES banks(id)
    )
  `);
  console.log("Tabela payables criada com sucesso.");
  process.exit(0);
}

createPayablesTable().catch((err) => { console.error(err); process.exit(1); });
