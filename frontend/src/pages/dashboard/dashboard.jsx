import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [finance, setFinance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState("");
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "todos",
    plate: "",
  });

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  async function loadTodaySchedules() {
    const today = new Date().toISOString().slice(0, 10);

    const response = await apiRequest(`/api/orders?date=${today}`);
    const todayOrders = response.orders || [];

    const scheduledCount = todayOrders.filter(
      (order) => order.status === "agendado",
    ).length;

    setTodaySchedules(scheduledCount);
  }

  function getFirstAllowedPath(permissions, role) {
    if (role === "owner" || role === "super_admin") {
      return "/dashboard";
    }

    if (permissions.includes("ver_dashboard")) {
      return "/dashboard";
    }

    if (permissions.includes("ver_fila")) {
      return "/atendimentos";
    }

    if (permissions.includes("ver_servicos")) {
      return "/servicos";
    }

    if (permissions.includes("ver_equipe")) {
      return "/equipe";
    }

    return "/";
  }

  function updateFilter(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function buildFilterQuery(customFilters = filters) {
    const params = new URLSearchParams();

    if (customFilters.startDate) {
      params.append("startDate", customFilters.startDate);
    }

    if (customFilters.endDate) {
      params.append("endDate", customFilters.endDate);
    }

    if (customFilters.status && customFilters.status !== "todos") {
      params.append("status", customFilters.status);
    }

    if (customFilters.plate.trim()) {
      params.append("plate", customFilters.plate.trim());
    }

    const query = params.toString();

    return query ? `/api/orders?${query}` : "/api/orders";
  }

  function hasActiveFilters() {
    return (
      filters.startDate ||
      filters.endDate ||
      filters.status !== "todos" ||
      filters.plate.trim()
    );
  }

  async function applyFilters() {
    if (!canViewQueue) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const ordersResponse = await apiRequest(buildFilterQuery());

      setOrders(ordersResponse.orders || []);
      setFilterOpen(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearFilters() {
    if (!canViewQueue) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const cleanFilters = {
        startDate: "",
        endDate: "",
        status: "todos",
        plate: "",
      };

      setFilters(cleanFilters);

      const ordersResponse = await apiRequest(buildFilterQuery(cleanFilters));
      setOrders(ordersResponse.orders || []);
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
      agendado: "Agendado",
      na_fila: "Na fila",
      em_lavagem: "Lavando",
      pronto: "Pronto",
      entregue: "Entregue",
      cancelado: "Cancelado",
    };

    return statusMap[status] || status;
  }

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/";
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();

      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";

      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const canAccessDashboard =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("ver_dashboard");

      if (!canAccessDashboard) {
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const userResponse = await apiRequest("/api/auth/me");
      setUser(userResponse.user);

      const businessResponse = await apiRequest("/api/business/me");
      setBusiness(businessResponse.business);

      const canAccessQueue =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("ver_fila");

      const canAccessFinance =
        currentRole === "owner" || currentRole === "super_admin";

      if (canAccessFinance) {
        const financeResponse = await apiRequest("/api/finance/today");
        setFinance(financeResponse.finance);
      } else {
        setFinance(null);
      }

      if (canAccessQueue) {
        await loadTodaySchedules();

        const ordersResponse = await apiRequest(buildFilterQuery());
        setOrders(ordersResponse.orders || []);
      } else {
        setTodaySchedules(0);
        setOrders([]);
      }
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
              {canViewDashboard && (
                <button
                  className="active"
                  type="button"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  Dashboard
                </button>
              )}

              {canViewQueue && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/atendimentos")}
                >
                  Atendimentos
                </button>
              )}

              {canViewAgenda && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setAgendaMenuOpen(!agendaMenuOpen)}
                  >
                    <span>Agenda</span>

                    <svg
                      className={
                        agendaMenuOpen ? "submenu-arrow open" : "submenu-arrow"
                      }
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>

                  {agendaMenuOpen && (
                    <div className="submenu-links">
                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/agenda?tab=hours")
                        }
                      >
                        Horários de funcionamento
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/agenda?tab=blocks")
                        }
                      >
                        Bloqueios de agenda
                      </button>
                    </div>
                  )}
                </div>
              )}

              {canViewTeam && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/equipe")}
                >
                  Equipe
                </button>
              )}

              {canViewServices && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setServicesMenuOpen(!servicesMenuOpen)}
                  >
                    <span>Serviços</span>

                    <svg
                      className={
                        servicesMenuOpen
                          ? "submenu-arrow open"
                          : "submenu-arrow"
                      }
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>

                  {servicesMenuOpen && (
                    <div className="submenu-links">
                      <button
                        type="button"
                        onClick={() => (window.location.href = "/servicos")}
                      >
                        Lista de serviços
                      </button>

                      {canViewCategories && (
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href = "/categorias-servicos")
                          }
                        >
                          Categorias
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {canViewFinance && <button type="button">Financeiro</button>}

              {canViewFinance && <button type="button">Configurações</button>}
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

      {filterOpen && canViewQueue && (
        <div className="filter-overlay" onClick={() => setFilterOpen(false)}>
          <section
            className="filter-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="filter-header">
              <div>
                <strong>Filtrar fila</strong>
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
                  <option value="agendado">Agendado</option>
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

        {finance && (
          <section className="highlight-card">
            <div>
              <span>Entrada de hoje</span>
              <strong>{formatMoney(finance?.total_day)}</strong>
              <p>{finance?.paid_orders || 0} pagamentos registrados hoje</p>
            </div>
          </section>
        )}

        {canViewQueue ? (
          <>
            <section className="dashboard-summary">
              <button
                type="button"
                className="dashboard-schedule-card"
                onClick={() => (window.location.href = "/atendimentos")}
              >
                <div>
                  <span>Agendamentos de hoje</span>
                  <strong>{todaySchedules}</strong>
                  <p>Atendimentos marcados para hoje</p>
                </div>
              </button>
            </section>

            <section className="queue-section">
              <div className="section-header">
                <div>
                  <div className="title-with-filter">
                    <h2>
                      {hasActiveFilters() ? "Fila filtrada" : "Fila de hoje"}
                    </h2>

                    <button
                      type="button"
                      className={`filter-icon-button ${
                        hasActiveFilters() ? "active" : ""
                      }`}
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

                          <span
                            className={`status-badge status-${order.status}`}
                          >
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
          </>
        ) : (
          <section className="empty-state">
            <strong>Acesso limitado</strong>
            <p>Você não possui permissão para visualizar os atendimentos.</p>
          </section>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
