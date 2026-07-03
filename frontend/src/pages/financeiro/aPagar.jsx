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
import "./aPagar.css";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const EMPTY_FILTERS = { status: "", bank_id: "", amount_min: "", amount_max: "", description: "" };
const EMPTY_FORM = { description: "", amount: "", due_date: "", recurrence: "none" };

const RECURRENCE_LABELS = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  yearly: "Anual",
};

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrencyInput(value) {
  const numbers = String(value).replace(/\D/g, "");
  if (!numbers) return "";
  const amount = Number(numbers) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function currencyToNumber(value) {
  const numbers = String(value).replace(/\D/g, "");
  if (!numbers) return 0;
  return Number(numbers) / 100;
}

function APagar() {
  const [payables, setPayables] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tempFilters, setTempFilters] = useState(EMPTY_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [baixaModal, setBaixaModal] = useState(null);
  const [selectedBank, setSelectedBank] = useState("");
  const [savingBaixa, setSavingBaixa] = useState(false);
  const [baixaError, setBaixaError] = useState("");

  const [reopenModal, setReopenModal] = useState(null);
  const [savingReopen, setSavingReopen] = useState(false);
  const [reopenError, setReopenError] = useState("");

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  function openFilterModal() {
    setTempFilters({ ...filters });
    setFilterModalOpen(true);
  }

  function applyFilter(e) {
    e.preventDefault();
    const applied = { ...tempFilters };
    setFilters(applied);
    setFilterModalOpen(false);
    loadData(applied);
  }

  function clearFilter() {
    setTempFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setFilterModalOpen(false);
    loadData(EMPTY_FILTERS);
  }

  async function loadData(activeFilters = filters) {
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

      const params = new URLSearchParams();
      if (activeFilters.status) params.append("status", activeFilters.status);
      if (activeFilters.bank_id) params.append("bank_id", activeFilters.bank_id);
      if (activeFilters.amount_min) params.append("amount_min", activeFilters.amount_min);
      if (activeFilters.amount_max) params.append("amount_max", activeFilters.amount_max);
      if (activeFilters.description) params.append("description", activeFilters.description);

      const qs = params.toString();
      const [payablesRes, banksRes] = await Promise.all([
        apiRequest(`/api/payables${qs ? `?${qs}` : ""}`),
        apiRequest("/api/banks"),
      ]);

      setPayables(payablesRes.payables || []);
      setBanks((banksRes.banks || []).filter((b) => b.is_active));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setFormModal("create");
    setForm({ ...EMPTY_FORM, due_date: getLocalDateString() });
    setFormError("");
  }

  function openEdit(payable) {
    setFormModal(payable);
    setForm({
      description: payable.description,
      amount: formatCurrencyInput(String(Math.round(Number(payable.amount) * 100))),
      due_date: payable.due_date ? payable.due_date.split("T")[0] : getLocalDateString(),
      recurrence: payable.recurrence || "none",
    });
    setFormError("");
  }

  function closeFormModal() {
    setFormModal(null);
    setFormError("");
  }

  async function savePayable(e) {
    e.preventDefault();
    if (!form.description.trim()) { setFormError("Descrição é obrigatória."); return; }
    if (!form.amount || currencyToNumber(form.amount) <= 0) { setFormError("Valor deve ser maior que zero."); return; }
    if (!form.due_date) { setFormError("Data de vencimento é obrigatória."); return; }
    try {
      setSaving(true);
      setFormError("");
      const body = {
        description: form.description.trim(),
        amount: currencyToNumber(form.amount),
        due_date: form.due_date,
        recurrence: form.recurrence !== "none" ? form.recurrence : null,
      };
      if (formModal === "create") {
        await apiRequest("/api/payables", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiRequest(`/api/payables/${formModal.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      closeFormModal();
      loadData(filters);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openBaixa(payable) {
    setBaixaModal(payable);
    setSelectedBank("");
    setBaixaError("");
  }

  async function confirmBaixa() {
    if (!selectedBank) { setBaixaError("Selecione um banco."); return; }
    try {
      setSavingBaixa(true);
      setBaixaError("");
      await apiRequest(`/api/payables/${baixaModal.id}/pay`, {
        method: "PUT",
        body: JSON.stringify({ bank_id: Number(selectedBank) }),
      });
      setBaixaModal(null);
      loadData(filters);
    } catch (err) {
      setBaixaError(err.message);
    } finally {
      setSavingBaixa(false);
    }
  }

  function openReopen(payable) {
    setReopenModal(payable);
    setReopenError("");
  }

  async function confirmReopen() {
    try {
      setSavingReopen(true);
      setReopenError("");
      await apiRequest(`/api/payables/${reopenModal.id}/reopen`, { method: "PUT" });
      setReopenModal(null);
      loadData(filters);
    } catch (err) {
      setReopenError(err.message);
    } finally {
      setSavingReopen(false);
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    try {
      setDeleting(true);
      await apiRequest(`/api/payables/${deleteModal.id}`, { method: "DELETE" });
      setDeleteModal(null);
      loadData(filters);
    } catch (err) {
      setError(err.message);
      setDeleteModal(null);
    } finally {
      setDeleting(false);
    }
  }

  function statusLabel(status) {
    return status === "pendente" ? "Em aberto" : "Pago";
  }

  function isOverdue(payable) {
    if (payable.status !== "pendente") return false;
    const today = getLocalDateString();
    return payable.due_date.split("T")[0] < today;
  }

  useEffect(() => {
    loadData(EMPTY_FILTERS);
  }, []);

  if (loading) {
    return (
      <main className="ap-page">
        <section className="ap-loading">
          <div className="ap-loading-circle"></div>
          <p>Carregando...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="ap-page">
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
                      <button type="button" onClick={() => (window.location.href = "/financeiro/a-receber")}>
                        <MenuIcon name="receivables" /><span>A receber</span>
                      </button>
                      <button type="button" className="active" onClick={() => (window.location.href = "/financeiro/a-pagar")}>
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
          </aside>
        </div>
      )}

      {filterModalOpen && (
        <div className="ap-modal-overlay" onClick={() => setFilterModalOpen(false)}>
          <section className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <strong>Filtrar registros</strong>
              <button type="button" onClick={() => setFilterModalOpen(false)}>×</button>
            </div>
            <form onSubmit={applyFilter}>
              <div className="ap-form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  placeholder="Buscar por descrição"
                  value={tempFilters.description}
                  onChange={(e) => setTempFilters((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="ap-form-group">
                <label>Status</label>
                <select
                  value={tempFilters.status}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempFilters((p) => ({ ...p, status: val, bank_id: val !== "pago" ? "" : p.bank_id }));
                  }}
                >
                  <option value="">Todos</option>
                  <option value="pendente">Em aberto</option>
                  <option value="pago">Pagos</option>
                </select>
              </div>
              {tempFilters.status === "pago" && (
                <div className="ap-form-group">
                  <label>Banco</label>
                  <select
                    value={tempFilters.bank_id}
                    onChange={(e) => setTempFilters((p) => ({ ...p, bank_id: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="ap-form-grid-2">
                <div className="ap-form-group">
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
                <div className="ap-form-group">
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
              <div className="ap-modal-actions">
                <button type="button" className="ap-btn-secondary" onClick={clearFilter}>Limpar filtros</button>
                <button type="submit" className="ap-btn-primary">Aplicar</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {formModal !== null && (
        <div className="ap-modal-overlay" onClick={closeFormModal}>
          <section className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <strong>{formModal === "create" ? "Nova conta a pagar" : "Editar conta a pagar"}</strong>
              <button type="button" onClick={closeFormModal}>×</button>
            </div>
            {formError && <div className="ap-error">{formError}</div>}
            <form onSubmit={savePayable}>
              <div className="ap-form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Água, Fornecedor..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="ap-form-grid-2">
                <div className="ap-form-group">
                  <label>Valor</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: formatCurrencyInput(e.target.value) }))}
                  />
                </div>
                <div className="ap-form-group">
                  <label>Vencimento</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ap-form-group">
                <label>Recorrência</label>
                <select
                  value={form.recurrence}
                  onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                >
                  <option value="none">Sem recorrência</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <div className="ap-modal-actions">
                <button type="button" className="ap-btn-secondary" onClick={closeFormModal}>Cancelar</button>
                <button type="submit" className="ap-btn-primary" disabled={saving}>
                  {saving ? "Salvando..." : formModal === "create" ? "Criar" : "Salvar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {baixaModal && (
        <div className="ap-modal-overlay" onClick={() => setBaixaModal(null)}>
          <section className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <strong>Dar baixa</strong>
              <button type="button" onClick={() => setBaixaModal(null)}>×</button>
            </div>
            <p className="ap-modal-section-title">Informações da conta</p>
            <div className="ap-modal-info-grid">
              <div className="ap-info-row">
                <span>Descrição</span>
                <strong>{baixaModal.description}</strong>
              </div>
              <div className="ap-info-row">
                <span>Vencimento</span>
                <strong>{formatDate(baixaModal.due_date)}</strong>
              </div>
              <div className="ap-info-row">
                <span>Valor</span>
                <strong className="ap-info-value">{BRL.format(baixaModal.amount)}</strong>
              </div>
            </div>
            {baixaError && <div className="ap-error">{baixaError}</div>}
            <div className="ap-form-group">
              <label>Banco</label>
              <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                <option value="">Selecione...</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} — {BRL.format(b.balance)}</option>
                ))}
              </select>
            </div>
            {banks.length === 0 && (
              <p className="ap-no-banks">
                Nenhum banco ativo. Cadastre em{" "}
                <button type="button" className="ap-link" onClick={() => (window.location.href = "/financeiro/banco")}>
                  Banco
                </button>.
              </p>
            )}
            <div className="ap-modal-actions">
              <button type="button" className="ap-btn-secondary" onClick={() => setBaixaModal(null)}>Cancelar</button>
              <button type="button" className="ap-btn-primary" onClick={confirmBaixa} disabled={savingBaixa}>
                {savingBaixa ? "Salvando..." : "Confirmar baixa"}
              </button>
            </div>
          </section>
        </div>
      )}

      {reopenModal && (
        <div className="ap-modal-overlay" onClick={() => setReopenModal(null)}>
          <section className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <strong>Reabrir conta</strong>
              <button type="button" onClick={() => setReopenModal(null)}>×</button>
            </div>
            <p className="ap-reopen-text">
              Deseja reabrir a conta <strong>{reopenModal.description}</strong>?
              O status voltará para <em>Em aberto</em> e o saldo do banco será revertido.
            </p>
            {reopenError && <div className="ap-error">{reopenError}</div>}
            <div className="ap-modal-actions">
              <button type="button" className="ap-btn-secondary" onClick={() => setReopenModal(null)}>Cancelar</button>
              <button type="button" className="ap-btn-reopen" onClick={confirmReopen} disabled={savingReopen}>
                {savingReopen ? "Reabrindo..." : "Reabrir"}
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteModal && (
        <div className="ap-modal-overlay" onClick={() => setDeleteModal(null)}>
          <section className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <strong>Excluir conta</strong>
              <button type="button" onClick={() => setDeleteModal(null)}>×</button>
            </div>
            <p className="ap-delete-text">
              Deseja excluir a conta <strong>{deleteModal.description}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="ap-modal-actions">
              <button type="button" className="ap-btn-secondary" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button type="button" className="ap-btn-delete" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="ap-container">
        <header className="ap-header">
          <button className="menu-button" type="button" onClick={() => setMenuOpen(true)}>
            <span></span><span></span><span></span>
          </button>
          <div className="ap-header-title">
            <h1>A Pagar</h1>
          </div>
          <AccountMenu onLogout={handleLogout} />
        </header>

        {error && <div className="ap-error">{error}</div>}

        <div className="ap-toolbar">
          <span className="ap-toolbar-label">Contas a pagar</span>
          <div className="ap-toolbar-right">
            <button
              type="button"
              className={`ap-filter-btn${hasActiveFilter() ? " active" : ""}`}
              onClick={openFilterModal}
              aria-label="Filtrar"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v1.1a1.5 1.5 0 0 1-.44 1.06l-5.81 5.82V20a1 1 0 0 1-1.45.9l-4-2A1 1 0 0 1 9 18v-6.52L3.44 5.66A1.5 1.5 0 0 1 3 4.6V4.5Z" />
              </svg>
            </button>
            <button type="button" className="ap-add-btn" onClick={openCreate} aria-label="Nova conta">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
              </svg>
            </button>
          </div>
        </div>

        <section className="ap-panel">
          {payables.length === 0 ? (
            <div className="ap-empty">
              <strong>Nenhuma conta encontrada</strong>
              <p>Crie uma nova conta a pagar usando o botão acima.</p>
            </div>
          ) : (
            <div className="ap-list">
              {payables.map((p) => (
                <article className={`ap-card ap-card--${isOverdue(p) ? "atrasado" : p.status}`} key={p.id}>
                  <div className="ap-card-info">
                    <strong className="ap-description">{p.description}</strong>
                    <div className="ap-card-sub">
                      <span className={`ap-vencimento${isOverdue(p) ? " ap-vencimento--atrasado" : ""}`}>
                        Venc. {formatDate(p.due_date)}
                      </span>
                      {p.status === "pago" && p.bank_name && (
                        <>
                          <span className="ap-sep">·</span>
                          <span className="ap-bank-name">{p.bank_name}</span>
                        </>
                      )}
                      {p.recurrence && p.recurrence !== "none" && RECURRENCE_LABELS[p.recurrence] && (
                        <>
                          <span className="ap-sep">·</span>
                          <span className="ap-recurrence-badge">↻ {RECURRENCE_LABELS[p.recurrence]}</span>
                        </>
                      )}
                    </div>
                    <div className="ap-card-footer">
                      <span className={`ap-status-text ap-status-text--${isOverdue(p) ? "atrasado" : p.status}`}>
                        {isOverdue(p) ? "Atrasado" : statusLabel(p.status)}
                      </span>
                    </div>
                  </div>
                  <div className="ap-card-right">
                    <strong className="ap-amount">{BRL.format(p.amount)}</strong>
                    <div className="ap-card-actions">
                      {p.status === "pendente" && (
                        <>
                          <button type="button" className="ap-action-btn ap-action-btn--edit" onClick={() => openEdit(p)} aria-label="Editar">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                              <path d="M4.75 16.95 16.67 5.03a2.3 2.3 0 0 1 3.25 3.25L8 20.2a1.2 1.2 0 0 1-.55.31l-3.15.78a.75.75 0 0 1-.9-.9l.78-3.15c.05-.21.16-.4.31-.55Zm13-10.86L6.05 17.79l-.39 1.56 1.56-.39 11.7-11.7a.8.8 0 0 0-1.13-1.13Z" />
                            </svg>
                          </button>
                          <button type="button" className="ap-action-btn ap-action-btn--delete" onClick={() => setDeleteModal(p)} aria-label="Excluir">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                              <path d="M9 4.75A2.75 2.75 0 0 1 11.75 2h.5A2.75 2.75 0 0 1 15 4.75h3.25a.75.75 0 0 1 0 1.5H17.5l-.68 12.2A2.75 2.75 0 0 1 14.07 21H9.93a2.75 2.75 0 0 1-2.75-2.55L6.5 6.25h-.75a.75.75 0 0 1 0-1.5H9Zm1.5 0h3A1.25 1.25 0 0 0 12.25 3.5h-.5A1.25 1.25 0 0 0 10.5 4.75Zm-2.5 1.5.67 12.12c.04.64.57 1.13 1.21 1.13h4.24c.64 0 1.17-.49 1.21-1.13L16 6.25H8Z" />
                            </svg>
                          </button>
                          <button type="button" className="ap-action-btn" onClick={() => openBaixa(p)} aria-label="Dar baixa">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                              <rect x="2" y="6" width="20" height="13" rx="2" />
                              <circle cx="12" cy="12.5" r="2.5" />
                              <path d="M6 9.5v6M18 9.5v6" />
                            </svg>
                          </button>
                        </>
                      )}
                      {p.status === "pago" && (
                        <button type="button" className="ap-action-btn" onClick={() => openReopen(p)} aria-label="Reabrir">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <polyline points="10 10 4 14 10 18" />
                            <path d="M4 14h9a5 5 0 0 0 0-10H8" />
                          </svg>
                        </button>
                      )}
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

export default APagar;
