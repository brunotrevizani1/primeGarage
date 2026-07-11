const bcrypt = require("bcrypt");
const db = require("../database/connection");

async function createBusinessWithOwner(req, res) {
  const connection = await db.getConnection();

  try {
    const {
      businessName,
      businessPhone,
      businessAddress,
      ownerName,
      ownerCpf,
      ownerEmail,
      ownerPassword,
      permissions,
    } = req.body;

    if (
      !businessName ||
      !ownerName ||
      !ownerCpf ||
      !ownerEmail ||
      !ownerPassword
    ) {
      return res.status(400).json({
        mensagem: "Dados obrigatórios não informados.",
      });
    }

    await connection.beginTransaction();

    const [businessResult] = await connection.query(
      `
      INSERT INTO businesses (name, phone, address, status)
      VALUES (?, ?, ?, 'active')
      RETURNING id
      `,
      [businessName, businessPhone || null, businessAddress || null],
    );

    const businessId = businessResult.insertId;

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    const [userResult] = await connection.query(
      `
      INSERT INTO users (business_id, cpf, name, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, 'owner', 'active')
      RETURNING id
      `,
      [businessId, ownerCpf, ownerName, ownerEmail, hashedPassword],
    );

    const ownerId = userResult.insertId;

    if (Array.isArray(permissions) && permissions.length > 0) {
      for (const permissionId of permissions) {
        await connection.query(
          `
          INSERT INTO user_permissions (user_id, permission_id, allowed)
          VALUES (?, ?, true)
          `,
          [ownerId, permissionId],
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      mensagem: "Lavajato e dono criados com sucesso.",
      business: {
        id: businessId,
        name: businessName,
      },
      owner: {
        id: ownerId,
        name: ownerName,
        email: ownerEmail,
      },
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      mensagem: "Erro ao criar lavajato e dono.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  createBusinessWithOwner,
};
