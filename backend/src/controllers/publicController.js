const db = require("../database/connection");

async function getPublicVehicleByPlate(req, res) {
  try {
    const { businessId, plate } = req.params;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Lava-jato não informado.",
      });
    }

    if (!plate) {
      return res.status(400).json({
        mensagem: "Placa não informada.",
      });
    }

    const cleanPlate = String(plate || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);

    if (cleanPlate.length < 7) {
      return res.status(400).json({
        mensagem: "Informe uma placa válida.",
      });
    }

    const [vehicles] = await db.query(
      `
      SELECT
        v.id,
        v.plate,
        v.model,
        v.color,
        c.name AS customer_name,
        c.phone AS customer_phone
      FROM vehicles v
      INNER JOIN customers c ON c.id = v.customer_id
      WHERE v.business_id = ?
      AND v.plate = ?
      LIMIT 1
      `,
      [businessId, cleanPlate],
    );

    if (vehicles.length === 0) {
      return res.status(404).json({
        mensagem: "Veículo não encontrado.",
      });
    }

    const vehicle = vehicles[0];

    return res.json({
      mensagem: "Veículo encontrado com sucesso.",
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model,
        color: vehicle.color,
        customerName: vehicle.customer_name,
        customerPhone: vehicle.customer_phone,
      },
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar veículo.",
      erro: error.message,
    });
  }
}

async function getCustomerPage(req, res) {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Lava-jato não informado.",
      });
    }

    const [businesses] = await db.query(
      `
      SELECT
        id,
        name,
        customer_page_name,
        customer_page_phrase,
        customer_page_logo_url,
        address_street,
        address_number,
        address_neighborhood,
        address_city,
        address_state
      FROM businesses
      WHERE id = ?
      `,
      [businessId],
    );

    if (businesses.length === 0) {
      return res.status(404).json({
        mensagem: "Lava-jato não encontrado.",
      });
    }

    const [workingHours] = await db.query(
      `
      SELECT
        weekday,
        is_open,
        TO_CHAR(open_time, 'HH24:MI') AS open_time,
        TO_CHAR(close_time, 'HH24:MI') AS close_time,
        has_lunch_break,
        TO_CHAR(lunch_start, 'HH24:MI') AS lunch_start,
        TO_CHAR(lunch_end, 'HH24:MI') AS lunch_end
      FROM business_working_hours
      WHERE business_id = ?
      ORDER BY weekday ASC
      `,
      [businessId],
    );

    const business = businesses[0];

    return res.json({
      mensagem: "Página do cliente carregada com sucesso.",
      business: {
        id: business.id,
        name: business.customer_page_name || business.name,
        phrase:
          business.customer_page_phrase ||
          "Agende sua lavagem de forma rápida e prática.",
        logoUrl: business.customer_page_logo_url || "",

        addressStreet: business.address_street || "",
        addressNumber: business.address_number || "",
        addressNeighborhood: business.address_neighborhood || "",
        addressCity: business.address_city || "",
        addressState: business.address_state || "",

        workingHours,
      },
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao carregar página do cliente.",
      erro: error.message,
    });
  }
}

async function listPublicServicesByCategory(req, res) {
  try {
    const { businessId } = req.params;
    const { categoryId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Lava-jato não informado.",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        mensagem: "Categoria não informada.",
      });
    }

    const [businesses] = await db.query(
      `
      SELECT
        id,
        name,
        customer_page_name,
        customer_page_logo_url
      FROM businesses
      WHERE id = ?
      `,
      [businessId],
    );

    if (businesses.length === 0) {
      return res.status(404).json({
        mensagem: "Lava-jato não encontrado.",
      });
    }

    const [categories] = await db.query(
      `
      SELECT
        id,
        name
      FROM service_categories
      WHERE id = ?
      AND business_id = ?
      AND status = 'active'
      `,
      [categoryId, businessId],
    );

    if (categories.length === 0) {
      return res.status(404).json({
        mensagem: "Categoria não encontrada.",
      });
    }

    const [services] = await db.query(
      `
      SELECT
        id,
        name,
        description,
        price,
        duration_minutes
      FROM services
      WHERE business_id = ?
      AND category_id = ?
      AND status = 'active'
      ORDER BY name ASC
      `,
      [businessId, categoryId],
    );

    const business = businesses[0];

    return res.json({
      mensagem: "Serviços listados com sucesso.",
      business: {
        id: business.id,
        name: business.customer_page_name || business.name,
        logoUrl: business.customer_page_logo_url || "",
      },
      category: categories[0],
      services,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar serviços.",
      erro: error.message,
    });
  }
}

