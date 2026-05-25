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

    res.json({
      mensagem: "Funcionários listados com sucesso.",
      employees,
    });
  } catch (error) {
    res.status(500).json({
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

    const [existingUsers] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email],
    );

    if (existingUsers.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        mensagem: "Já existe um usuário cadastrado com este e-mail.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      `
      INSERT INTO users 
      (business_id, name, email, phone, password, role, status)
      VALUES (?, ?, ?, ?, ?, 'employee', 'active')
      `,
      [businessId, name.trim(), email.trim(), phone.trim(), hashedPassword],
    );

    const employeeId = result.insertId;

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
          [employeeId, permission.id],
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      mensagem: "Funcionário criado com sucesso.",
      employee: {
        id: employeeId,
        name,
        email,
        phone,
      },
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
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

    if (!name || !email || !phone) {
      return res.status(400).json({
        mensagem: "Nome, e-mail e telefone são obrigatórios.",
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
      AND status = 'active'
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

    const [emailUsers] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      AND id <> ?
      LIMIT 1
      `,
      [email, id],
    );

    if (emailUsers.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        mensagem: "Este e-mail já está sendo usado por outro usuário.",
      });
    }

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await connection.query(
        `
        UPDATE users
        SET name = ?, email = ?, phone = ?, password = ?
        WHERE id = ?
        AND business_id = ?
        `,
        [
          name.trim(),
          email.trim(),
          phone.trim(),
          hashedPassword,
          id,
          businessId,
        ],
      );
    } else {
      await connection.query(
        `
        UPDATE users
        SET name = ?, email = ?, phone = ?
        WHERE id = ?
        AND business_id = ?
        `,
        [name.trim(), email.trim(), phone.trim(), id, businessId],
      );
    }

    await connection.commit();

    res.json({
      mensagem: "Funcionário atualizado com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
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

    res.json({
      mensagem: "Funcionário excluído com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
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
      ORDER BY group_name ASC, name ASC
      `,
    );

    res.json({
      mensagem: "Permissões listadas com sucesso.",
      permissions,
    });
  } catch (error) {
    res.status(500).json({
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

    res.json({
      mensagem: "Permissões do funcionário listadas com sucesso.",
      permissions: permissions.map((permission) => permission.code),
    });
  } catch (error) {
    res.status(500).json({
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

    res.json({
      mensagem: "Permissões atualizadas com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
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

    res.json({
      mensagem: "Permissões listadas com sucesso.",
      role: user.role,
      permissions: permissions.map((permission) => permission.code),
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao buscar permissões do usuário.",
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
};
