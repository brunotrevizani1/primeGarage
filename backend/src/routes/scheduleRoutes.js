const express = require("express");

const {
  listWorkingHours,
  updateWorkingHours,
  listScheduleBlocks,
  createScheduleBlock,
  deleteScheduleBlock,
} = require("../controllers/scheduleController");

const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get(
  "/working-hours",
  authMiddleware,
  permissionMiddleware("ver_agenda"),
  listWorkingHours,
);

router.put(
  "/working-hours",
  authMiddleware,
  permissionMiddleware("editar_agenda"),
  updateWorkingHours,
);

router.get(
  "/blocks",
  authMiddleware,
  permissionMiddleware("ver_agenda"),
  listScheduleBlocks,
);

router.post(
  "/blocks",
  authMiddleware,
  permissionMiddleware("editar_agenda"),
  createScheduleBlock,
);

router.delete(
  "/blocks/:id",
  authMiddleware,
  permissionMiddleware("editar_agenda"),
  deleteScheduleBlock,
);

module.exports = router;
