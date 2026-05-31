const db = require("../database/connection");

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
};
