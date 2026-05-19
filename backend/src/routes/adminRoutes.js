const express = require("express");
const { createBusinessWithOwner } = require("../controllers/adminController");
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

router.post(
  "/businesses",
  authMiddleware,
  onlySuperAdmin,
  createBusinessWithOwner,
);

module.exports = router;
