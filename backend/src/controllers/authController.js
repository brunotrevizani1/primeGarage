const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/connection");

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 dia
  };
}

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

    res.cookie("primegarage_token", token, getCookieOptions());

    return res.json({
      mensagem: "Login realizado com sucesso.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        business_id: user.business_id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao fazer login.",
      erro: error.message,
    });
  }
}

async function me(req, res) {
  try {
    const [users] = await db.query(
      `
      SELECT id, name, email, role, business_id, status
      FROM users
      WHERE id = ?
      AND status = 'active'
      LIMIT 1
      `,
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({
        mensagem: "Usuário não encontrado.",
      });
    }

    return res.json({
      mensagem: "Usuário autenticado.",
      user: users[0],
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: "Erro ao buscar usuário autenticado.",
      erro: error.message,
    });
  }
}

function logout(req, res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie("primegarage_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });

  return res.json({
    mensagem: "Logout realizado com sucesso.",
  });
}

module.exports = {
  login,
  me,
  logout,
};
