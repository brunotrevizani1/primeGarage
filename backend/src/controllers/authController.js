const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/connection");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        mensagem: "Email e senha são obrigatórios.",
      });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? AND status = 'active'",
      [email],
    );

    if (users.length === 0) {
      return res.status(401).json({
        mensagem: "Email ou senha inválidos.",
      });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        mensagem: "Email ou senha inválidos.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        business_id: user.business_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      mensagem: "Login realizado com sucesso.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        business_id: user.business_id,
      },
    });
  } catch (error) {
    res.status(500).json({
      mensagem: "Erro ao fazer login.",
      erro: error.message,
    });
  }
}

module.exports = {
  login,
};
