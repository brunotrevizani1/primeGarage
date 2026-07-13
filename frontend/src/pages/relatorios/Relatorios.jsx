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
import "./relatorios.css";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STATUS_LABELS = {
  agendado: "Agendado",
  na_fila: "Na fila",
  em_lavagem: "Em lavagem",
  em_acabamento: "Em acabamento",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function formatDate(str) {
  if (!str) return "-";
  const [y, m, d] = String(str).split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatPhone(p) {
  if (!p) return "-";
  const n = String(p).replace(/\D/g, "");
  if (n.length === 11)
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10)
    return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return p;
}

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

function Relatorios() {
  const now = new Date();
  const defaultStart = toDateStr(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const defaultEnd = toDateStr(now);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(defaultStart);
  const [draftEnd, setDraftEnd] = useState(defaultEnd);

  const [activeTab, setActiveTab] = useState("financial");
  const [finSubTab, setFinSubTab] = useState(null);

  const [financialData, setFinancialData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [teamData, setTeamData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canManageSettings = hasPermission(
    "gerenciar_configuracoes",
    userPermissions,
  );
  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  function getFirstAllowedPath(permissions, role) {
    if (role === "owner" || role === "super_admin") return "/dashboard";
    if (permissions.includes("ver_dashboard")) return "/dashboard";
    if (permissions.includes("ver_fila")) return "/atendimentos";
    return "/";
  }

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  function applyFilter() {
    if (!draftStart || !draftEnd) return;
    setStartDate(draftStart);
    setEndDate(draftEnd);
    setFilterOpen(false);
  }

  async function load(start, end) {
    try {
      setLoading(true);
      setError("");

      const permRes = await loadUserPermissions();
      const currentPermissions = permRes.permissions || [];
      const currentRole = permRes.role || "";
      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const isOwner = currentRole === "owner" || currentRole === "super_admin";
      if (!isOwner) {
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const params = `?start=${start}&end=${end}`;

      const [fin, ord, cus, team] = await Promise.all([
        apiRequest(`/api/reports/financial${params}`),
        apiRequest(`/api/reports/orders${params}`),
        apiRequest(`/api/reports/customers${params}`),
        apiRequest(`/api/reports/team${params}`),
      ]);

      setFinancialData(fin);
      setOrdersData(ord);
      setCustomersData(cus);
      setTeamData(team);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(startDate, endDate);
  }, [startDate, endDate]);

  function handleMainTab(tab) {
    setActiveTab(tab);
    if (tab !== "financial") setFinSubTab(null);
  }

  return (
    <main className="rel-page">
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="side-menu" onClick={(e) => e.stopPropagation()}>
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
                      className={
                        financeMenuOpen ? "submenu-arrow open" : "submenu-arrow"
                      }
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
                        onClick={() =>
                          (window.location.href = "/financeiro/a-receber")
                        }
                      >
                        <MenuIcon name="receivables" />
                        <span>A receber</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/financeiro/a-pagar")
                        }
                      >
                        <MenuIcon name="payable" />
                        <span>A pagar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href =
                            "/financeiro/formas-de-pagamento")
                        }
                      >
                        <MenuIcon name="payment" />
                        <span>Formas de pagamento</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/financeiro/banco")
                        }
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
                  className="active"
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

      <div className="rel-container">
        <header className="rel-header">
          <button
            className="menu-button"
            type="button"
            onClick={() => setMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1>Relatórios</h1>
          <AccountMenu onLogout={handleLogout} />
        </header>

        {error && <div className="rel-error">{error}</div>}

        <div className="rel-tabs">
          <button
            className={activeTab === "financial" ? "rel-tab active" : "rel-tab"}
            onClick={() => handleMainTab("financial")}
          >
            Financeiro
          </button>
          <button
            className={activeTab === "orders" ? "rel-tab active" : "rel-tab"}
            onClick={() => handleMainTab("orders")}
          >
            Atendimentos
          </button>
          <button
            className={activeTab === "customers" ? "rel-tab active" : "rel-tab"}
            onClick={() => handleMainTab("customers")}
          >
            Clientes
          </button>
          <button
            className={activeTab === "team" ? "rel-tab active" : "rel-tab"}
            onClick={() => handleMainTab("team")}
          >
            Equipe
          </button>
        </div>

        {loading ? (
          <div className="rel-loading">
            <div className="rel-loading-circle"></div>
            <p>Carregando...</p>
          </div>
        ) : (
          <>
            {activeTab === "financial" && financialData && (
              <FinancialTab
                data={financialData}
                subTab={finSubTab}
                setSubTab={setFinSubTab}
                startDate={startDate}
                endDate={endDate}
                draftStart={draftStart}
                draftEnd={draftEnd}
                setDraftStart={setDraftStart}
                setDraftEnd={setDraftEnd}
                filterOpen={filterOpen}
                setFilterOpen={setFilterOpen}
                applyFilter={applyFilter}
                defaultStart={defaultStart}
                defaultEnd={defaultEnd}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                now={now}
              />
            )}
            {activeTab === "orders" && ordersData && (
              <OrdersTab
                data={ordersData}
                startDate={startDate}
                endDate={endDate}
                draftStart={draftStart}
                draftEnd={draftEnd}
                setDraftStart={setDraftStart}
                setDraftEnd={setDraftEnd}
                filterOpen={filterOpen}
                setFilterOpen={setFilterOpen}
                applyFilter={applyFilter}
                defaultStart={defaultStart}
                defaultEnd={defaultEnd}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                now={now}
              />
            )}
            {activeTab === "customers" && customersData && (
              <CustomersTab
                data={customersData}
                startDate={startDate}
                endDate={endDate}
                draftStart={draftStart}
                draftEnd={draftEnd}
                setDraftStart={setDraftStart}
                setDraftEnd={setDraftEnd}
                filterOpen={filterOpen}
                setFilterOpen={setFilterOpen}
                applyFilter={applyFilter}
                defaultStart={defaultStart}
                defaultEnd={defaultEnd}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                now={now}
              />
            )}
            {activeTab === "team" && teamData && (
              <TeamTab
                data={teamData}
                startDate={startDate}
                endDate={endDate}
                draftStart={draftStart}
                draftEnd={draftEnd}
                setDraftStart={setDraftStart}
                setDraftEnd={setDraftEnd}
                filterOpen={filterOpen}
                setFilterOpen={setFilterOpen}
                applyFilter={applyFilter}
                defaultStart={defaultStart}
                defaultEnd={defaultEnd}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                now={now}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

const FILTER_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v1.1a1.5 1.5 0 0 1-.44 1.06l-5.81 5.82V20a1 1 0 0 1-1.45.9l-4-2A1 1 0 0 1 9 18v-6.52L3.44 5.66A1.5 1.5 0 0 1 3 4.6V4.5Z" />
  </svg>
);

function FilterModal({
  draftStart,
  draftEnd,
  setDraftStart,
  setDraftEnd,
  onApply,
  onClear,
  onClose,
  now,
}) {
  return (
    <div className="rel-filter-overlay" onClick={onClose}>
      <div className="rel-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rel-filter-modal-header">
          <strong>Filtrar por período</strong>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="rel-filter-date-row">
          <label className="rel-filter-date-label">
            Data inicial
            <input
              type="date"
              className="rel-filter-date-input"
              value={draftStart}
              max={draftEnd}
              onChange={(e) => setDraftStart(e.target.value)}
            />
          </label>
          <label className="rel-filter-date-label">
            Data final
            <input
              type="date"
              className="rel-filter-date-input"
              value={draftEnd}
              min={draftStart}
              max={toDateStr(now)}
              onChange={(e) => setDraftEnd(e.target.value)}
            />
          </label>
        </div>
        <div className="rel-filter-actions">
          <button type="button" className="rel-filter-clear" onClick={onClear}>
            Limpar filtro
          </button>
          <button
            type="button"
            className="rel-filter-apply"
            onClick={onApply}
            disabled={!draftStart || !draftEnd}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

function FinancialTab({
  data,
  subTab,
  setSubTab,
  startDate,
  endDate,
  draftStart,
  draftEnd,
  setDraftStart,
  setDraftEnd,
  filterOpen,
  setFilterOpen,
  applyFilter,
  defaultStart,
  defaultEnd,
  setStartDate,
  setEndDate,
  now,
}) {
  const { receivables: rec, payables: pay } = data;
  const hasActiveFilter = startDate !== defaultStart || endDate !== defaultEnd;

  function openFilter() {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setFilterOpen(true);
  }

  function clearFilter() {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setFilterOpen(false);
  }

  return (
    <>
      {filterOpen && (
        <FilterModal
          draftStart={draftStart}
          draftEnd={draftEnd}
          setDraftStart={setDraftStart}
          setDraftEnd={setDraftEnd}
          onApply={applyFilter}
          onClear={clearFilter}
          onClose={() => setFilterOpen(false)}
          now={now}
        />
      )}

      <div className="rel-subtabs">
        <button
          className={
            subTab === "receivables" ? "rel-subtab active" : "rel-subtab"
          }
          onClick={() =>
            setSubTab(subTab === "receivables" ? null : "receivables")
          }
        >
          A Receber
        </button>
        <button
          className={subTab === "payables" ? "rel-subtab active" : "rel-subtab"}
          onClick={() => setSubTab(subTab === "payables" ? null : "payables")}
        >
          A Pagar
        </button>
        <button
          className={subTab === "result" ? "rel-subtab active" : "rel-subtab"}
          onClick={() => setSubTab(subTab === "result" ? null : "result")}
        >
          Resultado
        </button>
      </div>

      {!subTab && (
        <div className="rel-empty-state">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
          <p>Selecione uma opção acima para ver os dados</p>
        </div>
      )}

      {subTab === "receivables" && (
        <div className="rel-section">
          <div className="rel-section-header">
            <span className="rel-section-name">A Receber</span>
            <button
              className={
                hasActiveFilter
                  ? "rel-filter-icon-btn active"
                  : "rel-filter-icon-btn"
              }
              onClick={openFilter}
              aria-label="Filtrar"
            >
              {FILTER_ICON}
            </button>
          </div>
          <div className="rel-cards">
            <div className="rel-card">
              <div className="rel-card-label">Atendimentos</div>
              <div className="rel-card-value blue">{rec.total_count}</div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Total gerado</div>
              <div className="rel-card-value">
                {BRL.format(rec.total_amount)}
              </div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Pago</div>
              <div className="rel-card-value green">
                {BRL.format(rec.paid_amount)}
              </div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Em aberto</div>
              <div className="rel-card-value yellow">
                {BRL.format(rec.pending_amount)}
              </div>
            </div>
          </div>

        </div>
      )}

      {subTab === "payables" && (
        <div className="rel-section">
          <div className="rel-section-header">
            <span className="rel-section-name">A Pagar</span>
            <button
              className={
                hasActiveFilter
                  ? "rel-filter-icon-btn active"
                  : "rel-filter-icon-btn"
              }
              onClick={openFilter}
              aria-label="Filtrar"
            >
              {FILTER_ICON}
            </button>
          </div>
          <div className="rel-cards">
            <div className="rel-card">
              <div className="rel-card-label">Total previsto</div>
              <div className="rel-card-value">
                {BRL.format(pay.total_amount)}
              </div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Pago</div>
              <div className="rel-card-value green">
                {BRL.format(pay.paid_amount)}
              </div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Em aberto</div>
              <div className="rel-card-value red">
                {BRL.format(pay.pending_amount)}
              </div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Despesas</div>
              <div className="rel-card-value blue">{pay.total_count}</div>
            </div>
          </div>

          <div className="rel-section-title">Por banco</div>
          {pay.by_bank.length > 0 ? (
            <div className="rel-table-wrap">
              <table className="rel-table">
                <thead>
                  <tr>
                    <th>Banco</th>
                    <th className="count">Qtd</th>
                    <th className="amount">Total pago</th>
                  </tr>
                </thead>
                <tbody>
                  {pay.by_bank.map((b, i) => (
                    <tr key={i}>
                      <td>{b.name}</td>
                      <td className="count">{b.count}</td>
                      <td className="amount">{BRL.format(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rel-empty-table">
              Nenhuma conta paga neste período
            </div>
          )}
        </div>
      )}

      {subTab === "result" && (
        <div className="rel-section">
          <div className="rel-section-header">
            <span className="rel-section-name">Resultado</span>
            <button
              className={
                hasActiveFilter
                  ? "rel-filter-icon-btn active"
                  : "rel-filter-icon-btn"
              }
              onClick={openFilter}
              aria-label="Filtrar"
            >
              {FILTER_ICON}
            </button>
          </div>
          <div className="rel-cards">
            <div className="rel-card rel-card--full">
              <div className="rel-card-label">Saldo</div>
              <div
                className={`rel-card-value ${rec.paid_amount - pay.paid_amount >= 0 ? "green" : "red"}`}
              >
                {BRL.format(rec.paid_amount - pay.paid_amount)}
              </div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Entradas</div>
              <div className="rel-card-value green">{BRL.format(rec.paid_amount)}</div>
            </div>
            <div className="rel-card">
              <div className="rel-card-label">Saídas</div>
              <div className="rel-card-value red">{BRL.format(pay.paid_amount)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OrdersTab({
  data,
  startDate,
  endDate,
  draftStart,
  draftEnd,
  setDraftStart,
  setDraftEnd,
  filterOpen,
  setFilterOpen,
  applyFilter,
  defaultStart,
  defaultEnd,
  setStartDate,
  setEndDate,
  now,
}) {
  const hasActiveFilter = startDate !== defaultStart || endDate !== defaultEnd;

  function openFilter() {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setFilterOpen(true);
  }

  function clearFilter() {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setFilterOpen(false);
  }

  return (
    <>
      {filterOpen && (
        <FilterModal
          draftStart={draftStart}
          draftEnd={draftEnd}
          setDraftStart={setDraftStart}
          setDraftEnd={setDraftEnd}
          onApply={applyFilter}
          onClear={clearFilter}
          onClose={() => setFilterOpen(false)}
          now={now}
        />
      )}

      <div className="rel-section">
        <div className="rel-section-header">
          <span className="rel-section-name">Atendimentos</span>
          <button
            className={
              hasActiveFilter
                ? "rel-filter-icon-btn active"
                : "rel-filter-icon-btn"
            }
            onClick={openFilter}
            aria-label="Filtrar"
          >
            {FILTER_ICON}
          </button>
        </div>
        <div className="rel-cards">
          <div className="rel-card rel-card--full">
            <div className="rel-card-label">Total de atendimentos</div>
            <div className="rel-card-value blue">{data.total}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Agendado</div>
            <div className="rel-card-value">{data.agendado}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Na fila</div>
            <div className="rel-card-value">{data.na_fila}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Lavando</div>
            <div className="rel-card-value">{data.em_lavagem}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Pronto</div>
            <div className="rel-card-value yellow">{data.pronto}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Entregue</div>
            <div className="rel-card-value green">{data.entregue}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Cancelado</div>
            <div className="rel-card-value red">{data.cancelado}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function CustomersTab({
  data,
  startDate,
  endDate,
  draftStart,
  draftEnd,
  setDraftStart,
  setDraftEnd,
  filterOpen,
  setFilterOpen,
  applyFilter,
  defaultStart,
  defaultEnd,
  setStartDate,
  setEndDate,
  now,
}) {
  const hasActiveFilter = startDate !== defaultStart || endDate !== defaultEnd;

  function openFilter() {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setFilterOpen(true);
  }

  function clearFilter() {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setFilterOpen(false);
  }

  return (
    <>
      {filterOpen && (
        <FilterModal
          draftStart={draftStart}
          draftEnd={draftEnd}
          setDraftStart={setDraftStart}
          setDraftEnd={setDraftEnd}
          onApply={applyFilter}
          onClear={clearFilter}
          onClose={() => setFilterOpen(false)}
          now={now}
        />
      )}

      <div className="rel-section">
        <div className="rel-section-header">
          <span className="rel-section-name">Clientes</span>
          <button
            className={
              hasActiveFilter
                ? "rel-filter-icon-btn active"
                : "rel-filter-icon-btn"
            }
            onClick={openFilter}
            aria-label="Filtrar"
          >
            {FILTER_ICON}
          </button>
        </div>
        <div className="rel-cards">
          <div className="rel-card">
            <div className="rel-card-label">Total cadastrados</div>
            <div className="rel-card-value blue">{data.total_customers}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Novos no período</div>
            <div className="rel-card-value green">{data.new_in_period}</div>
          </div>
        </div>
      </div>

      <div className="rel-section">
        <div className="rel-section-title">Atendimentos por cliente</div>
        {data.customers.length > 0 ? (
          <CustomerList customers={data.customers} />
        ) : (
          <div className="rel-empty-table">Nenhum atendimento entregue neste período</div>
        )}
      </div>
    </>
  );
}

function CustomerList({ customers }) {
  const [expanded, setExpanded] = useState(null);

  function toggle(i) {
    setExpanded(expanded === i ? null : i);
  }

  return (
    <div className="rel-customer-list">
      {customers.map((c, i) => (
        <div key={i} className="rel-customer-card">
          <div className="rel-customer-main">
            <div className="rel-customer-info">
              <span className="rel-customer-name">{c.name}</span>
              <span className="rel-customer-phone">{formatPhone(c.phone)}</span>
            </div>
            <div className="rel-customer-stats">
              <span className="rel-customer-stat">
                <span className="rel-customer-stat-value">{c.total_orders}</span>
                <span className="rel-customer-stat-label">atend.</span>
              </span>
              <span className="rel-customer-stat">
                <span className="rel-customer-stat-value">{BRL.format(c.total_spent)}</span>
                <span className="rel-customer-stat-label">gasto</span>
              </span>
              {c.services.length > 0 && (
                <button
                  className={expanded === i ? "rel-customer-toggle open" : "rel-customer-toggle"}
                  onClick={() => toggle(i)}
                  aria-label="Ver serviços"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {expanded === i && (
            <div className="rel-customer-services">
              {c.services.map((s, j) => (
                <div key={j} className="rel-customer-service-row">
                  <span>{s.name}</span>
                  <span className="rel-customer-service-count">{s.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TeamTab({
  data,
  startDate,
  endDate,
  draftStart,
  draftEnd,
  setDraftStart,
  setDraftEnd,
  filterOpen,
  setFilterOpen,
  applyFilter,
  defaultStart,
  defaultEnd,
  setStartDate,
  setEndDate,
  now,
}) {
  const hasActiveFilter = startDate !== defaultStart || endDate !== defaultEnd;

  function openFilter() {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setFilterOpen(true);
  }

  function clearFilter() {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setFilterOpen(false);
  }

  return (
    <>
      {filterOpen && (
        <FilterModal
          draftStart={draftStart}
          draftEnd={draftEnd}
          setDraftStart={setDraftStart}
          setDraftEnd={setDraftEnd}
          onApply={applyFilter}
          onClear={clearFilter}
          onClose={() => setFilterOpen(false)}
          now={now}
        />
      )}

      <div className="rel-section">
        <div className="rel-section-header">
          <span className="rel-section-name">Equipe</span>
          <button
            className={hasActiveFilter ? "rel-filter-icon-btn active" : "rel-filter-icon-btn"}
            onClick={openFilter}
            aria-label="Filtrar"
          >
            {FILTER_ICON}
          </button>
        </div>

        {data.team.length === 0 ? (
          <div className="rel-empty-table">Nenhum funcionário ativo encontrado</div>
        ) : (
          <EmployeeList team={data.team} />
        )}
      </div>
    </>
  );
}

function EmployeeList({ team }) {
  const [expanded, setExpanded] = useState(null);

  function toggle(i) {
    setExpanded(expanded === i ? null : i);
  }

  return (
    <div className="rel-customer-list">
      {team.map((emp, i) => (
        <div key={i} className="rel-customer-card">
          <div className="rel-customer-main">
            <div className="rel-customer-info">
              <span className="rel-customer-name">{emp.name}</span>
              {emp.commission_enabled && (
                <span className="rel-customer-phone">
                  Comissão: {emp.commission_rate}%
                </span>
              )}
            </div>
            <div className="rel-customer-stats">
              <span className="rel-customer-stat">
                <span className="rel-customer-stat-value">{emp.total_orders}</span>
                <span className="rel-customer-stat-label">Atend</span>
              </span>
              <span className="rel-customer-stat">
                <span className="rel-customer-stat-value">{BRL.format(emp.total_value)}</span>
                <span className="rel-customer-stat-label">total</span>
              </span>
              {emp.services.length > 0 && (
                <button
                  className={expanded === i ? "rel-customer-toggle open" : "rel-customer-toggle"}
                  onClick={() => toggle(i)}
                  aria-label="Ver serviços"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {emp.commission_enabled && emp.commission !== null && (
            <div className="rel-employee-commission">
              <span className="rel-employee-commission-label">Comissão estimada</span>
              <span className="rel-employee-commission-value">{BRL.format(emp.commission)}</span>
            </div>
          )}

          {expanded === i && emp.services.length > 0 && (
            <div className="rel-customer-services">
              {emp.services.map((s, j) => (
                <div key={j} className="rel-customer-service-row">
                  <span>{s.name}</span>
                  <span className="rel-customer-service-count">{s.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Relatorios;
