import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [finance, setFinance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatStatus(status) {
    const statusMap = {
      na_fila: "Na fila",
      em_lavagem: "Lavando",
      em_acabamento: "Acabamento",
      pronto: "Pronto",
      entregue: "Entregue",
      cancelado: "Cancelado",
    };

    return statusMap[status] || status;
  }

  function getOrdersByStatus(status) {
    return orders.filter((order) => order.status === status).length;
  }

  function handleLogout() {
    localStorage.removeItem("primegarage_token");
    localStorage.removeItem("primegarage_user");
    window.location.href = "/";
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const savedUser = JSON.parse(localStorage.getItem("primegarage_user"));
      setUser(savedUser);

      const businessResponse = await apiRequest("/api/business/me");
      const financeResponse = await apiRequest("/api/finance/today");
      const ordersResponse = await apiRequest("/api/orders/today");

      setBusiness(businessResponse.business);
      setFinance(financeResponse.finance);
      setOrders(ordersResponse.orders || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-loading">
          <div className="loading-circle"></div>
          <p>Carregando painel...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside
            className="side-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-menu-header">
              <strong>PrimeGarage</strong>
              <button type="button" onClick={() => setMenuOpen(false)}>
                ×
              </button>
            </div>

            <nav className="side-menu-links">
              <button className="active" type="button">
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/atendimentos")}
              >
                Atendimentos
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/novo-atendimento")}
              >
                Novo atendimento
              </button>

              <button type="button">Equipe</button>
              <button type="button">Serviços</button>
              <button type="button">Financeiro</button>
              <button type="button">Configurações</button>
            </nav>

            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
            >
              Sair da conta
            </button>
          </aside>
        </div>
      )}

      <section className="dashboard-container">
        <header className="app-header">
          <button
            className="menu-button"
            type="button"
            onClick={() => setMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="header-text">
            <small>Bem-vindo</small>
            <h1>{business?.name || "Meu lavajato"}</h1>
            <p>{user?.name || "Usuário"}</p>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={loadDashboard}
          >
            ↻
          </button>
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="highlight-card">
          <div>
            <span>Entrada de hoje</span>
            <strong>{formatMoney(finance?.total_day)}</strong>
            <p>{finance?.paid_orders || 0} pagamentos registrados hoje</p>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card status-fila">
            <span>Na fila</span>
            <strong>{getOrdersByStatus("na_fila")}</strong>
            <p>Aguardando atendimento</p>
          </article>

          <article className="stat-card status-lavando">
            <span>Lavando</span>
            <strong>{getOrdersByStatus("em_lavagem")}</strong>
            <p>Em andamento</p>
          </article>

          <article className="stat-card status-pronto">
            <span>Prontos</span>
            <strong>{getOrdersByStatus("pronto")}</strong>
            <p>Finalizados</p>
          </article>

          <article className="stat-card status-entregue">
            <span>Entregues</span>
            <strong>{getOrdersByStatus("entregue")}</strong>
            <p>Concluídos hoje</p>
          </article>
        </section>

        <section className="queue-section">
          <div className="section-header">
            <div>
              <small>Operação</small>
              <h2>Fila de hoje</h2>
            </div>

            <span>{orders.length} veículos</span>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum veículo na fila</strong>
              <p>Os atendimentos criados hoje aparecerão aqui.</p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-icon">
                    {order.vehicle_plate?.slice(0, 1) || "V"}
                  </div>

                  <div className="order-content">
                    <div className="order-main">
                      <div>
                        <h3>{order.vehicle_plate}</h3>
                        <p>{order.vehicle_model || "Veículo sem modelo"}</p>
                      </div>

                      <span className={`status-badge status-${order.status}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>

                    <div className="order-progress">
                      <div
                        className={`progress-bar progress-${order.status}`}
                      ></div>
                    </div>

                    <div className="order-details">
                      <span>{order.service_name}</span>
                      <strong>{formatMoney(order.price)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Dashboard;
