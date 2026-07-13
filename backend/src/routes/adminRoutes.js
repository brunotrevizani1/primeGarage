const express = require("express");
const { createBusinessWithOwner, listBusinesses } = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

function onlySuperAdmin(req, res, next) {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({
      mensagem: "Acesso permitido apenas para o administrador do sistema.",
    });
  }

  next();
}

router.get("/businesses", authMiddleware, onlySuperAdmin, listBusinesses);

router.post(
  "/businesses",
  authMiddleware,
  onlySuperAdmin,
  createBusinessWithOwner,
);

module.exports = router;
