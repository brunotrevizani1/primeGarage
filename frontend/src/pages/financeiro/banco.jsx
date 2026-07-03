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
import "./banco.css";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const EMPTY_FORM = { name: "", balance: "" };

function Banco() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedBank, setSelectedBank] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [deleteModal, setDeleteModal] = useState(null);

  const [movModal, setMovModal] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingMov, setLoadingMov] = useState(false);

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

  async function load() {
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
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const res = await apiRequest("/api/banks");
      setBanks(res.banks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setSelectedBank(null);
    setModalMode("create");
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(bank) {
    setSelectedBank(bank);
    setModalMode("edit");
    setForm({ name: bank.name, balance: String(bank.balance) });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedBank(null);
    setFormError("");
  }

  async function saveBank(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Nome é obrigatório.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      if (modalMode === "edit" && selectedBank) {
        await apiRequest(`/api/banks/${selectedBank.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: form.name.trim(), balance: form.balance }),
        });
      } else {
        await apiRequest("/api/banks", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            initial_balance: form.balance !== "" ? Number(form.balance) : 0,
          }),
        });
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    try {
      setDeleting(true);
      await apiRequest(`/api/banks/${deleteModal.id}`, { method: "DELETE" });
      setDeleteModal(null);
      load();
    } catch (err) {
      setError(err.message);
      setDeleteModal(null);
    } finally {
      setDeleting(false);
    }
  }

  async function openMovements(bank) {
    setMovModal(bank);
    setMovements([]);
    setLoadingMov(true);
    try {
      const res = await apiRequest(`/api/banks/${bank.id}/movements`);
      setMovements(res.movements || []);
    } catch {
      setMovements([]);
    } finally {
      setLoadingMov(false);
    }
  }

  function formatMovDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function balanceClass(balance) {
    if (balance > 0) return "banco-balance--positive";
    if (balance < 0) return "banco-balance--negative";
    return "banco-balance--zero";
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main className="banco-page">
        <section className="banco-loading">
          <div className="banco-loading-circle"></div>
          <p>Carregando...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="banco-page">
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
                    className="menu-parent-button active"
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
                        className="active"
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

      {movModal && (
        <div className="banco-modal-overlay" onClick={() => setMovModal(null)}>
          <section className="banco-mov-modal" onClick={(e) => e.stopPropagation()}>
            <div className="banco-modal-header">
              <strong>Movimentações — {movModal.name}</strong>
              <button type="button" onClick={() => setMovModal(null)}>×</button>
            </div>
            <div className="banco-mov-balance">
              <span>Saldo atual</span>
              <strong className={balanceClass(movModal.balance)}>{BRL.format(movModal.balance)}</strong>
            </div>
            {loadingMov ? (
              <div className="banco-mov-loading">
                <div className="banco-loading-circle"></div>
              </div>
            ) : movements.length === 0 ? (
              <div className="banco-mov-empty">Nenhuma movimentação registrada.</div>
            ) : (
              <div className="banco-mov-list">
                {movements.map((m, i) => (
                  <div className="banco-mov-row" key={i}>
                    <div className={`banco-mov-icon banco-mov-icon--${m.type}`}>
                      {m.type === "entrada" ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M12 3.75a.75.75 0 0 1 .75.75v13.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V4.5a.75.75 0 0 1 .75-.75Z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M12 20.25a.75.75 0 0 1-.75-.75V6.31L7.97 9.53a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 1 1-1.06 1.06L12.75 6.31V19.5a.75.75 0 0 1-.75.75Z" />
                        </svg>
                      )}
                    </div>
                    <div className="banco-mov-info">
                      <span className="banco-mov-desc">{m.description}</span>
                      <span className="banco-mov-date">{formatMovDate(m.date)}</span>
                    </div>
                    <strong className={`banco-mov-amount banco-mov-amount--${m.type}`}>
                      {m.type === "entrada" ? "+" : "-"}{BRL.format(m.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {modalOpen && (
        <div className="banco-modal-overlay" onClick={closeModal}>
          <section className="banco-modal" onClick={(e) => e.stopPropagation()}>
            <div className="banco-modal-header">
              <strong>
                {modalMode === "edit" ? "Editar banco" : "Novo banco"}
              </strong>
              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>
            {formError && <div className="banco-error">{formError}</div>}
            <form onSubmit={saveBank}>
              <div className="banco-form-group">
                <label>Nome</label>
                <input
                  type="text"
                  placeholder="Ex: Caixa, Nubank, Inter..."
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="banco-form-group">
                <label>{modalMode === "create" ? "Saldo inicial (opcional)" : "Saldo atual"}</label>
                <input
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, balance: e.target.value }))
                  }
                />
              </div>
              <div className="banco-modal-actions">
                <button
                  type="button"
                  className="banco-btn-secondary"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="banco-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Salvando..."
                    : modalMode === "edit"
                      ? "Salvar"
                      : "Criar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteModal && (
        <div
          className="banco-modal-overlay"
          onClick={() => setDeleteModal(null)}
        >
          <section className="banco-modal" onClick={(e) => e.stopPropagation()}>
            <div className="banco-modal-header">
              <strong>Excluir banco</strong>
              <button type="button" onClick={() => setDeleteModal(null)}>
                ×
              </button>
            </div>
            <p className="banco-delete-text">
              Deseja excluir o banco <strong>{deleteModal.name}</strong>? Isso
              só é possível se nenhuma forma de pagamento ou conta a pagar
              estiver vinculada a ele.
            </p>
            <div className="banco-modal-actions">
              <button
                type="button"
                className="banco-btn-secondary"
                onClick={() => setDeleteModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="banco-btn-delete"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="banco-container">
        <header className="banco-header">
          <button
            className="menu-button"
            type="button"
            onClick={() => setMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1>Banco</h1>
          <AccountMenu onLogout={handleLogout} />
        </header>

        {error && <div className="banco-error">{error}</div>}

        <section className="banco-panel">
          <div className="banco-panel-header">
            <h2>Contas cadastradas</h2>
            <button
              type="button"
              className="banco-add-btn"
              onClick={openCreate}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
              </svg>
              Novo banco
            </button>
          </div>

          {banks.length === 0 ? (
            <div className="banco-empty">
              <strong>Nenhum banco cadastrado</strong>
              <p>
                Adicione bancos para controlar o saldo das formas de pagamento.
              </p>
            </div>
          ) : (
            <div className="banco-list">
              {banks.map((b) => (
                <article className="banco-card" key={b.id}>
                  <div className="banco-card-left">
                    <div className="banco-card-name">{b.name}</div>
                  </div>
                  <strong
                    className={`banco-balance ${balanceClass(b.balance)}`}
                  >
                    {BRL.format(b.balance)}
                  </strong>
                  <div className="banco-card-actions">
                    <button
                      type="button"
                      className="banco-icon-btn"
                      onClick={() => openMovements(b)}
                      aria-label="Movimentações"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                        <path d="M3.75 3a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75ZM3.75 7.5a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75ZM3 12.75a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75ZM3.75 16.5a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9ZM18 12a.75.75 0 0 1 .75.75v2.19l.72-.72a.75.75 0 1 1 1.06 1.06l-2 2a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l.72.72V12.75A.75.75 0 0 1 18 12Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="banco-icon-btn"
                      onClick={() => openEdit(b)}
                      aria-label="Editar"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M4.75 16.95 16.67 5.03a2.3 2.3 0 0 1 3.25 3.25L8 20.2a1.2 1.2 0 0 1-.55.31l-3.15.78a.75.75 0 0 1-.9-.9l.78-3.15c.05-.21.16-.4.31-.55Zm13-10.86L6.05 17.79l-.39 1.56 1.56-.39 11.7-11.7a.8.8 0 0 0-1.13-1.13Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="banco-icon-btn banco-icon-btn--delete"
                      onClick={() => setDeleteModal(b)}
                      aria-label="Excluir"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9 4.75A2.75 2.75 0 0 1 11.75 2h.5A2.75 2.75 0 0 1 15 4.75h3.25a.75.75 0 0 1 0 1.5H17.5l-.68 12.2A2.75 2.75 0 0 1 14.07 21H9.93a2.75 2.75 0 0 1-2.75-2.55L6.5 6.25h-.75a.75.75 0 0 1 0-1.5H9Zm1.5 0h3A1.25 1.25 0 0 0 12.25 3.5h-.5A1.25 1.25 0 0 0 10.5 4.75Zm-2.5 1.5.67 12.12c.04.64.57 1.13 1.21 1.13h4.24c.64 0 1.17-.49 1.21-1.13L16 6.25H8Z" />
                      </svg>
                    </button>
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

export default Banco;
