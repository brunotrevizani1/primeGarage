const express = require("express");

const {
  getCustomerPage,
  listPublicCategories,
  listPublicServicesByCategory,
  getPublicVehicleByPlate,
} = require("../controllers/publicController");

const router = express.Router();

router.get("/customer-page/:businessId", getCustomerPage);
router.get("/categories/:businessId", listPublicCategories);
router.get("/services/:businessId", listPublicServicesByCategory);
router.get("/vehicles/:businessId/:plate", getPublicVehicleByPlate);

module.exports = router;
