const db = require("../database/connection");

async function getCustomerPageSettings(req, res) {
  try {
    const businessId = req.user.business_id;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
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

    const business = businesses[0];

    return res.json({
      mensagem: "Configurações listadas com sucesso.",
      settings: {
        customerPageName: business.customer_page_name || business.name,
        customerPagePhrase:
          business.customer_page_phrase ||
          "Agende sua lavagem de forma rápida e prática.",
        customerPageLogoUrl: business.customer_page_logo_url || "",

        addressStreet: business.address_street || "",
        addressNumber: business.address_number || "",
        addressNeighborhood: business.address_neighborhood || "",
        addressCity: business.address_city || "",
        addressState: business.address_state || "",
      },
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar configurações.",
      erro: error.message,
    });
  }
}

async function updateCustomerPageSettings(req, res) {
  try {
    const businessId = req.user.business_id;

    const {
      customerPageName,
      customerPagePhrase,
      customerPageLogoUrl,
      addressStreet,
      addressNumber,
      addressNeighborhood,
      addressCity,
      addressState,
    } = req.body;

    if (!businessId) {
      return res.status(400).json({
        mensagem: "Usuário não está vinculado a nenhum lavajato.",
      });
    }

    if (!customerPageName || !customerPageName.trim()) {
      return res.status(400).json({
        mensagem: "O nome da página do cliente é obrigatório.",
      });
    }

    await db.query(
      `
  UPDATE businesses
  SET
    customer_page_name = ?,
    customer_page_phrase = ?,
    customer_page_logo_url = ?,
    address_street = ?,
    address_number = ?,
    address_neighborhood = ?,
    address_city = ?,
    address_state = ?
  WHERE id = ?
  `,
      [
        customerPageName.trim(),
        customerPagePhrase ? customerPagePhrase.trim() : null,
        customerPageLogoUrl ? customerPageLogoUrl.trim() : null,
        addressStreet ? addressStreet.trim() : null,
        addressNumber ? addressNumber.trim() : null,
        addressNeighborhood ? addressNeighborhood.trim() : null,
        addressCity ? addressCity.trim() : null,
        addressState ? addressState.trim() : null,
        businessId,
      ],
    );

    return res.json({
      mensagem: "Configurações atualizadas com sucesso.",
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao atualizar configurações.",
      erro: error.message,
    });
  }
}

module.exports = {
  getCustomerPageSettings,
  updateCustomerPageSettings,
};