async function listPublicCategories(req, res) {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Lava-jato não informado.",
      });
    }

    const [businesses] = await db.query(
      `
      SELECT
        id,
        name,
        customer_page_name,
        customer_page_logo_url
      FROM businesses
      WHERE id = ?
      `,
      [businessId],
    );

    if (businesses.length === 0) {
      return res.status(404).json({
        mensagem: "Lava-jato não encontrado.",
      });
    }

    const [categories] = await db.query(
      `
  SELECT
    id,
    name
  FROM service_categories
  WHERE business_id = ?
  AND status = 'active'
  ORDER BY name ASC
  `,
      [businessId],
    );

    const business = businesses[0];

    return res.json({
      mensagem: "Categorias listadas com sucesso.",
      business: {
        id: business.id,
        name: business.customer_page_name || business.name,
        logoUrl: business.customer_page_logo_url || "",
      },
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao listar categorias.",
      erro: error.message,
    });
  }
}

const defaultScheduleSettings = {
  schedule_type: "time_slots",
  slot_interval_minutes: 60,
  vehicles_per_slot: 1,
  daily_limit: 20,
  morning_limit: 8,
  afternoon_limit: 10,
  night_limit: 0,
};

function toBoolean(value) {
  return value === true || value === 1 || value === "1";
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateTimeSlots(dayConfig, intervalMinutes) {
  const openMins = timeToMinutes(dayConfig.open_time);
  const closeMins = timeToMinutes(dayConfig.close_time);
  if (openMins === null || closeMins === null) return [];

  const hasLunch = toBoolean(dayConfig.has_lunch_break);
  const lunchStartMins = hasLunch ? timeToMinutes(dayConfig.lunch_start) : null;
  const lunchEndMins = hasLunch ? timeToMinutes(dayConfig.lunch_end) : null;

  const slots = [];
  let current = openMins;

  while (current + intervalMinutes <= closeMins) {
    const slotEnd = current + intervalMinutes;
    const overlapsLunch =
      lunchStartMins !== null &&
      lunchEndMins !== null &&
      current < lunchEndMins &&
      slotEnd > lunchStartMins;

    if (!overlapsLunch) {
      slots.push(minutesToTime(current));
    }

    current += intervalMinutes;
  }

  return slots;
}

async function getPublicScheduleSettings(req, res) {
  try {
    const { businessId } = req.params;

    const [rows] = await db.query(
      `
      SELECT schedule_type, slot_interval_minutes, vehicles_per_slot,
             daily_limit, morning_limit, afternoon_limit, night_limit
      FROM business_schedule_settings
      WHERE business_id = ?
      LIMIT 1
      `,
      [businessId],
    );

    return res.json({
      mensagem: "Configurações carregadas com sucesso.",
      settings: rows[0] || defaultScheduleSettings,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao carregar configurações.",
      erro: error.message,
    });
  }
}

async function getPublicMonthAvailability(req, res) {
  try {
    const { businessId } = req.params;
    const { year, month } = req.query;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (!yearNum || !monthNum || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ mensagem: "Ano e mês inválidos." });
    }

    const [settingsRows] = await db.query(
      `SELECT schedule_type, slot_interval_minutes, vehicles_per_slot,
              daily_limit, morning_limit, afternoon_limit, night_limit
       FROM business_schedule_settings WHERE business_id = ? LIMIT 1`,
      [businessId],
    );
    const settings = settingsRows[0] || defaultScheduleSettings;

    const [workingHoursRows] = await db.query(
      `SELECT weekday, is_open,
              TO_CHAR(open_time, 'HH24:MI') AS open_time,
              TO_CHAR(close_time, 'HH24:MI') AS close_time,
              has_lunch_break,
              TO_CHAR(lunch_start, 'HH24:MI') AS lunch_start,
              TO_CHAR(lunch_end, 'HH24:MI') AS lunch_end
       FROM business_working_hours WHERE business_id = ?`,
      [businessId],
    );

    const [blocks] = await db.query(
      `SELECT TO_CHAR(block_date, 'YYYY-MM-DD') AS block_date, reason
       FROM business_schedule_blocks
       WHERE business_id = ? AND is_full_day = true
         AND EXTRACT(YEAR FROM block_date) = ? AND EXTRACT(MONTH FROM block_date) = ?`,
      [businessId, yearNum, monthNum],
    );
    const blockedDates = new Set(blocks.map((b) => b.block_date));
    const blockReasons = {};
    for (const b of blocks) {
      blockReasons[b.block_date] = b.reason || null;
    }

    const [orderRows] = await db.query(
      `SELECT TO_CHAR(scheduled_date, 'YYYY-MM-DD') AS date,
              scheduled_time,
              scheduled_period,
              COUNT(*) AS cnt
       FROM service_orders
       WHERE business_id = ?
         AND EXTRACT(YEAR FROM scheduled_date) = ?
         AND EXTRACT(MONTH FROM scheduled_date) = ?
         AND status NOT IN ('cancelado')
       GROUP BY scheduled_date, scheduled_time, scheduled_period`,
      [businessId, yearNum, monthNum],
    );

    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const days = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      if (dateStr < todayStr) {
        days[dateStr] = "past";
        continue;
      }

      const weekday = new Date(yearNum, monthNum - 1, day).getDay();
      const dayConfig = workingHoursRows.find(
        (w) => Number(w.weekday) === weekday,
      );

      if (!dayConfig || !toBoolean(dayConfig.is_open)) {
        days[dateStr] = "closed";
        continue;
      }

      if (blockedDates.has(dateStr)) {
        days[dateStr] = "blocked";
        continue;
      }

      const dateOrders = orderRows.filter((o) => o.date === dateStr);

      if (settings.schedule_type === "daily") {
        const total = dateOrders.reduce((s, o) => s + Number(o.cnt), 0);
        days[dateStr] = total < settings.daily_limit ? "available" : "full";
      } else if (settings.schedule_type === "periods") {
        const morning = dateOrders
          .filter((o) => o.scheduled_period === "morning")
          .reduce((s, o) => s + Number(o.cnt), 0);
        const afternoon = dateOrders
          .filter((o) => o.scheduled_period === "afternoon")
          .reduce((s, o) => s + Number(o.cnt), 0);
        const night = dateOrders
          .filter((o) => o.scheduled_period === "night")
          .reduce((s, o) => s + Number(o.cnt), 0);

        const hasSpace =
          (settings.morning_limit > 0 && morning < settings.morning_limit) ||
          (settings.afternoon_limit > 0 &&
            afternoon < settings.afternoon_limit) ||
          (settings.night_limit > 0 && night < settings.night_limit);

        days[dateStr] = hasSpace ? "available" : "full";
      } else {
        const slots = generateTimeSlots(dayConfig, settings.slot_interval_minutes);
        const hasSpace = slots.some((slot) => {
          const count = dateOrders
            .filter((o) => o.scheduled_time === slot)
            .reduce((s, o) => s + Number(o.cnt), 0);
          return count < settings.vehicles_per_slot;
        });
        days[dateStr] = hasSpace ? "available" : "full";
      }
    }

    return res.json({
      mensagem: "Disponibilidade carregada com sucesso.",
      settings,
      days,
      blockReasons,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao carregar disponibilidade.",
      erro: error.message,
    });
  }
}

