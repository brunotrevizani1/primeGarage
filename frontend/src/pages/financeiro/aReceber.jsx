import { useEffect, useState } from "react";
import MenuIcon from "../../components/MenuIcon";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./aReceber.css";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const EMPTY_FILTERS = {
  customer_name: "",
  vehicle_plate: "",
  status: "",
  payment_method_id: "",
  amount_min: "",
  amount_max: "",
};

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

function getWeekdayName(dateStr) {
  return WEEKDAYS[new Date(`${dateStr}T00:00:00`).getDay()];
}

function formatTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function AReceber() {
  const [receivables, setReceivables] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [temporaryDate, setTemporaryDate] = useState("");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tempFilters, setTempFilters] = useState(EMPTY_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [baixaModal, setBaixaModal] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [savingBaixa, setSavingBaixa] = useState(false);
  const [baixaError, setBaixaError] = useState("");

  const [reopenModal, setReopenModal] = useState(null);
  const [savingReopen, setSavingReopen] = useState(false);
  const [reopenError, setReopenError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(true);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canManageSettings = hasPermission("gerenciar_configuracoes", userPermissions);
  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  function getFirstAllowedPath(permissions, role) {
    if (role === "owner" || role === "super_admin") return "/dashboard";
    if (permissions.includes("ver_dashboard")) return "/dashboard";
    if (permissions.includes("ver_fila")) return "/atendimentos";
    if (permissions.includes("ver_cliente")) return "/clientes";
    if (permissions.includes("ver_equipe")) return "/equipe";
    if (permissions.includes("ver_agenda")) return "/agenda?tab=hours";
    if (permissions.includes("ver_servicos")) return "/servicos";
    return "/";
  }

  async function handleLogout() {
    try { await apiRequest("/api/auth/logout", { method: "POST" }); } finally {
      window.location.href = "/";
    }
  }

  function hasActiveFilter() {
    return Object.values(filters).some((v) => v !== "");
  }

  function changeDate(days) {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateString(d));
  }

  function openDateModal() {
    setTemporaryDate(selectedDate);
    setDateModalOpen(true);
  }

  function confirmDate() {
    if (!temporaryDate) return;
    setSelectedDate(temporaryDate);
    setDateModalOpen(false);
  }

  function goToToday() {
    setTemporaryDate(getLocalDateString());
  }

  function openFilterModal() {
    setTempFilters({ ...filters });
    setFilterModalOpen(true);
  }

  function applyFilter(e) {
    e.preventDefault();
    const applied = { ...tempFilters };
    setFilters(applied);
    setFilterModalOpen(false);
    loadWithParams(selectedDate, applied);
  }

  function clearFilter() {
    setTempFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setFilterModalOpen(false);
    loadWithParams(selectedDate, EMPTY_FILTERS);
  }

  async function loadWithParams(date, activeFilters) {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();
      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";
      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const isOwner = currentRole === "owner" || currentRole === "super_admin";
      if (!isOwner) {
        window.location.href = getFirstAllowedPath(currentPermissions, currentRole);
        return;
      }

      const params = new URLSearchParams({ date });
      if (activeFilters.customer_name) params.append("customer_name", activeFilters.customer_name);
      if (activeFilters.vehicle_plate) params.append("vehicle_plate", activeFilters.vehicle_plate);
      if (activeFilters.status) params.append("status", activeFilters.status);
      if (activeFilters.payment_method_id) params.append("payment_method_id", activeFilters.payment_method_id);
      if (activeFilters.amount_min) params.append("amount_min", activeFilters.amount_min);
      if (activeFilters.amount_max) params.append("amount_max", activeFilters.amount_max);

      const [receivablesRes, methodsRes] = await Promise.all([
        apiRequest(`/api/finance/receivables?${params.toString()}`),
        apiRequest("/api/finance/payment-methods"),
      ]);

      setReceivables(receivablesRes.receivables || []);
      setPaymentMethods((methodsRes.methods || []).filter((m) => m.is_active));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openBaixa(record) {
    setBaixaModal(record);
    setSelectedMethod("");
    setBaixaError("");
  }

  async function confirmBaixa() {
    if (!selectedMethod) {
      setBaixaError("Selecione uma forma de pagamento.");
      return;
    }
    try {
      setSavingBaixa(true);
      setBaixaError("");
      await apiRequest(`/api/finance/receivables/${baixaModal.id}/receive`, {
        method: "PUT",
        body: JSON.stringify({ payment_method_id: Number(selectedMethod) }),
      });
      setBaixaModal(null);
      loadWithParams(selectedDate, filters);
    } catch (err) {
      setBaixaError(err.message);
    } finally {
      setSavingBaixa(false);
    }
  }

  function openReopen(record) {
    setReopenModal(record);
    setReopenError("");
  }

  async function confirmReopen() {
    try {
      setSavingReopen(true);
      setReopenError("");
      await apiRequest(`/api/finance/receivables/${reopenModal.id}/reopen`, { method: "PUT" });
      setReopenModal(null);
      loadWithParams(selectedDate, filters);
    } catch (err) {
      setReopenError(err.message);
    } finally {
      setSavingReopen(false);
    }
  }

  function statusLabel(status) {
    return status === "pendente" ? "Em aberto" : "Pago";
  }

  useEffect(() => {
    loadWithParams(selectedDate, filters);
  }, [selectedDate]);

  if (loading) {
    return (
      <main className="ar-page">
        <section className="ar-loading">
          <div className="ar-loading-circle"></div>
          <p>Carregando...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="ar-page">
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="side-menu" onClick={(e) => e.stopPropagation()}>
            <div className="side-menu-header">
              <strong>PrimeGarage</strong>
              <button type="button" onClick={() => setMenuOpen(false)}>×</button>
            </div>
            <nav className="side-menu-links">
              {canViewDashboard && (
                <button type="button" onClick={() => (window.location.href = "/dashboard")}>
                  <MenuIcon name="dashboard" /><span>Dashboard</span>
                </button>
              )}
              {canViewQueue && (
                <button type="button" onClick={() => (window.location.href = "/atendimentos")}>
                  <MenuIcon name="attendance" /><span>Atendimentos</span>
                </button>
              )}
              {canViewFinance && (
                <div className="menu-group">
                  <button type="button" className="menu-parent-button active" onClick={() => setFinanceMenuOpen(!financeMenuOpen)}>
                    <MenuIcon name="finance" /><span>Financeiro</span>
                    <svg className={financeMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {financeMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" className="active" onClick={() => (window.location.href = "/financeiro/a-receber")}>
                        <MenuIcon name="receivables" /><span>A receber</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/financeiro/a-pagar")}>
                        <MenuIcon name="payable" /><span>A pagar</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/financeiro/formas-de-pagamento")}>
                        <MenuIcon name="payment" /><span>Formas de pagamento</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/financeiro/banco")}>
                        <MenuIcon name="bank" /><span>Banco</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {canViewCustomers && (
                <button type="button" onClick={() => (window.location.href = "/clientes")}>
                  <MenuIcon name="customers" /><span>Clientes</span>
                </button>
              )}
              {canViewTeam && (
                <button type="button" onClick={() => (window.location.href = "/equipe")}>
                  <MenuIcon name="team" /><span>Equipe</span>
                </button>
              )}
              {canViewAgenda && (
                <div className="menu-group">
                  <button type="button" className="menu-parent-button" onClick={() => setAgendaMenuOpen(!agendaMenuOpen)}>
                    <MenuIcon name="agenda" /><span>Agenda</span>
                    <svg className={agendaMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {agendaMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" onClick={() => (window.location.href = "/agenda?tab=hours")}><MenuIcon name="schedule" /><span>Horários de funcionamento</span></button>
                      <button type="button" onClick={() => (window.location.href = "/agenda?tab=blocks")}><MenuIcon name="blocks" /><span>Bloqueios de agenda</span></button>
                      <button type="button" onClick={() => (window.location.href = "/agenda?tab=settings")}><MenuIcon name="settings" /><span>Configuração da agenda</span></button>
                    </div>
                  )}
                </div>
              )}
              {canViewServices && (
                <div className="menu-group">
                  <button type="button" className="menu-parent-button" onClick={() => setServicesMenuOpen(!servicesMenuOpen)}>
                    <MenuIcon name="services" /><span>Serviços</span>
                    <svg className={servicesMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {servicesMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" onClick={() => (window.location.href = "/servicos")}><MenuIcon name="services" /><span>Lista de serviços</span></button>
                      {canViewCategories && (
                        <button type="button" onClick={() => (window.location.href = "/categorias-servicos")}><MenuIcon name="categories" /><span>Categorias</span></button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {canManageSettings && (
                <div className="menu-group">
                  <button type="button" className="menu-parent-button" onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}>
                    <MenuIcon name="settings" /><span>Configurações</span>
                    <svg className={settingsMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {settingsMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" onClick={() => (window.location.href = "/configuracoes?tab=initial")}><MenuIcon name="info" /><span>Informações iniciais</span></button>
                      <button type="button" onClick={() => (window.location.href = "/configuracoes?tab=location")}><MenuIcon name="location" /><span>Localização</span></button>
                    </div>
                  )}
                </div>
              )}
            </nav>
            <button className="logout-button" type="button" onClick={handleLogout}>Sair da conta</button>
          </aside>
        </div>
      )}

      {dateModalOpen && (
        <div className="ar-date-modal-overlay" onClick={() => setDateModalOpen(false)}>
          <section className="ar-date-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ar-date-modal-header">
              <strong>Escolher data</strong>
              <button type="button" onClick={() => setDateModalOpen(false)}>×</button>
            </div>
            <div className="ar-date-modal-body">
              <label>Data</label>
              <input
                type="date"
                value={temporaryDate}
                onChange={(e) => setTemporaryDate(e.target.value)}
              />
            </div>
            <div className="ar-date-modal-actions">
              <button type="button" className="ar-date-modal-today" onClick={goToToday}>Hoje</button>
              <button type="button" className="ar-date-modal-confirm" onClick={confirmDate}>Ir para data</button>
            </div>
          </section>
        </div>
      )}

      {filterModalOpen && (
        <div className="ar-modal-overlay" onClick={() => setFilterModalOpen(false)}>
          <section className="ar-modal ar-filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ar-modal-header">
              <strong>Filtrar registros</strong>
              <button type="button" onClick={() => setFilterModalOpen(false)}>×</button>
            </div>
            <form onSubmit={applyFilter}>
              <div className="ar-form-group">
                <label>Pessoa</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={tempFilters.customer_name}
                  onChange={(e) => setTempFilters((p) => ({ ...p, customer_name: e.target.value }))}
                />
              </div>
              <div className="ar-form-group">
                <label>Veículo</label>
                <input
                  type="text"
                  placeholder="Placa"
                  value={tempFilters.vehicle_plate}
                  onChange={(e) => setTempFilters((p) => ({ ...p, vehicle_plate: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="ar-form-group">
                <label>Status</label>
                <select
                  value={tempFilters.status}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempFilters((p) => ({ ...p, status: val, payment_method_id: val !== "pago" ? "" : p.payment_method_id }));
                  }}
                >
                  <option value="">Todos</option>
                  <option value="pendente">Em aberto</option>
                  <option value="pago">Pagos</option>
                </select>
              </div>
              {tempFilters.status === "pago" && (
                <div className="ar-form-group">
                  <label>Forma de pagamento</label>
                  <select
                    value={tempFilters.payment_method_id}
                    onChange={(e) => setTempFilters((p) => ({ ...p, payment_method_id: e.target.value }))}
                  >
                    <option value="">Todas</option>
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="ar-form-grid-2">
                <div className="ar-form-group">
                  <label>Valor mínimo</label>
                  <input
                    type="number"
                    placeholder="R$ 0,00"
                    min="0"
                    step="0.01"
                    value={tempFilters.amount_min}
                    onChange={(e) => setTempFilters((p) => ({ ...p, amount_min: e.target.value }))}
                  />
                </div>
                <div className="ar-form-group">
                  <label>Valor máximo</label>
                  <input
                    type="number"
                    placeholder="R$ 0,00"
                    min="0"
                    step="0.01"
                    value={tempFilters.amount_max}
                    onChange={(e) => setTempFilters((p) => ({ ...p, amount_max: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ar-modal-actions">
                <button type="button" className="ar-btn-secondary" onClick={clearFilter}>Limpar filtros</button>
                <button type="submit" className="ar-btn-primary">Aplicar</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {baixaModal && (
        <div className="ar-modal-overlay" onClick={() => setBaixaModal(null)}>
          <section className="ar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ar-modal-header">
              <strong>Dar baixa</strong>
              <button type="button" onClick={() => setBaixaModal(null)}>×</button>
            </div>
            <p className="ar-modal-section-title">Informações do atendimento</p>
            <div className="ar-modal-info-grid">
              <div className="ar-info-row">
                <span>Nome</span>
                <strong>{baixaModal.customer_name}</strong>
              </div>
              <div className="ar-info-row">
                <span>Placa</span>
                <strong>{baixaModal.vehicle_plate}</strong>
              </div>
              <div className="ar-info-row">
                <span>Serviço</span>
                <strong>{baixaModal.service_name}</strong>
              </div>
              <div className="ar-info-row">
                <span>Valor</span>
                <strong className="ar-info-value">{BRL.format(baixaModal.amount)}</strong>
              </div>
            </div>
            {baixaError && <div className="ar-error">{baixaError}</div>}
            <div className="ar-form-group">
              <label>Forma de pagamento</label>
              <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                <option value="">Selecione...</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            {paymentMethods.length === 0 && (
              <p className="ar-no-methods">
                Nenhuma forma de pagamento ativa. Cadastre em{" "}
                <button type="button" className="ar-link" onClick={() => (window.location.href = "/financeiro/formas-de-pagamento")}>
                  Formas de pagamento
                </button>.
              </p>
            )}
            <div className="ar-modal-actions">
              <button type="button" className="ar-btn-secondary" onClick={() => setBaixaModal(null)}>Cancelar</button>
              <button type="button" className="ar-btn-primary" onClick={confirmBaixa} disabled={savingBaixa}>
                {savingBaixa ? "Salvando..." : "Confirmar baixa"}
              </button>
            </div>
          </section>
        </div>
      )}

      {reopenModal && (
        <div className="ar-modal-overlay" onClick={() => setReopenModal(null)}>
          <section className="ar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ar-modal-header">
              <strong>Reabrir registro</strong>
              <button type="button" onClick={() => setReopenModal(null)}>×</button>
            </div>
            <p className="ar-reopen-text">
              Deseja reabrir o registro de <strong>{reopenModal.customer_name}</strong>?
              O status voltará para <em>Em aberto</em> e a forma de pagamento será removida.
            </p>
            {reopenError && <div className="ar-error">{reopenError}</div>}
            <div className="ar-modal-actions">
              <button type="button" className="ar-btn-secondary" onClick={() => setReopenModal(null)}>Cancelar</button>
              <button type="button" className="ar-btn-reopen" onClick={confirmReopen} disabled={savingReopen}>
                {savingReopen ? "Reabrindo..." : "Reabrir"}
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="ar-container">
        <header className="ar-header">
          <button className="menu-button" type="button" onClick={() => setMenuOpen(true)}>
            <span></span><span></span><span></span>
          </button>
          <div className="ar-header-title">
            <h1>A Receber</h1>
          </div>
          <button className="refresh-button" type="button" onClick={() => loadWithParams(selectedDate, filters)} aria-label="Atualizar">↻</button>
        </header>

        {error && <div className="ar-error">{error}</div>}

        <div className="ar-date-selector">
          <div className="ar-date-picker-box">
            <button type="button" className="ar-date-nav-btn" onClick={() => changeDate(-1)} aria-label="Dia anterior">
              <span>‹</span>
            </button>
            <button type="button" className="ar-date-center-btn" onClick={openDateModal}>
              <strong className="ar-date-display">{formatDisplayDate(selectedDate)}</strong>
              <span className="ar-date-sep">-</span>
              <span className="ar-date-weekday">{getWeekdayName(selectedDate)}</span>
            </button>
            <button type="button" className="ar-date-nav-btn" onClick={() => changeDate(1)} aria-label="Próximo dia">
              <span>›</span>
            </button>
          </div>
          <button
            type="button"
            className={`ar-filter-btn${hasActiveFilter() ? " active" : ""}`}
            onClick={openFilterModal}
            aria-label="Filtrar"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
              <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v1.1a1.5 1.5 0 0 1-.44 1.06l-5.81 5.82V20a1 1 0 0 1-1.45.9l-4-2A1 1 0 0 1 9 18v-6.52L3.44 5.66A1.5 1.5 0 0 1 3 4.6V4.5Z" />
            </svg>
          </button>
        </div>

        <section className="ar-panel">
          {receivables.length === 0 ? (
            <div className="ar-empty">
              <strong>Nenhum registro para este dia</strong>
              <p>Atendimentos entregues nesta data aparecerão aqui.</p>
            </div>
          ) : (
            <div className="ar-list">
              {receivables.map((r) => (
                <article className={`ar-card ar-card--${r.status}`} key={r.id}>
                  <div className="ar-card-info">
                    <strong className="ar-customer">{r.customer_name}</strong>
                    <div className="ar-card-sub">
                      <span className="ar-plate">{r.vehicle_plate}</span>
                      <span className="ar-sep">·</span>
                      <span className="ar-time">{formatTime(r.paid_at || r.created_at)}</span>
                    </div>
                    <div className="ar-card-footer">
                      <span className={`ar-status-text ar-status-text--${r.status}`}>{statusLabel(r.status)}</span>
                      {r.status === "pago" && r.payment_method_name && (
                        <>
                          <span className="ar-sep">·</span>
                          <span className="ar-method">{r.payment_method_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ar-card-right">
                    <strong className="ar-amount">{BRL.format(r.amount)}</strong>
                    {r.status === "pendente" && (
                      <button type="button" className="ar-action-btn" onClick={() => openBaixa(r)} aria-label="Dar baixa">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                          <rect x="2" y="6" width="20" height="13" rx="2" />
                          <circle cx="12" cy="12.5" r="2.5" />
                          <path d="M6 9.5v6M18 9.5v6" />
                        </svg>
                      </button>
                    )}
                    {r.status === "pago" && (
                      <button type="button" className="ar-action-btn" onClick={() => openReopen(r)} aria-label="Reabrir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                          <path d="M3 7v6h6" />
                          <path d="M3.5 13A9 9 0 1 0 6 6.3" />
                        </svg>
                      </button>
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

export default AReceber;
