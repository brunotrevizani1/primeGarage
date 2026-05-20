const express = require("express");
const { getVehicleByPlate } = require("../controllers/vehicleController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get(
  "/plate/:plate",
  authMiddleware,
  permissionMiddleware("criar_atendimento"),
  getVehicleByPlate,
);

module.exports = router;
