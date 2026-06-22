const express = require("express");

const {
  getCustomerPage,
  listPublicCategories,
  listPublicServicesByCategory,
  getPublicVehicleByPlate,
  getPublicScheduleSettings,
  getPublicMonthAvailability,
  getPublicDaySlots,
  getPublicServiceDetail,
  createPublicBooking,
} = require("../controllers/publicController");

const router = express.Router();

router.get("/customer-page/:businessId", getCustomerPage);
router.get("/categories/:businessId", listPublicCategories);
router.get("/services/:businessId", listPublicServicesByCategory);
router.get("/vehicles/:businessId/:plate", getPublicVehicleByPlate);
router.get("/schedule-settings/:businessId", getPublicScheduleSettings);
router.get("/schedule-availability/:businessId", getPublicMonthAvailability);
router.get("/schedule-slots/:businessId", getPublicDaySlots);
router.get("/service-detail/:businessId/:serviceId", getPublicServiceDetail);
router.post("/bookings/:businessId", createPublicBooking);

module.exports = router;
