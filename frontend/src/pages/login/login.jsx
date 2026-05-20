import { useState } from "react";
import { apiRequest } from "../../services/api";
import "./login.css";

function Login() {
  const [email, setEmail] = useState("admin@primegarage.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      localStorage.setItem("primegarage_token", data.token);
      localStorage.setItem("primegarage_user", JSON.stringify(data.user));

      window.location.href = "/dashboard";
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">PG</div>

          <div>
            <h1>PrimeGarage</h1>
            <p>Gestão inteligente para lavajatos</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-header">
            <h2>Entrar no sistema</h2>
            <p>
              Acesse seu painel para gerenciar atendimentos, serviços e
              financeiro.
            </p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
