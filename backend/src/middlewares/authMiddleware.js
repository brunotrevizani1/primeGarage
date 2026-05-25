const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader ? authHeader.split(" ")[1] : null;
  const cookieToken = req.cookies ? req.cookies.primegarage_token : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({
      mensagem: "Token não informado.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      mensagem: "Token inválido ou expirado.",
    });
  }
}

module.exports = authMiddleware;
