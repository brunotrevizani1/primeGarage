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
        TIME_FORMAT(open_time, '%H:%i') AS open_time,
        TIME_FORMAT(close_time, '%H:%i') AS close_time,
        has_lunch_break,
        TIME_FORMAT(lunch_start, '%H:%i') AS lunch_start,
        TIME_FORMAT(lunch_end, '%H:%i') AS lunch_end
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

module.exports = {
  getCustomerPage,
  listPublicCategories,
  listPublicServicesByCategory,
  getPublicVehicleByPlate,
};
