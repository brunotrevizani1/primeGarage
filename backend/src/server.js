const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./database/connection");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middlewares/authMiddleware");
const permissionMiddleware = require("./middlewares/permissionMiddleware");
const permissionRoutes = require("./routes/permissionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const businessRoutes = require("./routes/businessRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const orderRoutes = require("./routes/orderRoutes");
const financeRoutes = require("./routes/financeRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const serviceCategoryRoutes = require("./routes/serviceCategoryRoutes");
const teamRoutes = require("./routes/teamRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/service-categories", serviceCategoryRoutes);
app.use("/api/team", teamRoutes);

app.get("/", (req, res) => {
  res.send("API PrimeGarage funcionando!");
});

app.get("/api/teste-banco", async (req, res) => {
  try {
    const [resultado] = await db.query("SELECT 1 + 1 AS soma");

    res.json({
      mensagem: "Conexão com o banco funcionando!",
      resultado: resultado[0],
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao conectar no banco",
      erro: error.message,
    });
  }
});

app.get("/api/perfil", authMiddleware, (req, res) => {
  res.json({
    mensagem: "Rota protegida acessada com sucesso.",
    usuario: req.user,
  });
});

app.get(
  "/api/admin/teste",
  authMiddleware,
  permissionMiddleware("ver_dashboard"),
  (req, res) => {
    res.json({
      mensagem: "Você acessou uma rota protegida por permissão.",
    });
  },
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
