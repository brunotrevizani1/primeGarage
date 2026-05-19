const db = require("./connection");

async function createServiceTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        duration_minutes INT,
        image_url VARCHAR(255),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    console.log("Tabela de serviços criada com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar tabela de serviços:", error);
    process.exit(1);
  }
}

createServiceTables();
