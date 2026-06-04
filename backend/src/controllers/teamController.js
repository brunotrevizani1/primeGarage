const bcrypt = require("bcryptjs");
const db = require("../database/connection");

async function listEmployees(req, res) {
  try {
    const businessId = req.user.business_id;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    const [employees] = await db.query(
      `
      SELECT id, name, email, phone, role, created_at
      FROM users
      WHERE business_id = ?
      AND role = 'employee'
      AND status = 'active'
      ORDER BY name ASC
      `,
      [businessId],
    );

    return res.json({
      mensagem: "Funcionários listados com sucesso.",
      employees,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar funcionários.",
      erro: error.message,
    });
  }
}

function normalizePermissions(permissions = []) {
  const normalized = new Set(permissions);

  if (
    normalized.has("criar_atendimento") ||
    normalized.has("editar_atendimento") ||
    normalized.has("alterar_status") ||
    normalized.has("cancelar_atendimento")
  ) {
    normalized.add("ver_fila");
  }

  if (
    normalized.has("criar_servico") ||
    normalized.has("editar_servico") ||
    normalized.has("excluir_servico")
  ) {
    normalized.add("ver_servicos");
  }

  if (
    normalized.has("ver_categorias") ||
    normalized.has("criar_categoria") ||
    normalized.has("editar_categoria") ||
    normalized.has("excluir_categoria")
  ) {
    normalized.add("ver_servicos");
  }

  if (
    normalized.has("criar_categoria") ||
    normalized.has("editar_categoria") ||
    normalized.has("excluir_categoria")
  ) {
    normalized.add("ver_categorias");
  }

  if (
    normalized.has("criar_funcionario") ||
    normalized.has("editar_funcionario") ||
    normalized.has("excluir_funcionario")
  ) {
    normalized.add("ver_equipe");
  }

  if (normalized.has("editar_agenda")) {
    normalized.add("ver_agenda");
  }

  if (normalized.has("editar_cliente")) {
    normalized.add("ver_cliente");
  }

  return Array.from(normalized);
}

async function createEmployee(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;
    const { name, email, phone, password, permissions } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        mensagem: "Nome, e-mail, telefone e senha são obrigatórios.",
      });
    }

    await connection.beginTransaction();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = String(phone).replace(/\D/g, "");
    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedPermissions = normalizePermissions(permissions);

    const [existingUsers] = await connection.query(
      `
      SELECT id, status, role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail],
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      if (existingUser.status === "active") {
        await connection.rollback();

        return res.status(400).json({
          mensagem: "Já existe um usuário ativo com esse e-mail.",
        });
      }

      await connection.query(
        `
        UPDATE users
        SET
          business_id = ?,
          name = ?,
          phone = ?,
          password = ?,
          role = 'employee',
          status = 'active'
        WHERE id = ?
        `,
        [businessId, cleanName, cleanPhone, hashedPassword, existingUser.id],
      );

      await connection.query(
        `
        DELETE FROM user_permissions
        WHERE user_id = ?
        `,
        [existingUser.id],
      );

      if (normalizedPermissions.length > 0) {
        const [permissionRows] = await connection.query(
          `
          SELECT id
          FROM permissions
          WHERE code IN (?)
          `,
          [normalizedPermissions],
        );

        for (const permission of permissionRows) {
          await connection.query(
            `
            INSERT IGNORE INTO user_permissions (user_id, permission_id)
            VALUES (?, ?)
            `,
            [existingUser.id, permission.id],
          );
        }
      }

      await connection.commit();

      return res.status(200).json({
        mensagem: "Funcionário reativado com sucesso.",
        employee: {
          id: existingUser.id,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
        },
      });
    }

    const [result] = await connection.query(
      `
      INSERT INTO users 
      (business_id, name, email, phone, password, role, status)
      VALUES (?, ?, ?, ?, ?, 'employee', 'active')
      `,
      [businessId, cleanName, cleanEmail, cleanPhone, hashedPassword],
    );

    const employeeId = result.insertId;

    if (normalizedPermissions.length > 0) {
      const [permissionRows] = await connection.query(
        `
        SELECT id
        FROM permissions
        WHERE code IN (?)
        `,
        [normalizedPermissions],
      );

      for (const permission of permissionRows) {
        await connection.query(
          `
          INSERT IGNORE INTO user_permissions (user_id, permission_id)
          VALUES (?, ?)
          `,
          [employeeId, permission.id],
        );
      }
    }

    await connection.commit();

    return res.status(201).json({
      mensagem: "Funcionário criado com sucesso.",
      employee: {
        id: employeeId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
      },
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      mensagem: "Erro ao criar funcionário.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function updateEmployee(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { name, email, phone, password } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!name || !email || !phone) {
      return res.status(400).json({
        mensagem: "Nome, e-mail e telefone são obrigatórios.",
      });
    }

    await connection.beginTransaction();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = String(phone).replace(/\D/g, "");

    const [employees] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
      AND business_id = ?
      AND role = 'employee'
      LIMIT 1
      `,
      [id, businessId],
    );

    if (employees.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        mensagem: "Funcionário não encontrado.",
      });
    }

    const [emailExists] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      AND id <> ?
      LIMIT 1
      `,
      [cleanEmail, id],
    );

    if (emailExists.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        mensagem: "Já existe outro usuário com esse e-mail.",
      });
    }

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);

      await connection.query(
        `
        UPDATE users
        SET name = ?, email = ?, phone = ?, password = ?
        WHERE id = ?
        AND business_id = ?
        `,
        [cleanName, cleanEmail, cleanPhone, hashedPassword, id, businessId],
      );
    } else {
      await connection.query(
        `
        UPDATE users
        SET name = ?, email = ?, phone = ?
        WHERE id = ?
        AND business_id = ?
        `,
        [cleanName, cleanEmail, cleanPhone, id, businessId],
      );
    }

    await connection.commit();

    return res.json({
      mensagem: "Funcionário atualizado com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      mensagem: "Erro ao atualizar funcionário.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function deleteEmployee(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE users
      SET status = 'inactive'
      WHERE id = ?
      AND business_id = ?
      AND role = 'employee'
      `,
      [id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Funcionário não encontrado.",
      });
    }

    return res.json({
      mensagem: "Funcionário excluído com sucesso.",
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao excluir funcionário.",
      erro: error.message,
    });
  }
}