async function getPublicDaySlots(req, res) {
  try {
    const { businessId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ mensagem: "Data não informada." });
    }

    const [settingsRows] = await db.query(
      `SELECT schedule_type, slot_interval_minutes, vehicles_per_slot,
              daily_limit, morning_limit, afternoon_limit, night_limit
       FROM business_schedule_settings WHERE business_id = ? LIMIT 1`,
      [businessId],
    );
    const settings = settingsRows[0] || defaultScheduleSettings;

    const dateParts = date.split("-");
    const weekday = new Date(
      Number(dateParts[0]),
      Number(dateParts[1]) - 1,
      Number(dateParts[2]),
    ).getDay();

    const [workingHoursRows] = await db.query(
      `SELECT is_open,
              TO_CHAR(open_time, 'HH24:MI') AS open_time,
              TO_CHAR(close_time, 'HH24:MI') AS close_time,
              has_lunch_break,
              TO_CHAR(lunch_start, 'HH24:MI') AS lunch_start,
              TO_CHAR(lunch_end, 'HH24:MI') AS lunch_end
       FROM business_working_hours WHERE business_id = ? AND weekday = ? LIMIT 1`,
      [businessId, weekday],
    );

    const dayConfig = workingHoursRows[0];

    if (!dayConfig || !toBoolean(dayConfig.is_open)) {
      return res.status(400).json({ mensagem: "Lava-jato fechado neste dia." });
    }

    const [orderRows] = await db.query(
      `SELECT scheduled_time,
              scheduled_period,
              COUNT(*) AS cnt
       FROM service_orders
       WHERE business_id = ? AND scheduled_date = ? AND status NOT IN ('cancelado')
       GROUP BY scheduled_time, scheduled_period`,
      [businessId, date],
    );

    const [blockRows] = await db.query(
      `SELECT is_full_day,
              TO_CHAR(start_time, 'HH24:MI') AS start_time,
              TO_CHAR(end_time, 'HH24:MI') AS end_time
       FROM business_schedule_blocks
       WHERE business_id = ? AND block_date = ?`,
      [businessId, date],
    );

    const isFullDayBlocked = blockRows.some((block) => block.is_full_day);
    const partialBlocks = blockRows.filter((block) => !block.is_full_day);

    function isTimeBlocked(time) {
      if (isFullDayBlocked) return true;

      const slotStart = timeToMinutes(time);
      const slotEnd = slotStart + settings.slot_interval_minutes;

      return partialBlocks.some((block) => {
        const blockStart = timeToMinutes(block.start_time);
        const blockEnd = timeToMinutes(block.end_time);
        if (blockStart === null || blockEnd === null) return false;
        return slotStart < blockEnd && slotEnd > blockStart;
      });
    }

    if (settings.schedule_type === "time_slots") {
      const allSlots = generateTimeSlots(dayConfig, settings.slot_interval_minutes);
      const slots = allSlots.map((time) => {
        const count = orderRows
          .filter((o) => o.scheduled_time === time)
          .reduce((s, o) => s + Number(o.cnt), 0);
        return {
          time,
          available: count < settings.vehicles_per_slot && !isTimeBlocked(time),
        };
      });
      return res.json({ type: "time_slots", slots });
    }

    if (settings.schedule_type === "periods") {
      const morningCount = orderRows
        .filter((o) => o.scheduled_period === "morning")
        .reduce((s, o) => s + Number(o.cnt), 0);
      const afternoonCount = orderRows
        .filter((o) => o.scheduled_period === "afternoon")
        .reduce((s, o) => s + Number(o.cnt), 0);
      const nightCount = orderRows
        .filter((o) => o.scheduled_period === "night")
        .reduce((s, o) => s + Number(o.cnt), 0);

      const periods = [];
      if (settings.morning_limit > 0) {
        periods.push({
          period: "morning",
          label: "Manhã",
          available: morningCount < settings.morning_limit && !isFullDayBlocked,
        });
      }
      if (settings.afternoon_limit > 0) {
        periods.push({
          period: "afternoon",
          label: "Tarde",
          available: afternoonCount < settings.afternoon_limit && !isFullDayBlocked,
        });
      }
      if (settings.night_limit > 0) {
        periods.push({
          period: "night",
          label: "Noite",
          available: nightCount < settings.night_limit && !isFullDayBlocked,
        });
      }

      return res.json({ type: "periods", periods });
    }

    const totalCount = orderRows.reduce((s, o) => s + Number(o.cnt), 0);
    return res.json({
      type: "daily",
      available: totalCount < settings.daily_limit && !isFullDayBlocked,
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao carregar horários.",
      erro: error.message,
    });
  }
}

