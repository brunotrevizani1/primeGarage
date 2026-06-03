const express = require("express");

const {
  getCustomerPage,
  listPublicCategories,
  listPublicServicesByCategory,
} = require("../controllers/publicController");

const router = express.Router();

router.get("/customer-page/:businessId", getCustomerPage);
router.get("/categories/:businessId", listPublicCategories);
router.get("/services/:businessId", listPublicServicesByCategory);

module.exports = router;
