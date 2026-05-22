const db = require("./connection");

async function columnExists(tableName, columnName) {
  const [columns] = await db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ?
    AND COLUMN_NAME = ?
    `,
    [tableName, columnName],
  );

  return columns.length > 0;
}

async function createTeamTables() {
  try {
    const hasPhone = await columnExists("users", "phone");

    if (!hasPhone) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN phone VARCHAR(20) NULL AFTER email
      `);
    }

    const hasStatus = await columnExists("users", "status");

    if (!hasStatus) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER role
      `);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        group_name VARCHAR(80) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const hasGroupName = await columnExists("permissions", "group_name");

    if (!hasGroupName) {
      await db.query(`
    ALTER TABLE permissions
    ADD COLUMN group_name VARCHAR(80) NOT NULL DEFAULT 'Geral' AFTER name
  `);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (permission_id) REFERENCES permissions(id),
        UNIQUE KEY unique_user_permission (user_id, permission_id)
      )
    `);

    const permissions = [
      {
        code: "ver_dashboard",
        name: "Ver dashboard",
        group: "Dashboard",
      },
      {
        code: "ver_fila",
        name: "Ver atendimentos",
        group: "Atendimentos",
      },
      {
        code: "criar_atendimento",
        name: "Criar atendimento",
        group: "Atendimentos",
      },
      {
        code: "editar_atendimento",
        name: "Editar atendimento",
        group: "Atendimentos",
      },
      {
        code: "alterar_status",
        name: "Alterar status",
        group: "Atendimentos",
      },
      {
        code: "ver_servicos",
        name: "Ver serviços",
        group: "Serviços",
      },
      {
        code: "gerenciar_servicos",
        name: "Gerenciar serviços",
        group: "Serviços",
      },
      {
        code: "gerenciar_categorias",
        name: "Gerenciar categorias",
        group: "Serviços",
      },
      {
        code: "ver_equipe",
        name: "Ver equipe",
        group: "Equipe",
      },
      {
        code: "gerenciar_equipe",
        name: "Gerenciar equipe",
        group: "Equipe",
      },
      {
        code: "alterar_permissoes",
        name: "Alterar permissões",
        group: "Equipe",
      },
    ];

    for (const permission of permissions) {
      await db.query(
        `
        INSERT INTO permissions (code, name, group_name)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        group_name = VALUES(group_name)
        `,
        [permission.code, permission.name, permission.group],
      );
    }

    console.log("Tabelas e permissões da equipe criadas com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar estrutura da equipe:", error);
    process.exit(1);
  }
}

createTeamTables();
