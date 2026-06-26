import { useState } from "react";
import { apiRequest } from "../../services/api";
import "./login.css";
import { loadUserPermissions } from "../../services/permissions";

function Login() {
  const [email, setEmail] = useState("admin@primegarage.com");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await loadUserPermissions();
      window.location.href = "/dashboard";
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      <aside className="login-sidebar">
        <div className="sidebar-deco-1" />
        <div className="sidebar-deco-2" />
        <div className="sidebar-content">
          <div className="sidebar-logo">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
          </div>
          <strong className="sidebar-brand">PrimeGarage</strong>
          <p className="sidebar-tagline">Sistema de gestão para seu lavajato</p>
          <ul className="sidebar-features">
            <li>
              <span className="feature-check">✓</span>
              Agenda e atendimentos
            </li>
            <li>
              <span className="feature-check">✓</span>
              Controle financeiro
            </li>
            <li>
              <span className="feature-check">✓</span>
              Gestão de equipe
            </li>
            <li>
              <span className="feature-check">✓</span>
              Portal do cliente
            </li>
          </ul>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-mobile-brand">
          <div className="mobile-logo">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
          </div>
          <strong>PrimeGarage</strong>
        </div>

        <section className="login-card">
          <div className="login-heading">
            <h1>Faça seu login</h1>
            <p>Bem-vindo de volta ao sistema</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {error && <div className="login-error">{error}</div>}

            <div className="input-group">
              <label htmlFor="email">E-mail</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2.5-.7a.7.7 0 0 0-.7.7v.32l6.2 4.04 6.2-4.04V6.5a.7.7 0 0 0-.7-.7h-11Zm11.7 3.15-5.7 3.71a.9.9 0 0 1-1 0L5.8 8.95v8.55c0 .39.31.7.7.7h11c.39 0 .7-.31.7-.7V8.95Z" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Senha</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7.5 10V8a4.5 4.5 0 0 1 9 0v2h.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h.5Zm1.8 0h5.4V8a2.7 2.7 0 0 0-5.4 0v2ZM7 11.8a.2.2 0 0 0-.2.2v6c0 .11.09.2.2.2h10a.2.2 0 0 0 .2-.2v-6a.2.2 0 0 0-.2-.2H7Z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.28 2.22a.75.75 0 0 1 1.06 0l17.44 17.44a.75.75 0 1 1-1.06 1.06l-3.1-3.1A10.8 10.8 0 0 1 12 19.25C6.9 19.25 3.38 15.7 2.1 12.53a1.43 1.43 0 0 1 0-1.06 11.7 11.7 0 0 1 3.18-4.32l-2-1.99a.75.75 0 0 1 0-1.06Zm3.28 6.2A10.12 10.12 0 0 0 3.55 12C4.7 14.62 7.73 17.75 12 17.75c1.53 0 2.87-.4 4.02-1.02l-2.15-2.15A3.5 3.5 0 0 1 9.42 10.13L6.56 8.42Zm4.18 2.98a2 2 0 0 0 1.86 1.86l-1.86-1.86ZM12 4.75c5.1 0 8.62 3.55 9.9 6.72.14.34.14.72 0 1.06a11.3 11.3 0 0 1-2.02 3.1l-1.07-1.07A9.9 9.9 0 0 0 20.45 12C19.3 9.38 16.27 6.25 12 6.25c-1.02 0-1.97.14-2.84.4L7.96 5.46A10.55 10.55 0 0 1 12 4.75Zm.25 3.01A3.5 3.5 0 0 1 16.24 11.75l-1.6-1.6a2 2 0 0 0-.79-.79l-1.6-1.6Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c5.1 0 8.62 3.55 9.9 6.72.07.18.07.38 0 .56C20.62 15.45 17.1 19 12 19s-8.62-3.55-9.9-6.72a.75.75 0 0 1 0-.56C3.38 8.55 6.9 5 12 5Zm0 1.5c-4.24 0-7.25 2.92-8.39 5.5C4.75 14.58 7.76 17.5 12 17.5s7.25-2.92 8.39-5.5C19.25 9.42 16.24 6.5 12 6.5Zm0 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 1.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="login-footer">Acesso exclusivo para usuários autorizados</p>
        </section>
      </main>
    </div>
  );
}

export default Login;
