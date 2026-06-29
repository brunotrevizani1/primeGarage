import MenuIcon from "../../components/MenuIcon";
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./atendimentos.css";

function Atendimentos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState("");
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);
  const [userRole, setUserRole] = useState(getSavedRole());

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getInitialSelectedDate() {
    const params = new URLSearchParams(window.location.search);
    const dateFromUrl = params.get("date");

    if (dateFromUrl) {
      return dateFromUrl;
    }

    return getLocalDateString();
  }

  const canManageSettings = hasPermission(
    "gerenciar_configuracoes",
    userPermissions,
  );

  const [selectedDate, setSelectedDate] = useState(getInitialSelectedDate());

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [temporaryDate, setTemporaryDate] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    plate: "",
    customer: "",
  });

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canCreateOrder = hasPermission("criar_atendimento", userPermissions);
  const canEditOrder = hasPermission("editar_atendimento", userPermissions);
  const canChangeStatus = hasPermission("alterar_status", userPermissions);
  const canCancelOrder = hasPermission("cancelar_atendimento", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  function formatSelectedDate(date) {
    const [year, month, day] = date.split("-");

    return `${day}/${month}`;
  }

  function getWeekdayName(date) {
    const weekdays = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];

    const currentDate = new Date(`${date}T00:00:00`);

    return weekdays[currentDate.getDay()];
  }

  function changeSelectedDate(days) {
    const currentDate = new Date(`${selectedDate}T00:00:00`);
    currentDate.setDate(currentDate.getDate() + days);

    setSelectedDate(getLocalDateString(currentDate));
  }

  function openDateModal() {
    setTemporaryDate(selectedDate);
    setDateModalOpen(true);
  }

  function confirmSelectedDate() {
    if (!temporaryDate) {
      return;
    }

    setSelectedDate(temporaryDate);
    setDateModalOpen(false);
  }

  function goToTodayFromModal() {
    setTemporaryDate(getLocalDateString());
  }

  function getQueueTitle() {
    const today = getLocalDateString();

    if (selectedDate === today) {
      return "Fila de hoje";
    }

    return "Fila do dia";
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

  function buildFilterQuery() {
    const params = new URLSearchParams();

    params.append("date", selectedDate);

    if (filters.status) {
      params.append("status", filters.status);
    }

    if (filters.plate) {
      params.append("plate", filters.plate);
    }

    if (filters.customer) {
      params.append("customer", filters.customer);
    }

    return `/api/orders?${params.toString()}`;
  }

  function hasActiveFilters() {
    return filters.status || filters.plate || filters.customer;
  }

  async function applyFilters() {
    if (!canViewQueue) {
      return;
    }

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
    setFilters({
      status: "",
      plate: "",
      customer: "",
    });

    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(`/api/orders?date=${selectedDate}`);

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
      agendado: "Agendado",
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

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/";
    }
  }

  async function loadOrders(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const response = await apiRequest(buildFilterQuery());

      setOrders(response.orders || []);
    } catch (error) {
      setError(error.message);
    } finally {
      if (showLoading) setLoading(false);
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

      await loadOrders(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    async function loadPermissions() {
      try {
        const response = await loadUserPermissions();

        setUserPermissions(response.permissions || []);
        setUserRole(response.role || "");
      } catch (error) {
        setError(error.message);
      }
    }

    loadPermissions();
  }, []);

  useEffect(() => {
    loadOrders();

    const id = setInterval(() => {
      if (!document.hidden) loadOrders(false);
    }, 30000);

    return () => clearInterval(id);
  }, [selectedDate]);

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
              {canViewDashboard && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  <MenuIcon name="dashboard" />
                  <span>Dashboard</span>
                </button>
              )}

              {canViewQueue && (
                <button className="active" type="button">
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

      {dateModalOpen && (
        <div
          className="date-modal-overlay"
          onClick={() => setDateModalOpen(false)}
        >
          <section
            className="date-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="date-modal-header">
              <strong>Escolher data</strong>

              <button type="button" onClick={() => setDateModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="date-modal-body">
              <label>Data do atendimento</label>

              <input
                type="date"
                value={temporaryDate}
                onChange={(event) => setTemporaryDate(event.target.value)}
              />
            </div>

            <div className="date-modal-actions">
              <button
                type="button"
                className="date-modal-today"
                onClick={goToTodayFromModal}
              >
                Limpar filtro
              </button>

              <button
                type="button"
                className="date-modal-confirm"
                onClick={confirmSelectedDate}
              >
                Ir para data
              </button>
            </div>
          </section>
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
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter("status", event.target.value)
                  }
                >
                  <option value="">Todos</option>
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
          <div className="date-selector">
            <div className="date-picker-box">
              <button
                type="button"
                className="date-nav-button"
                onClick={() => changeSelectedDate(-1)}
                aria-label="Dia anterior"
              >
                <span>‹</span>
              </button>

              <button
                type="button"
                className="date-center-button"
                onClick={openDateModal}
              >
                <strong className="date-selector-date">
                  {formatSelectedDate(selectedDate)}
                </strong>

                <span className="date-separator">-</span>

                <span className="date-weekday">
                  {getWeekdayName(selectedDate)}
                </span>
              </button>

              <button
                type="button"
                className="date-nav-button"
                onClick={() => changeSelectedDate(1)}
                aria-label="Próximo dia"
              >
                <span>›</span>
              </button>
            </div>
          </div>

          {canCreateOrder && (
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
          )}
        </section>

        <section className="status-summary">
          <article className="summary-box status-agendado">
            <span>Agendados</span>
            <strong>{getOrdersByStatus("agendado")}</strong>
          </article>

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
                <div className="queue-title">
                  <h2>Fila do dia {formatSelectedDate(selectedDate)}</h2>
                </div>

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
            <div className="empty-attendance">
              <strong>Nenhum atendimento neste dia</strong>
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

                          {canCancelOrder &&
                            order.status !== "entregue" &&
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
                    {canChangeStatus && order.status === "agendado" && (
                      <button
                        type="button"
                        className="action-schedule"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "na_fila")}
                      >
                        Enviar para fila
                      </button>
                    )}

                    {canChangeStatus && order.status === "na_fila" && (
                      <button
                        type="button"
                        className="action-start"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "em_lavagem")}
                      >
                        Iniciar lavagem
                      </button>
                    )}

                    {canChangeStatus && order.status === "em_lavagem" && (
                      <button
                        type="button"
                        className="action-ready"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "pronto")}
                      >
                        Marcar pronto
                      </button>
                    )}

                    {canChangeStatus && order.status === "pronto" && (
                      <button
                        type="button"
                        className="action-delivered"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "entregue")}
                      >
                        Marcar entregue
                      </button>
                    )}

                    {canEditOrder &&
                      order.status !== "entregue" &&
                      order.status !== "cancelado" && (
                        <button
                          type="button"
                          className="action-edit"
                          onClick={() =>
                            (window.location.href = `/editar-atendimento/${order.id}?date=${selectedDate}`)
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
