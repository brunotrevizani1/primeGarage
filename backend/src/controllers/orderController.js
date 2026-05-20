const db = require("../database/connection");

async function createOrder(req, res) {
  const connection = await db.getConnection();

  try {
    const businessId = req.user.business_id;

    const {
      customerName,
      customerPhone,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
      serviceId,
      responsibleUserId,
      price,
      notes,
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
      !serviceId ||
      !price
    ) {
      return res.status(400).json({
        mensagem: "Nome, telefone, placa, serviço e preço são obrigatórios.",
      });
    }

    await connection.beginTransaction();

    let customerId;

    const [existingCustomers] = await connection.query(
      `
      SELECT id 
      FROM customers 
      WHERE business_id = ? AND phone = ?
      LIMIT 1
      `,
      [businessId, customerPhone],
    );

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;

      await connection.query(
        `
        UPDATE customers
        SET name = ?
        WHERE id = ? AND business_id = ?
        `,
        [customerName, customerId, businessId],
      );
    } else {
      const [customerResult] = await connection.query(
        `
        INSERT INTO customers (business_id, name, phone)
        VALUES (?, ?, ?)
        `,
        [businessId, customerName, customerPhone],
      );

      customerId = customerResult.insertId;
    }

    let vehicleId;

    const [existingVehicles] = await connection.query(
      `
      SELECT id
      FROM vehicles
      WHERE business_id = ? AND plate = ?
      LIMIT 1
      `,
      [businessId, vehiclePlate],
    );

    if (existingVehicles.length > 0) {
      vehicleId = existingVehicles[0].id;

      await connection.query(
        `
        UPDATE vehicles
        SET customer_id = ?, model = ?, color = ?
        WHERE id = ? AND business_id = ?
        `,
        [
          customerId,
          vehicleModel || null,
          vehicleColor || null,
          vehicleId,
          businessId,
        ],
      );
    } else {
      const [vehicleResult] = await connection.query(
        `
        INSERT INTO vehicles (business_id, customer_id, plate, model, color)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          businessId,
          customerId,
          vehiclePlate,
          vehicleModel || null,
          vehicleColor || null,
        ],
      );

      vehicleId = vehicleResult.insertId;
    }

    const [orderResult] = await connection.query(
      `
      INSERT INTO service_orders
      (business_id, customer_id, vehicle_id, service_id, responsible_user_id, status, price, notes)
      VALUES (?, ?, ?, ?, ?, 'na_fila', ?, ?)
      `,
      [
        businessId,
        customerId,
        vehicleId,
        serviceId,
        responsibleUserId || null,
        price,
        notes || null,
      ],
    );

    await connection.commit();

    res.status(201).json({
      mensagem: "Atendimento criado com sucesso.",
      order: {
        id: orderResult.insertId,
        customerId,
        vehicleId,
        status: "na_fila",
      },
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      mensagem: "Erro ao criar atendimento.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function listTodayQueue(req, res) {
  try {
    const businessId = req.user.business_id;

    const [orders] = await db.query(
      `
      SELECT 
        so.id,
        so.status,
        so.price,
        so.notes,
        so.entry_time,
        c.name AS customer_name,
        c.phone AS customer_phone,
        v.plate AS vehicle_plate,
        v.model AS vehicle_model,
        v.color AS vehicle_color,
        s.name AS service_name,
        u.name AS responsible_name
      FROM service_orders so
      INNER JOIN customers c ON so.customer_id = c.id
      INNER JOIN vehicles v ON so.vehicle_id = v.id
      INNER JOIN services s ON so.service_id = s.id
      LEFT JOIN users u ON so.responsible_user_id = u.id
      WHERE so.business_id = ?
      AND DATE(so.entry_time) = CURDATE()
      ORDER BY so.entry_time ASC
      `,
      [businessId],
    );

    res.json({
      mensagem: "Fila do dia listada com sucesso.",
      orders,
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao listar fila do dia.",
      erro: error.message,
    });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      "na_fila",
      "em_lavagem",
      "pronto",
      "entregue",
      "cancelado",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        mensagem: "Status inválido.",
      });
    }

    let timeField = "";

    if (status === "em_lavagem") {
      timeField = ", start_time = NOW()";
    }

    if (status === "pronto") {
      timeField = ", finished_time = NOW()";
    }

    if (status === "entregue") {
      timeField = ", delivered_time = NOW()";
    }

    const [result] = await db.query(
      `
      UPDATE service_orders
      SET status = ? ${timeField}
      WHERE id = ? AND business_id = ?
      `,
      [status, id, businessId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Atendimento não encontrado.",
      });
    }

    res.json({
      mensagem: "Status atualizado com sucesso.",
      status,
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao atualizar status.",
      erro: error.message,
    });
  }
}

async function updateOrder(req, res) {
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
      serviceId,
      responsibleUserId,
      price,
      notes,
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
      !vehicleColor ||
      !serviceId ||
      !price
    ) {
      return res.status(400).json({
        mensagem: "Preencha todos os campos obrigatórios.",
      });
    }

    await connection.beginTransaction();

    const [orders] = await connection.query(
      `
      SELECT 
        id,
        customer_id,
        vehicle_id,
        status,
        price
      FROM service_orders
      WHERE id = ? AND business_id = ?
      LIMIT 1
      `,
      [id, businessId],
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        mensagem: "Atendimento não encontrado.",
      });
    }

    const order = orders[0];

    if (order.status === "entregue") {
      await connection.rollback();

      return res.status(400).json({
        mensagem: "Atendimentos entregues não podem ser editados.",
      });
    }

    const [payments] = await connection.query(
      `
      SELECT id
      FROM payments
      WHERE service_order_id = ?
      AND business_id = ?
      AND status = 'pago'
      LIMIT 1
      `,
      [id, businessId],
    );

    const hasPayment = payments.length > 0;
    const newPrice = Number(price);
    const oldPrice = Number(order.price);

    if (hasPayment && newPrice !== oldPrice) {
      await connection.rollback();

      return res.status(400).json({
        mensagem:
          "Este atendimento já possui pagamento registrado. O valor não pode ser alterado.",
      });
    }

    const cleanPlate = vehiclePlate.toUpperCase().replace(/[^A-Z0-9]/g, "");

    await connection.query(
      `
      UPDATE customers
      SET name = ?, phone = ?
      WHERE id = ? AND business_id = ?
      `,
      [customerName, customerPhone, order.customer_id, businessId],
    );

    await connection.query(
      `
      UPDATE vehicles
      SET plate = ?, model = ?, color = ?
      WHERE id = ? AND business_id = ?
      `,
      [cleanPlate, vehicleModel, vehicleColor, order.vehicle_id, businessId],
    );

    await connection.query(
      `
      UPDATE service_orders
      SET 
        service_id = ?,
        responsible_user_id = ?,
        price = ?,
        notes = ?
      WHERE id = ? AND business_id = ?
      `,
      [
        serviceId,
        responsibleUserId || null,
        newPrice,
        notes || null,
        id,
        businessId,
      ],
    );

    await connection.commit();

    res.json({
      mensagem: "Atendimento atualizado com sucesso.",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      mensagem: "Erro ao editar atendimento.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

async function getOrderById(req, res) {
  try {
    const businessId = req.user.business_id;
    const { id } = req.params;

    const [orders] = await db.query(
      `
      SELECT 
        so.id,
        so.status,
        so.price,
        so.notes,
        so.service_id,
        so.responsible_user_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        v.plate AS vehicle_plate,
        v.model AS vehicle_model,
        v.color AS vehicle_color,
        s.name AS service_name,
        EXISTS (
          SELECT 1 
          FROM payments p
          WHERE p.service_order_id = so.id
          AND p.business_id = so.business_id
          AND p.status = 'pago'
        ) AS has_payment
      FROM service_orders so
      INNER JOIN customers c ON so.customer_id = c.id
      INNER JOIN vehicles v ON so.vehicle_id = v.id
      INNER JOIN services s ON so.service_id = s.id
      WHERE so.id = ?
      AND so.business_id = ?
      LIMIT 1
      `,
      [id, businessId],
    );

    if (orders.length === 0) {
      return res.status(404).json({
        mensagem: "Atendimento não encontrado.",
      });
    }

    res.json({
      mensagem: "Atendimento encontrado com sucesso.",
      order: orders[0],
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao buscar atendimento.",
      erro: error.message,
    });
  }
}

module.exports = {
  createOrder,
  listTodayQueue,
  updateOrderStatus,
  updateOrder,
  getOrderById,
};
