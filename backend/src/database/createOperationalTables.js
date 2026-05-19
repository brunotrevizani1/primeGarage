const db = require("./connection");

async function createOperationalTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        customer_id INT NOT NULL,
        plate VARCHAR(20) NOT NULL,
        model VARCHAR(100),
        color VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS service_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        customer_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        service_id INT NOT NULL,
        responsible_user_id INT NULL,
        status ENUM('na_fila', 'em_lavagem', 'em_acabamento', 'pronto', 'entregue', 'cancelado') DEFAULT 'na_fila',
        price DECIMAL(10,2) NOT NULL,
        payment_method ENUM('dinheiro', 'pix', 'cartao', 'fiado', 'cortesia') NULL,
        notes TEXT,
        entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        start_time DATETIME NULL,
        finished_time DATETIME NULL,
        delivered_time DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (responsible_user_id) REFERENCES users(id)
      )
    `);

    console.log("Tabelas operacionais criadas com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar tabelas operacionais:", error);
    process.exit(1);
  }
}

createOperationalTables();
