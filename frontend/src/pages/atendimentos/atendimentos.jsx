import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./atendimentos.css";

function Atendimentos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "todos",
    plate: "",
    customer: "",
  });
  const [error, setError] = useState("");

  function updateFilter(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function buildFilterQuery() {
    const params = new URLSearchParams();

    if (filters.startDate) {
      params.append("startDate", filters.startDate);
    }

    if (filters.endDate) {
      params.append("endDate", filters.endDate);
    }

    if (filters.status && filters.status !== "todos") {
      params.append("status", filters.status);
    }

    if (filters.plate.trim()) {
      params.append("plate", filters.plate.trim());
    }

    if (filters.customer.trim()) {
      params.append("customer", filters.customer.trim());
    }

    const query = params.toString();

    return query ? `/api/orders?${query}` : "/api/orders";
  }

  function hasActiveFilters() {
    return (
      filters.startDate ||
      filters.endDate ||
      filters.status !== "todos" ||
      filters.plate.trim() ||
      filters.customer.trim()
    );
  }

  async function applyFilters() {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(buildFilterQuery());

      setOrders(response.orders || []);
      setFilterOpen(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearFilters() {
    try {
      setLoading(true);
      setError("");

      const cleanFilters = {
        startDate: "",
        endDate: "",
        status: "todos",
        plate: "",
        customer: "",
      };

      setFilters(cleanFilters);

      const response = await apiRequest("/api/orders");
      setOrders(response.orders || []);
      setFilterOpen(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

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

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(buildFilterQuery());
      setOrders(response.orders || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId, status) {
    try {
      setUpdatingId(orderId);
      setError("");

      await apiRequest(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      await loadOrders();
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return (
      <main className="attendance-page">
        <section className="attendance-loading">
          <div className="loading-circle"></div>
          <p>Carregando atendimentos...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="attendance-page">
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
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Dashboard
              </button>

              <button className="active" type="button">
                Atendimentos
              </button>

              <button type="button">Equipe</button>
              <button
                type="button"
                onClick={() => (window.location.href = "/servicos")}
              >
                Serviços
              </button>
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

      {filterOpen && (
        <div className="filter-overlay" onClick={() => setFilterOpen(false)}>
          <section
            className="filter-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="filter-header">
              <div>
                <strong>Filtrar atendimentos</strong>
              </div>

              <button type="button" onClick={() => setFilterOpen(false)}>
                ×
              </button>
            </div>

            <div className="filter-form">
              <div className="filter-group">
                <label>Data inicial</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    updateFilter("startDate", event.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label>Data final</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) =>
                    updateFilter("endDate", event.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter("status", event.target.value)
                  }
                >
                  <option value="todos">Todos</option>
                  <option value="na_fila">Na fila</option>
                  <option value="em_lavagem">Lavando</option>
                  <option value="pronto">Pronto</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Placa</label>
                <input
                  type="text"
                  placeholder="Ex: ABC1D23"
                  value={filters.plate}
                  onChange={(event) =>
                    updateFilter(
                      "plate",
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, ""),
                    )
                  }
                />
              </div>

              <div className="filter-group filter-full">
                <label>Cliente</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={filters.customer}
                  onChange={(event) =>
                    updateFilter("customer", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="filter-actions">
              <button
                type="button"
                className="clear-filter"
                onClick={clearFilters}
              >
                Limpar
              </button>

              <button
                type="button"
                className="apply-filter"
                onClick={applyFilters}
              >
                Aplicar filtro
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="attendance-container">
        <header className="attendance-header">
          <button
            className="menu-button"
            type="button"
            onClick={() => setMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div>
            <h1>Atendimentos</h1>
          </div>

          <button type="button" className="refresh-button" onClick={loadOrders}>
            ↻
          </button>
        </header>

        {error && <div className="attendance-error">{error}</div>}

        <section className="attendance-tools">
          <div>
            <small>Resumo</small>
            <h2>Status do dia</h2>
          </div>

          <button
            type="button"
            className="new-order-icon-button"
            onClick={() => (window.location.href = "/novo-atendimento")}
            aria-label="Novo atendimento"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
            </svg>
          </button>
        </section>

        <section className="status-summary">
          <article className="summary-box status-fila">
            <span>Na fila</span>
            <strong>{getOrdersByStatus("na_fila")}</strong>
          </article>

          <article className="summary-box status-lavando">
            <span>Lavando</span>
            <strong>{getOrdersByStatus("em_lavagem")}</strong>
          </article>

          <article className="summary-box status-pronto">
            <span>Prontos</span>
            <strong>{getOrdersByStatus("pronto")}</strong>
          </article>

          <article className="summary-box status-entregue">
            <span>Entregues</span>
            <strong>{getOrdersByStatus("entregue")}</strong>
          </article>

          <article className="summary-box status-cancelado">
            <span>Cancelados</span>
            <strong>{getOrdersByStatus("cancelado")}</strong>
          </article>
        </section>

        <section className="attendance-list-section">
          <div className="section-title">
            <div>
              <div className="title-with-filter">
                <h2>{hasActiveFilters() ? "Fila filtrada" : "Fila de hoje"}</h2>

                <button
                  type="button"
                  className={`filter-icon-button ${hasActiveFilters() ? "active" : ""}`}
                  onClick={() => setFilterOpen(true)}
                  aria-label="Filtrar atendimentos"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4.5 6.75A.75.75 0 0 1 5.25 6h13.5a.75.75 0 0 1 .53 1.28L14 12.56v4.69a.75.75 0 0 1-.36.64l-3 1.8A.75.75 0 0 1 9.5 19.05v-6.49L4.72 7.28a.75.75 0 0 1-.22-.53Zm2.44.75 3.86 4.26c.13.14.2.32.2.5v5.46l1.5-.9v-4.56c0-.2.08-.39.22-.53l4.22-4.23H6.94Z" />
                  </svg>
                </button>
              </div>
            </div>

            <span>{orders.length} veículos</span>
          </div>

          {orders.length === 0 ? (
            <div className="empty-attendance">
              <strong>Nenhum atendimento hoje</strong>
              <p>Quando um veículo for cadastrado, ele aparecerá aqui.</p>
            </div>
          ) : (
            <div className="attendance-list">
              {orders.map((order) => (
                <article className="attendance-card" key={order.id}>
                  <div className="attendance-card-top">
                    <div className="vehicle-avatar">
                      {order.vehicle_plate?.slice(0, 1) || "V"}
                    </div>

                    <div className="vehicle-main">
                      <div className="vehicle-title-row">
                        <div>
                          <h3>{order.vehicle_plate}</h3>
                          <p>{order.vehicle_model || "Veículo sem modelo"}</p>
                        </div>

                        <div className="card-top-actions">
                          <span
                            className={`status-pill status-${order.status}`}
                          >
                            {formatStatus(order.status)}
                          </span>

                          {order.status !== "entregue" &&
                            order.status !== "cancelado" && (
                              <button
                                type="button"
                                className="cancel-icon-button"
                                disabled={updatingId === order.id}
                                onClick={() =>
                                  updateStatus(order.id, "cancelado")
                                }
                                aria-label="Cancelar atendimento"
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M6.4 5.1a.9.9 0 0 0-1.3 1.3l5.6 5.6-5.6 5.6a.9.9 0 1 0 1.3 1.3l5.6-5.6 5.6 5.6a.9.9 0 0 0 1.3-1.3L13.3 12l5.6-5.6a.9.9 0 0 0-1.3-1.3L12 10.7 6.4 5.1Z" />
                                </svg>
                              </button>
                            )}
                        </div>
                      </div>

                      <div className="vehicle-progress">
                        <div
                          className={`vehicle-progress-bar progress-${order.status}`}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="attendance-info-grid">
                    <div>
                      <span>Cliente</span>
                      <strong>{order.customer_name}</strong>
                    </div>

                    <div>
                      <span>Serviço</span>
                      <strong>{order.service_name}</strong>
                    </div>

                    <div>
                      <span>Valor</span>
                      <strong>{formatMoney(order.price)}</strong>
                    </div>

                    <div>
                      <span>Responsável</span>
                      <strong>
                        {order.responsible_name || "Sem responsável"}
                      </strong>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="attendance-notes">
                      <span>Observação</span>
                      <p>{order.notes}</p>
                    </div>
                  )}

                  <div className="attendance-card-actions">
                    {order.status === "na_fila" && (
                      <button
                        type="button"
                        className="action-start"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "em_lavagem")}
                      >
                        Iniciar lavagem
                      </button>
                    )}

                    {order.status === "em_lavagem" && (
                      <button
                        type="button"
                        className="action-ready"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "pronto")}
                      >
                        Marcar pronto
                      </button>
                    )}

                    {order.status === "pronto" && (
                      <button
                        type="button"
                        className="action-delivered"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "entregue")}
                      >
                        Marcar entregue
                      </button>
                    )}

                    {order.status !== "entregue" &&
                      order.status !== "cancelado" && (
                        <button
                          type="button"
                          className="action-edit"
                          onClick={() =>
                            (window.location.href = `/editar-atendimento/${order.id}`)
                          }
                        >
                          Editar
                        </button>
                      )}

                    {order.status === "entregue" && (
                      <span className="finished-label">
                        Atendimento entregue
                      </span>
                    )}

                    {order.status === "cancelado" && (
                      <span className="canceled-label">
                        Atendimento cancelado
                      </span>
                    )}
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

export default Atendimentos;
