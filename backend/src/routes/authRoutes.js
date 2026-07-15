const express = require("express");
const rateLimit = require("express-rate-limit");
const { login, logout, me } = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ mensagem: "Muitas tentativas de login. Tente novamente em 1 minuto." });
  },
});

router.post("/login", loginLimiter, login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, me);

module.exports = router;