async function listPermissions(req, res) {
  try {
    const [permissions] = await db.query(
      `
      SELECT id, code, name, group_name
      FROM permissions
      ORDER BY 
        group_name ASC,
        CASE
          WHEN code = 'ver_cliente' THEN 1
          WHEN code = 'editar_cliente' THEN 2

          WHEN code = 'ver_agenda' THEN 1
          WHEN code = 'editar_agenda' THEN 2

          WHEN code = 'ver_dashboard' THEN 1

          WHEN code = 'ver_fila' THEN 1
          WHEN code = 'criar_atendimento' THEN 2
          WHEN code = 'editar_atendimento' THEN 3
          WHEN code = 'alterar_status' THEN 4
          WHEN code = 'cancelar_atendimento' THEN 5

          WHEN code = 'ver_servicos' THEN 1
          WHEN code = 'criar_servico' THEN 2
          WHEN code = 'editar_servico' THEN 3
          WHEN code = 'excluir_servico' THEN 4

          WHEN code = 'ver_categorias' THEN 5
          WHEN code = 'criar_categoria' THEN 6
          WHEN code = 'editar_categoria' THEN 7
          WHEN code = 'excluir_categoria' THEN 8

          WHEN code = 'ver_equipe' THEN 1
          WHEN code = 'criar_funcionario' THEN 2
          WHEN code = 'editar_funcionario' THEN 3
          WHEN code = 'excluir_funcionario' THEN 4

          ELSE 99
        END ASC,
        name ASC
      `,
    );

    return res.json({
      mensagem: "Permissões listadas com sucesso.",
      permissions,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar permissões.",
      erro: error.message,
    });
  }
}

async function getEmployeePermissions(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [employees] = await db.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
      AND business_id = ?
      AND role = 'employee'
      LIMIT 1
      `,
      [id, businessId],
    );

    if (employees.length === 0) {
      return res.status(404).json({
        mensagem: "Funcionário não encontrado.",
      });
    }

    const [permissions] = await db.query(
      `
      SELECT p.code
      FROM user_permissions up
      INNER JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
      `,
      [id],
    );

    return res.json({
      mensagem: "Permissões do funcionário listadas com sucesso.",
      permissions: permissions.map((permission) => permission.code),
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar permissões do funcionário.",
      erro: error.message,
    });
  }
}

async function updateEmployeePermissions(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        mensagem: "Permissões inválidas.",
      });
    }

    await connection.beginTransaction();

    const [employees] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
      AND business_id = ?
      AND role = 'employee'
      LIMIT 1
      `,
      [id, businessId],
    );

    if (employees.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        mensagem: "Funcionário não encontrado.",
      });
    }

    await connection.query(
      `
      DELETE FROM user_permissions
      WHERE user_id = ?
      `,
      [id],
    );

    const normalizedPermissions = normalizePermissions(permissions);

    if (normalizedPermissions.length > 0) {
      const [permissionRows] = await connection.query(
        `
        SELECT id, code
        FROM permissions
        WHERE code IN (?)
        `,
        [normalizedPermissions],
      );

      for (const permission of permissionRows) {
        await connection.query(
          `
          INSERT IGNORE INTO user_permissions (user_id, permission_id)
          VALUES (?, ?)
          `,
          [id, permission.id],
        );
      }
    }

    await connection.commit();

    return res.json({
      mensagem: "Permissões atualizadas com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      mensagem: "Erro ao atualizar permissões.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function getMyPermissions(req, res) {
  try {
    const user = req.user;

    if (user.role === "super_admin" || user.role === "owner") {
      const [permissions] = await db.query(
        `
        SELECT code
        FROM permissions
        `,
      );

      return res.json({
        mensagem: "Permissões listadas com sucesso.",
        role: user.role,
        permissions: permissions.map((permission) => permission.code),
      });
    }

    const [permissions] = await db.query(
      `
      SELECT p.code
      FROM user_permissions up
      INNER JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
      `,
      [user.id],
    );

    return res.json({
      mensagem: "Permissões listadas com sucesso.",
      role: user.role,
      permissions: permissions.map((permission) => permission.code),
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar permissões do usuário.",
      erro: error.message,
    });
  }
}

async function listResponsibles(req, res) {
  try {
    const businessId = req.user.business_id;

    const [employees] = await db.query(
      `
      SELECT id, name
      FROM users
      WHERE business_id = ?
      AND status = 'active'
      ORDER BY name ASC
      `,
      [businessId],
    );

    return res.json({
      employees,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar responsáveis.",
      erro: error.message,
    });
  }
}

module.exports = {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listPermissions,
  getEmployeePermissions,
  updateEmployeePermissions,
  getMyPermissions,
  listResponsibles,
};
