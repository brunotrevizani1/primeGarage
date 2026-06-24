const db = require("./connection");

async function createBanksTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS banks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      balance DECIMAL(12,2) DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);
  console.log("Tabela banks criada com sucesso.");
  process.exit(0);
}

createBanksTable().catch((err) => { console.error(err); process.exit(1); });
