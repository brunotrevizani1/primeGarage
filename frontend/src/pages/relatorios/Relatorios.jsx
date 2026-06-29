import { useEffect, useState } from "react";
import MenuIcon from "../../components/MenuIcon";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./relatorios.css";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return p;
}

function Relatorios() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState("financial");

  const [financialData, setFinancialData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [customersData, setCustomersData] = useState(null);

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
  const canManageSettings = hasPermission("gerenciar_configuracoes", userPermissions);
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

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }

  async function load() {
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
        window.location.href = getFirstAllowedPath(currentPermissions, currentRole);
        return;
      }

      const params = `?year=${year}&month=${month}`;

      const [fin, ord, cus] = await Promise.all([
        apiRequest(`/api/reports/financial${params}`),
        apiRequest(`/api/reports/orders${params}`),
        apiRequest(`/api/reports/customers${params}`),
      ]);

      setFinancialData(fin);
      setOrdersData(ord);
      setCustomersData(cus);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [year, month]);

  return (
    <main className="rel-page">
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
                  <MenuIcon name="dashboard" />
                  <span>Dashboard</span>
                </button>
              )}
              {canViewQueue && (
                <button type="button" onClick={() => (window.location.href = "/atendimentos")}>
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
                    <svg className={financeMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {financeMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" onClick={() => (window.location.href = "/financeiro/a-receber")}>
                        <MenuIcon name="receivables" />
                        <span>A receber</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/financeiro/a-pagar")}>
                        <MenuIcon name="payable" />
                        <span>A pagar</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/financeiro/formas-de-pagamento")}>
                        <MenuIcon name="payment" />
                        <span>Formas de pagamento</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/financeiro/banco")}>
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
                <button type="button" onClick={() => (window.location.href = "/clientes")}>
                  <MenuIcon name="customers" />
                  <span>Clientes</span>
                </button>
              )}
              {canViewTeam && (
                <button type="button" onClick={() => (window.location.href = "/equipe")}>
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
                    <svg className={agendaMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {agendaMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" onClick={() => (window.location.href = "/agenda?tab=hours")}>
                        <MenuIcon name="schedule" />
                        <span>Horários de funcionamento</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/agenda?tab=blocks")}>
                        <MenuIcon name="blocks" />
                        <span>Bloqueios de agenda</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/agenda?tab=settings")}>
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
                    <svg className={servicesMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {servicesMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" onClick={() => (window.location.href = "/servicos")}>
                        <MenuIcon name="services" />
                        <span>Lista de serviços</span>
                      </button>
                      {canViewCategories && (
                        <button type="button" onClick={() => (window.location.href = "/categorias-servicos")}>
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
                    <svg className={settingsMenuOpen ? "submenu-arrow open" : "submenu-arrow"} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>
                  {settingsMenuOpen && (
                    <div className="submenu-links">
                      <button type="button" onClick={() => (window.location.href = "/configuracoes?tab=initial")}>
                        <MenuIcon name="info" />
                        <span>Informações iniciais</span>
                      </button>
                      <button type="button" onClick={() => (window.location.href = "/configuracoes?tab=location")}>
                        <MenuIcon name="location" />
                        <span>Localização</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>

            <button className="logout-button" type="button" onClick={handleLogout}>
              Sair da conta
            </button>
          </aside>
        </div>
      )}

      <section className="rel-container">
        <header className="rel-header">
          <button className="menu-button" type="button" onClick={() => setMenuOpen(true)}>
            <span></span><span></span><span></span>
          </button>
          <h1>Relatórios</h1>
          <button className="refresh-button" type="button" onClick={load} aria-label="Atualizar">↻</button>
        </header>

        {error && <div className="rel-error">{error}</div>}

        <div className="rel-period">
          <button className="rel-period-btn" onClick={prevMonth} aria-label="Mês anterior">‹</button>
          <span className="rel-period-label">{MONTH_NAMES[month - 1]} {year}</span>
          <button className="rel-period-btn" onClick={nextMonth} aria-label="Próximo mês">›</button>
          <button className="rel-period-today" onClick={goToday}>Hoje</button>
        </div>

        <div className="rel-tabs">
          <button className={activeTab === "financial" ? "rel-tab active" : "rel-tab"} onClick={() => setActiveTab("financial")}>
            Financeiro
          </button>
          <button className={activeTab === "orders" ? "rel-tab active" : "rel-tab"} onClick={() => setActiveTab("orders")}>
            Atendimentos
          </button>
          <button className={activeTab === "customers" ? "rel-tab active" : "rel-tab"} onClick={() => setActiveTab("customers")}>
            Clientes
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
              <FinancialTab data={financialData} />
            )}
            {activeTab === "orders" && ordersData && (
              <OrdersTab data={ordersData} />
            )}
            {activeTab === "customers" && customersData && (
              <CustomersTab data={customersData} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function FinancialTab({ data }) {
  const { receivables: rec, payables: pay } = data;

  return (
    <>
      <div className="rel-section">
        <div className="rel-section-title">A Receber</div>
        <div className="rel-cards">
          <div className="rel-card">
            <div className="rel-card-label">Total gerado</div>
            <div className="rel-card-value">{BRL.format(rec.total_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Recebido</div>
            <div className="rel-card-value green">{BRL.format(rec.paid_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Pendente</div>
            <div className="rel-card-value yellow">{BRL.format(rec.pending_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Registros</div>
            <div className="rel-card-value blue">{rec.total_count}</div>
          </div>
        </div>

        {rec.by_method.length > 0 ? (
          <div className="rel-table-wrap">
            <table className="rel-table">
              <thead>
                <tr>
                  <th>Forma de pagamento</th>
                  <th className="count">Qtd</th>
                  <th className="amount">Total recebido</th>
                </tr>
              </thead>
              <tbody>
                {rec.by_method.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td className="count">{m.count}</td>
                    <td className="amount">{BRL.format(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rel-empty-table">Nenhum recebível pago neste período</div>
        )}
      </div>

      <div className="rel-section">
        <div className="rel-section-title">A Pagar</div>
        <div className="rel-cards">
          <div className="rel-card">
            <div className="rel-card-label">Total previsto</div>
            <div className="rel-card-value">{BRL.format(pay.total_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Pago</div>
            <div className="rel-card-value green">{BRL.format(pay.paid_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Pendente</div>
            <div className="rel-card-value red">{BRL.format(pay.pending_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Contas</div>
            <div className="rel-card-value blue">{pay.total_count}</div>
          </div>
        </div>

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
          <div className="rel-empty-table">Nenhuma conta paga neste período</div>
        )}
      </div>

      <div className="rel-section">
        <div className="rel-section-title">Resultado do período</div>
        <div className="rel-cards">
          <div className="rel-card">
            <div className="rel-card-label">Entradas</div>
            <div className="rel-card-value green">{BRL.format(rec.paid_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Saídas</div>
            <div className="rel-card-value red">{BRL.format(pay.paid_amount)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Saldo</div>
            <div className={`rel-card-value ${rec.paid_amount - pay.paid_amount >= 0 ? "green" : "red"}`}>
              {BRL.format(rec.paid_amount - pay.paid_amount)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OrdersTab({ data }) {
  return (
    <>
      <div className="rel-section">
        <div className="rel-section-title">Resumo</div>
        <div className="rel-cards">
          <div className="rel-card">
            <div className="rel-card-label">Total de OS</div>
            <div className="rel-card-value blue">{data.total}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Entregues</div>
            <div className="rel-card-value green">{data.delivered}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Cancelados</div>
            <div className="rel-card-value red">{data.cancelled}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Faturamento</div>
            <div className="rel-card-value">{BRL.format(data.total_revenue)}</div>
          </div>
          <div className="rel-card">
            <div className="rel-card-label">Ticket médio</div>
            <div className="rel-card-value">{BRL.format(data.avg_ticket)}</div>
          </div>
        </div>
      </div>

      <div className="rel-section">
        <div className="rel-section-title">Por serviço (entregues)</div>
        {data.by_service.length > 0 ? (
          <div className="rel-table-wrap">
            <table className="rel-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th className="count">Qtd</th>
                  <th className="amount">Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.by_service.map((s, i) => (
                  <tr key={i}>
                    <td>{s.service_name}</td>
                    <td className="count">{s.count}</td>
                    <td className="amount">{BRL.format(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rel-empty-table">Nenhum atendimento entregue neste período</div>
        )}
      </div>

      {data.by_day.length > 0 && (
        <div className="rel-section">
          <div className="rel-section-title">Por dia</div>
          <div className="rel-table-wrap">
            <table className="rel-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="count">OS criadas</th>
                  <th className="amount">Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.by_day.map((d, i) => (
                  <tr key={i}>
                    <td>{formatDate(d.date)}</td>
                    <td className="count">{d.count}</td>
                    <td className="amount">{BRL.format(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function CustomersTab({ data }) {
  return (
    <>
      <div className="rel-section">
        <div className="rel-section-title">Resumo</div>
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
        <div className="rel-section-title">Clientes mais ativos (atendimentos entregues)</div>
        {data.top_customers.length > 0 ? (
          <div className="rel-table-wrap">
            <table className="rel-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th className="count">Atendimentos</th>
                  <th className="amount">Total gasto</th>
                </tr>
              </thead>
              <tbody>
                {data.top_customers.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{formatPhone(c.phone)}</td>
                    <td className="count">{c.total_orders}</td>
                    <td className="amount">{BRL.format(c.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rel-empty-table">Nenhum atendimento entregue neste período</div>
        )}
      </div>

      {data.new_customers.length > 0 && (
        <div className="rel-section">
          <div className="rel-section-title">Novos clientes no período</div>
          <div className="rel-table-wrap">
            <table className="rel-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>Veículo</th>
                  <th>Placa</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {data.new_customers.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{formatPhone(c.phone)}</td>
                    <td>{c.vehicle_model || "-"}</td>
                    <td>{c.vehicle_plate || "-"}</td>
                    <td>{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default Relatorios;