async function getPublicServiceDetail(req, res) {
  try {
    const { businessId, serviceId } = req.params;

    const [rows] = await db.query(
      `SELECT id, name, price, duration_minutes
       FROM services
       WHERE id = ? AND business_id = ? AND status = 'active'
       LIMIT 1`,
      [serviceId, businessId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Serviço não encontrado." });
    }

    return res.json({ service: rows[0] });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar serviço.",
      erro: error.message,
    });
  }
}

async function createPublicBooking(req, res) {
  const connection = await db.getConnection();

  try {
    const { businessId } = req.params;
    const {
      serviceId,
      customerName,
      customerPhone,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
      scheduledDate,
      scheduledTime,
      scheduledPeriod,
    } = req.body;

    if (
      !serviceId ||
      !customerName ||
      !customerPhone ||
      !vehiclePlate ||
      !scheduledDate
    ) {
      return res.status(400).json({
        mensagem: "Dados incompletos para realizar o agendamento.",
      });
    }

    const cleanPlate = String(vehiclePlate)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);

    const cleanPhone = String(customerPhone).replace(/\D/g, "");

    const [services] = await connection.query(
      `SELECT id, price FROM services
       WHERE id = ? AND business_id = ? AND status = 'active' LIMIT 1`,
      [serviceId, businessId],
    );

    if (services.length === 0) {
      return res.status(404).json({ mensagem: "Serviço não encontrado." });
    }

    const price = services[0].price;

    await connection.beginTransaction();

    let customerId;
    const [existingCustomers] = await connection.query(
      `SELECT id FROM customers WHERE business_id = ? AND phone = ? LIMIT 1`,
      [businessId, cleanPhone],
    );

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
      await connection.query(
        `UPDATE customers SET name = ? WHERE id = ? AND business_id = ?`,
        [customerName, customerId, businessId],
      );
    } else {
      const [result] = await connection.query(
        `INSERT INTO customers (business_id, name, phone) VALUES (?, ?, ?) RETURNING id`,
        [businessId, customerName, cleanPhone],
      );
      customerId = result.insertId;
    }

    let vehicleId;
    const [existingVehicles] = await connection.query(
      `SELECT id FROM vehicles WHERE business_id = ? AND plate = ? LIMIT 1`,
      [businessId, cleanPlate],
    );

    if (existingVehicles.length > 0) {
      vehicleId = existingVehicles[0].id;
      await connection.query(
        `UPDATE vehicles SET customer_id = ?, model = ?, color = ?
         WHERE id = ? AND business_id = ?`,
        [customerId, vehicleModel || null, vehicleColor || null, vehicleId, businessId],
      );
    } else {
      const [result] = await connection.query(
        `INSERT INTO vehicles (business_id, customer_id, plate, model, color)
         VALUES (?, ?, ?, ?, ?) RETURNING id`,
        [businessId, customerId, cleanPlate, vehicleModel || null, vehicleColor || null],
      );
      vehicleId = result.insertId;
    }

    const [orderResult] = await connection.query(
      `INSERT INTO service_orders
       (business_id, customer_id, vehicle_id, service_id, scheduled_date,
        scheduled_time, scheduled_period, status, price, origin)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'agendado', ?, 'online')
       RETURNING id`,
      [
        businessId,
        customerId,
        vehicleId,
        serviceId,
        scheduledDate,
        scheduledTime || null,
        scheduledPeriod || null,
        price,
      ],
    );

    await connection.commit();

    return res.status(201).json({
      mensagem: "Agendamento realizado com sucesso.",
      orderId: orderResult.insertId,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      mensagem: "Erro ao realizar agendamento.",
      erro: error.message,
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getCustomerPage,
  listPublicCategories,
  listPublicServicesByCategory,
  getPublicVehicleByPlate,
  getPublicScheduleSettings,
  getPublicMonthAvailability,
  getPublicDaySlots,
  getPublicServiceDetail,
  createPublicBooking,
};
