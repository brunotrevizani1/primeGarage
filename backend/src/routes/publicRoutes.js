const express = require("express");

const {
  getCustomerPage,
  listPublicCategories,
} = require("../controllers/publicController");

const router = express.Router();

router.get("/customer-page/:businessId", getCustomerPage);
router.get("/categories/:businessId", listPublicCategories);

module.exports = router;
