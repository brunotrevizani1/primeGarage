const bcrypt = require("bcrypt");
const db = require("./connection");

async function createSuperAdmin() {
  try {
    const name = "Admin PrimeGarage";
    const email = "admin@primegarage.com";
    const cpf = "000.000.000-00";
    const password = "123456";
    const role = "super_admin";

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `
      INSERT INTO users (business_id, cpf, name, email, password, role, status)
      VALUES (NULL, ?, ?, ?, ?, ?, 'active')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        password = VALUES(password),
        role = VALUES(role),
        status = VALUES(status)
      `,
      [cpf, name, email, hashedPassword, role],
    );

    console.log("Super admin criado com sucesso!");
    console.log("Email:", email);
    console.log("Senha:", password);

    process.exit();
  } catch (error) {
    console.error("Erro ao criar super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();
