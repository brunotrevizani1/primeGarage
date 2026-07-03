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

    const hasCommissionEnabled = await columnExists("users", "commission_enabled");

    if (!hasCommissionEnabled) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN commission_enabled TINYINT(1) DEFAULT 0 AFTER status
      `);
    }

    const hasCommissionRate = await columnExists("users", "commission_rate");

    if (!hasCommissionRate) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.00 AFTER commission_enabled
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
        code: "cancelar_atendimento",
        name: "Cancelar atendimento",
        group: "Atendimentos",
      },

      {
        code: "ver_servicos",
        name: "Ver serviços",
        group: "Serviços",
      },
      {
        code: "criar_servico",
        name: "Criar serviço",
        group: "Serviços",
      },
      {
        code: "editar_servico",
        name: "Editar serviço",
        group: "Serviços",
      },
      {
        code: "excluir_servico",
        name: "Excluir serviço",
        group: "Serviços",
      },
      {
        code: "ver_categorias",
        name: "Ver categorias",
        group: "Serviços",
      },
      {
        code: "criar_categoria",
        name: "Criar categoria",
        group: "Serviços",
      },
      {
        code: "editar_categoria",
        name: "Editar categoria",
        group: "Serviços",
      },
      {
        code: "excluir_categoria",
        name: "Excluir categoria",
        group: "Serviços",
      },

      {
        code: "ver_equipe",
        name: "Ver equipe",
        group: "Equipe",
      },
      {
        code: "criar_funcionario",
        name: "Criar funcionário",
        group: "Equipe",
      },
      {
        code: "editar_funcionario",
        name: "Editar funcionário",
        group: "Equipe",
      },
      {
        code: "excluir_funcionario",
        name: "Excluir funcionário",
        group: "Equipe",
      },

      {
        code: "ver_agenda",
        name: "Ver agenda",
        group: "Agenda",
      },
      {
        code: "ver_cliente",
        name: "Ver clientes",
        group: "Clientes",
      },
      {
        code: "gerenciar_configuracoes",
        name: "Gerenciar configurações",
        group: "Configurações",
      },
    ];

    const allowedCodes = permissions.map((permission) => permission.code);

    await db.query(
      `
  DELETE up
  FROM user_permissions up
  INNER JOIN permissions p ON up.permission_id = p.id
  WHERE p.code NOT IN (?)
  `,
      [allowedCodes],
    );

    await db.query(
      `
  DELETE FROM permissions
  WHERE code NOT IN (?)
  `,
      [allowedCodes],
    );

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
