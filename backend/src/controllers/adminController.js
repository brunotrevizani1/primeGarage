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

async function updateBusiness(req, res) {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const {
      businessName,
      businessPhone,
      businessAddress,
      status,
      customerPageName,
      customerPagePhrase,
      customerPageLogoUrl,
      addressStreet,
      addressNumber,
      addressNeighborhood,
      addressCity,
      addressState,
      ownerId,
      ownerName,
      ownerCpf,
      ownerEmail,
      ownerPhone,
      ownerStatus,
      ownerPassword,
      permissions,
    } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        mensagem: "Nome do lavajato é obrigatório.",
      });
    }

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        mensagem: "Status do lavajato inválido.",
      });
    }

    if (ownerId && ownerStatus && !["active", "inactive"].includes(ownerStatus)) {
      return res.status(400).json({
        mensagem: "Status do dono inválido.",
      });
    }

    if (
      ownerId &&
      (!ownerName || !ownerName.trim() || !ownerCpf || !ownerCpf.trim() || !ownerEmail || !ownerEmail.trim())
    ) {
      return res.status(400).json({
        mensagem: "Nome, CPF e e-mail do dono são obrigatórios.",
      });
    }

    await connection.beginTransaction();

    const [businessResult] = await connection.query(
      `
      UPDATE businesses
      SET
        name = ?, phone = ?, address = ?, status = COALESCE(?, status),
        customer_page_name = ?, customer_page_phrase = ?, customer_page_logo_url = ?,
        address_street = ?, address_number = ?, address_neighborhood = ?, address_city = ?, address_state = ?
      WHERE id = ?
      RETURNING id
      `,
      [
        businessName.trim(),
        businessPhone || null,
        businessAddress || null,
        status || null,
        customerPageName ? customerPageName.trim() : null,
        customerPagePhrase ? customerPagePhrase.trim() : null,
        customerPageLogoUrl ? customerPageLogoUrl.trim() : null,
        addressStreet ? addressStreet.trim() : null,
        addressNumber ? addressNumber.trim() : null,
        addressNeighborhood ? addressNeighborhood.trim() : null,
        addressCity ? addressCity.trim() : null,
        addressState ? addressState.trim() : null,
        id,
      ],
    );

    if (!businessResult.rows || businessResult.rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        mensagem: "Lavajato não encontrado.",
      });
    }

    if (ownerId) {
      const [ownerCheck] = await connection.query(
        "SELECT id FROM users WHERE id = ? AND business_id = ? AND role = 'owner'",
        [ownerId, id],
      );

      if (ownerCheck.length === 0) {
        await connection.rollback();

        return res.status(400).json({
          mensagem: "Dono informado não pertence a este lavajato.",
        });
      }

      const ownerParams = [
        ownerName.trim(),
        ownerCpf.trim(),
        ownerEmail.trim(),
        ownerPhone || null,
        ownerStatus || null,
      ];

      if (ownerPassword && ownerPassword.trim()) {
        const hashedPassword = await bcrypt.hash(ownerPassword.trim(), 10);

        await connection.query(
          `
          UPDATE users
          SET name = ?, cpf = ?, email = ?, phone = ?, status = COALESCE(?, status), password = ?
          WHERE id = ?
          `,
          [...ownerParams, hashedPassword, ownerId],
        );
      } else {
        await connection.query(
          `
          UPDATE users
          SET name = ?, cpf = ?, email = ?, phone = ?, status = COALESCE(?, status)
          WHERE id = ?
          `,
          [...ownerParams, ownerId],
        );
      }

      if (Array.isArray(permissions)) {
        await connection.query("DELETE FROM user_permissions WHERE user_id = ?", [ownerId]);

        for (const permissionId of permissions) {
          await connection.query(
            `
            INSERT INTO user_permissions (user_id, permission_id, allowed)
            VALUES (?, ?, true)
            ON CONFLICT (user_id, permission_id) DO NOTHING
            `,
            [ownerId, permissionId],
          );
        }
      }
    }

    await connection.commit();

    res.json({
      mensagem: "Lavajato atualizado com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      mensagem: "Erro ao atualizar lavajato.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function listBusinesses(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT
        b.id, b.name, b.phone, b.address, b.status, b.created_at,
        b.customer_page_name, b.customer_page_phrase, b.customer_page_logo_url,
        b.address_street, b.address_number, b.address_neighborhood, b.address_city, b.address_state,
        u.id AS owner_id, u.name AS owner_name, u.email AS owner_email,
        u.cpf AS owner_cpf, u.phone AS owner_phone, u.status AS owner_status,
        COALESCE(array_agg(up.permission_id) FILTER (WHERE up.permission_id IS NOT NULL), '{}') AS owner_permission_ids
      FROM businesses b
      LEFT JOIN users u ON u.business_id = b.id AND u.role = 'owner'
      LEFT JOIN user_permissions up ON up.user_id = u.id
      GROUP BY b.id, u.id
      ORDER BY b.created_at DESC
    `);

    const businesses = rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      address: row.address,
      status: row.status,
      created_at: row.created_at,
      customerPageName: row.customer_page_name,
      customerPagePhrase: row.customer_page_phrase,
      customerPageLogoUrl: row.customer_page_logo_url,
      addressStreet: row.address_street,
      addressNumber: row.address_number,
      addressNeighborhood: row.address_neighborhood,
      addressCity: row.address_city,
      addressState: row.address_state,
      owner: row.owner_id
        ? {
            id: row.owner_id,
            name: row.owner_name,
            email: row.owner_email,
            cpf: row.owner_cpf,
            phone: row.owner_phone,
            status: row.owner_status,
            permissions: row.owner_permission_ids || [],
          }
        : null,
    }));

    res.json({
      mensagem: "Lavajatos listados com sucesso.",
      businesses,
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao listar lavajatos.",
      erro: error.message,
    });
  }
}

module.exports = {
  createBusinessWithOwner,
  listBusinesses,
  updateBusiness,
};
