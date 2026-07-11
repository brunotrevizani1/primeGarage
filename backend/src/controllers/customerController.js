const db = require("../database/connection");

function normalizePage(value) {
  const page = Number(value || 1);

  if (Number.isNaN(page) || page < 1) {
    return 1;
  }

  return page;
}

function normalizeLimit(value) {
  const limit = Number(value || 10);

  if (Number.isNaN(limit) || limit < 1) {
    return 10;
  }

  if (limit > 50) {
    return 50;
  }

  return limit;
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePlate(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

async function listCustomers(req, res) {
  try {
    const businessId = req.user.business_id;
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit);
    const search = String(req.query.search || "").trim();

    const offset = (page - 1) * limit;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    const queryParams = [businessId];
    const countParams = [businessId];

    let searchSql = "";

    if (search) {
      searchSql = `
        AND (
          c.name ILIKE ?
          OR c.phone ILIKE ?
          OR v.plate ILIKE ?
          OR v.model ILIKE ?
          OR v.color ILIKE ?
        )
      `;

      const searchValue = `%${search}%`;

      queryParams.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
      );

      countParams.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
      );
    }

    const [countResult] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM vehicles v
      INNER JOIN customers c ON c.id = v.customer_id
      WHERE v.business_id = ?
      ${searchSql}
      `,
      countParams,
    );

    const total = Number(countResult[0]?.total || 0);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    queryParams.push(limit, offset);

    const [customers] = await db.query(
      `
      SELECT
        v.id,
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        v.plate AS vehicle_plate,
        v.model AS vehicle_model,
        v.color AS vehicle_color
      FROM vehicles v
      INNER JOIN customers c ON c.id = v.customer_id
      WHERE v.business_id = ?
      ${searchSql}
      ORDER BY v.id DESC
      LIMIT ? OFFSET ?
      `,
      queryParams,
    );

    return res.json({
      mensagem: "Clientes listados com sucesso.",
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar clientes.",
      erro: error.message,
    });
  }
}

async function createCustomer(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;

    const {
      customerName,
      customerPhone,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
    } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (
      !customerName ||
      !customerPhone ||
      !vehiclePlate ||
      !vehicleModel ||
      !vehicleColor
    ) {
      return res.status(400).json({
        mensagem: "Nome, telefone, placa, modelo e cor são obrigatórios.",
      });
    }

    const cleanPlate = normalizePlate(vehiclePlate);
    const cleanPhone = onlyNumbers(customerPhone);

    if (cleanPlate.length < 7) {
      return res.status(400).json({
        mensagem: "Informe uma placa válida.",
      });
    }

    await connection.beginTransaction();

    const [plateExists] = await connection.query(
      `
      SELECT id
      FROM vehicles
      WHERE business_id = ?
      AND plate = ?
      LIMIT 1
      `,
      [businessId, cleanPlate],
    );

    if (plateExists.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        mensagem: "Já existe um cliente/veículo cadastrado com essa placa.",
      });
    }

    const [customerResult] = await connection.query(
      `
      INSERT INTO customers
      (business_id, name, phone, email)
      VALUES (?, ?, ?, NULL)
      RETURNING id
      `,
      [businessId, customerName.trim(), cleanPhone],
    );

    const customerId = customerResult.insertId;

    const [vehicleResult] = await connection.query(
      `
      INSERT INTO vehicles
      (business_id, customer_id, plate, model, color, notes)
      VALUES (?, ?, ?, ?, ?, NULL)
      RETURNING id
      `,
      [
        businessId,
        customerId,
        cleanPlate,
        vehicleModel.trim(),
        vehicleColor.trim(),
      ],
    );

    await connection.commit();

    return res.status(201).json({
      mensagem: "Cliente cadastrado com sucesso.",
      customer: {
        id: vehicleResult.insertId,
        customer_id: customerId,
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        vehicle_plate: cleanPlate,
        vehicle_model: vehicleModel.trim(),
        vehicle_color: vehicleColor.trim(),
      },
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      mensagem: "Erro ao cadastrar cliente.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function updateCustomer(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const {
      customerName,
      customerPhone,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
    } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (
      !customerName ||
      !customerPhone ||
      !vehiclePlate ||
      !vehicleModel ||
      !vehicleColor
    ) {
      return res.status(400).json({
        mensagem: "Nome, telefone, placa, modelo e cor são obrigatórios.",
      });
    }

    const cleanPlate = normalizePlate(vehiclePlate);
    const cleanPhone = onlyNumbers(customerPhone);

    if (cleanPlate.length < 7) {
      return res.status(400).json({
        mensagem: "Informe uma placa válida.",
      });
    }

    await connection.beginTransaction();

    const [vehicles] = await connection.query(
      `
      SELECT id, customer_id, plate
      FROM vehicles
      WHERE id = ?
      AND business_id = ?
      LIMIT 1
      `,
      [id, businessId],
    );

    if (vehicles.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        mensagem: "Cliente/veículo não encontrado.",
      });
    }

    const vehicle = vehicles[0];

    const [plateExists] = await connection.query(
      `
      SELECT id
      FROM vehicles
      WHERE business_id = ?
      AND plate = ?
      AND id <> ?
      LIMIT 1
      `,
      [businessId, cleanPlate, id],
    );

    if (plateExists.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        mensagem: "Já existe outro veículo com essa placa.",
      });
    }

    await connection.query(
      `
      UPDATE customers
      SET
        name = ?,
        phone = ?
      WHERE id = ?
      AND business_id = ?
      `,
      [customerName.trim(), cleanPhone, vehicle.customer_id, businessId],
    );

    await connection.query(
      `
      UPDATE vehicles
      SET
        plate = ?,
        model = ?,
        color = ?
      WHERE id = ?
      AND business_id = ?
      `,
      [cleanPlate, vehicleModel.trim(), vehicleColor.trim(), id, businessId],
    );

    await connection.commit();

    return res.json({
      mensagem: "Cliente atualizado com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      mensagem: "Erro ao atualizar cliente.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
};
