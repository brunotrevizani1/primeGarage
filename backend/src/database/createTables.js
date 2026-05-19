const db = require("./connection");

async function createTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(20),
        address VARCHAR(255),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NULL,
        cpf VARCHAR(14) UNIQUE,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'owner', 'employee') NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description VARCHAR(255)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        permission_id INT NOT NULL,
        allowed BOOLEAN DEFAULT true,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
      )
    `);

    console.log("Tabelas criadas com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar tabelas:", error);
    process.exit(1);
  }
}

createTables();
