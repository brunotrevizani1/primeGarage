const db = require("./connection");

async function createFinanceTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        service_order_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('dinheiro', 'pix', 'cartao', 'fiado', 'cortesia') NOT NULL,
        status ENUM('pago', 'pendente', 'cancelado') DEFAULT 'pago',
        paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
      )
    `);

    console.log("Tabela financeira criada com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar tabela financeira:", error);
    process.exit(1);
  }
}

createFinanceTables();
