import { useEffect, useState } from "react";
import MenuIcon from "../../components/MenuIcon";
import AccountMenu from "../../components/AccountMenu";
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
  const [todayStats, setTodayStats] = useState({
    agendado: 0, na_fila: 0, em_lavagem: 0, pronto: 0, entregue: 0, cancelado: 0, total: 0,
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState("");
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const [filters, setFilters] = useState({
    plate: "",
    customer: "",
    service: "",
  });

  const canManageSettings = hasPermission(
    "gerenciar_configuracoes",
    userPermissions,
  );

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  async function loadTodayStats() {
    const today = new Date().toISOString().slice(0, 10);
    const response = await apiRequest(`/api/orders?date=${today}`);
    const todayOrders = response.orders || [];

    const counts = { agendado: 0, na_fila: 0, em_lavagem: 0, pronto: 0, entregue: 0, cancelado: 0 };
    todayOrders.forEach((order) => {
      if (Object.prototype.hasOwnProperty.call(counts, order.status)) {
        counts[order.status]++;
      }
    });

    setTodayStats({ ...counts, total: todayOrders.length });
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
    const today = new Date().toISOString().slice(0, 10);
    params.append("date", today);

    if (customFilters.plate.trim()) {
      params.append("plate", customFilters.plate.trim());
    }

    if (customFilters.customer.trim()) {
      params.append("customer", customFilters.customer.trim());
    }

    return `/api/orders?${params.toString()}`;
  }

  function hasActiveFilters() {
    return filters.plate.trim() || filters.customer.trim() || filters.service;
  }

  async function applyFilters() {
    if (!canViewQueue) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const ordersResponse = await apiRequest(buildFilterQuery());
      let result = ordersResponse.orders || [];

      if (filters.service) {
        result = result.filter((order) => order.service_name === filters.service);
      }

      setOrders(result);
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
        plate: "",
        customer: "",
        service: "",
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
        await loadTodayStats();

        const ordersResponse = await apiRequest(buildFilterQuery());
        setOrders(ordersResponse.orders || []);

        try {
          const servicesResponse = await apiRequest("/api/services");
          setServices(servicesResponse.services || []);
        } catch {
          setServices([]);
        }
      } else {
        setTodayStats({ agendado: 0, na_fila: 0, em_lavagem: 0, pronto: 0, entregue: 0, cancelado: 0, total: 0 });
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
                  <MenuIcon name="dashboard" />
                  <span>Dashboard</span>
                </button>
              )}

              {canViewQueue && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/atendimentos")}
                >
                  <MenuIcon name="attendance" />
                  <span>Atendimentos</span>
                </button>
              )}

              {canViewFinance && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setFinanceMenuOpen(!financeMenuOpen)}
                  >
                    <MenuIcon name="finance" />
                    <span>Financeiro</span>
                    <svg
                      className={financeMenuOpen ? "submenu-arrow open" : "submenu-arrow"}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {financeMenuOpen && (
                    <div className="submenu-links">
                      <button
                        type="button"
                        onClick={() => (window.location.href = "/financeiro/a-receber")}
                      >
                        <MenuIcon name="receivables" />
                        <span>A receber</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => (window.location.href = "/financeiro/a-pagar")}
                      >
                        <MenuIcon name="payable" />
                        <span>A pagar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => (window.location.href = "/financeiro/formas-de-pagamento")}
                      >
                        <MenuIcon name="payment" />
                        <span>Formas de pagamento</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => (window.location.href = "/financeiro/banco")}
                      >
                        <MenuIcon name="bank" />
                        <span>Banco</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {canViewFinance && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/relatorios")}
                >
                  <MenuIcon name="reports" />
                  <span>Relatórios</span>
                </button>
              )}

              {canViewCustomers && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/clientes")}
                >
                  <MenuIcon name="customers" />
                  <span>Clientes</span>
                </button>
              )}

              {canViewTeam && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/equipe")}
                >
                  <MenuIcon name="team" />
                  <span>Equipe</span>
                </button>
              )}

              {canViewAgenda && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setAgendaMenuOpen(!agendaMenuOpen)}
                  >
                    <MenuIcon name="agenda" />
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
                        <MenuIcon name="schedule" />
                        <span>Horários de funcionamento</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/agenda?tab=blocks")
                        }
                      >
                        <MenuIcon name="blocks" />
                        <span>Bloqueios de agenda</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/agenda?tab=settings")
                        }
                      >
                        <MenuIcon name="settings" />
                        <span>Configuração da agenda</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {canViewServices && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setServicesMenuOpen(!servicesMenuOpen)}
                  >
                    <MenuIcon name="services" />
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
                        <MenuIcon name="services" />
                        <span>Lista de serviços</span>
                      </button>

                      {canViewCategories && (
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href = "/categorias-servicos")
                          }
                        >
                          <MenuIcon name="categories" />
                          <span>Categorias</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {canManageSettings && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                  >
                    <MenuIcon name="settings" />
                    <span>Configurações</span>

                    <svg
                      className={
                        settingsMenuOpen
                          ? "submenu-arrow open"
                          : "submenu-arrow"
                      }
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>

                  {settingsMenuOpen && (
                    <div className="submenu-links">
                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/configuracoes?tab=initial")
                        }
                      >
                        <MenuIcon name="info" />
                        <span>Informações iniciais</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/configuracoes?tab=location")
                        }
                      >
                        <MenuIcon name="location" />
                        <span>Localização</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>
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
                <label>Placa</label>
                <input
                  type="text"
                  placeholder="ABC1D23"
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

              <div className="filter-group">
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

              <div className="filter-group filter-group-full">
                <label>Serviço</label>
                <select
                  value={filters.service}
                  onChange={(event) => updateFilter("service", event.target.value)}
                >
                  <option value="">Todos os serviços</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
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

          <AccountMenu onLogout={handleLogout} />
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        {canViewQueue ? (
          <>
            <div className={`stats-grid${!finance ? " stats-grid-single" : ""}`}>
              {finance && (
                <div className="stat-card stat-card-green">
                  <span>Entrada de hoje</span>
                  <strong>{formatMoney(finance.total_day)}</strong>
                  <p>{finance.paid_orders || 0} pagamentos</p>
                </div>
              )}
              <div className="stat-card stat-card-blue">
                <span>Agendados hoje</span>
                <strong>{todayStats.agendado}</strong>
                <p>marcados para hoje</p>
              </div>
            </div>

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
                            <p className="order-customer">{order.customer_name || "Cliente não identificado"}</p>
                            {order.vehicle_model && (
                              <p className="order-vehicle-model">
                                {order.vehicle_model}{order.vehicle_color ? ` · ${order.vehicle_color}` : ""}
                              </p>
                            )}
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
