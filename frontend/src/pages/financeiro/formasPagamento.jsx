import { useEffect, useState } from "react";
import MenuIcon from "../../components/MenuIcon";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./formasPagamento.css";

function FormasPagamento() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [banks, setBanks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [form, setForm] = useState({ name: "", bank_id: "", is_active: true });
  const [formError, setFormError] = useState("");

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

      const [res, banksRes] = await Promise.all([
        apiRequest("/api/finance/payment-methods"),
        apiRequest("/api/banks"),
      ]);
      setMethods(res.methods || []);
      setBanks((banksRes.banks || []).filter((b) => b.is_active));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setSelectedMethod(null);
    setForm({ name: "", bank_id: "", is_active: true });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(method) {
    setSelectedMethod(method);
    setForm({ name: method.name, bank_id: method.bank_id ? String(method.bank_id) : "", is_active: Boolean(method.is_active) });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedMethod(null);
    setFormError("");
  }

  async function saveMethod(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Nome é obrigatório.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      if (selectedMethod) {
        await apiRequest(`/api/finance/payment-methods/${selectedMethod.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: form.name.trim(),
            bank_id: form.bank_id ? Number(form.bank_id) : null,
            is_active: form.is_active,
          }),
        });
      } else {
        await apiRequest("/api/finance/payment-methods", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            bank_id: form.bank_id ? Number(form.bank_id) : null,
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

  async function deleteMethod(method) {
    const confirmed = window.confirm(`Excluir "${method.name}"?`);
    if (!confirmed) return;
    try {
      setDeleting(true);
      await apiRequest(`/api/finance/payment-methods/${method.id}`, {
        method: "DELETE",
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main className="fp-page">
        <section className="fp-loading">
          <div className="fp-loading-circle"></div>
          <p>Carregando...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="fp-page">
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
                        className="active"
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

      {modalOpen && (
        <div className="fp-modal-overlay" onClick={closeModal}>
          <section className="fp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fp-modal-header">
              <strong>
                {selectedMethod
                  ? "Editar forma de pagamento"
                  : "Nova forma de pagamento"}
              </strong>
              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            {formError && <div className="fp-error">{formError}</div>}

            <form className="fp-form" onSubmit={saveMethod}>
              <div className="fp-form-group">
                <label>Nome</label>
                <input
                  type="text"
                  placeholder="Ex: Pix, Dinheiro, Cartão..."
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div className="fp-form-group">
                <label>Banco vinculado (opcional)</label>
                <select
                  value={form.bank_id}
                  onChange={(e) => setForm((f) => ({ ...f, bank_id: e.target.value }))}
                >
                  <option value="">Nenhum</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {selectedMethod && (
                <label className="fp-toggle-label">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                  />
                  <span>Ativo</span>
                </label>
              )}

              <div className="fp-modal-actions">
                <button
                  type="button"
                  className="fp-btn-secondary"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="fp-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : selectedMethod ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="fp-container">
        <header className="fp-header">
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
            <h1>Formas de Pagamento</h1>
          </div>
          <button
            className="refresh-button"
            type="button"
            onClick={load}
            aria-label="Atualizar"
          >
            ↻
          </button>
        </header>

        {error && <div className="fp-error">{error}</div>}

        <section className="fp-panel">
          <div className="fp-panel-header">
            <h2>Formas cadastradas</h2>
            <button
              type="button"
              className="fp-add-btn"
              onClick={openCreate}
              aria-label="Adicionar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
              </svg>
            </button>
          </div>

          {methods.length === 0 ? (
            <div className="fp-empty">
              <strong>Nenhuma forma cadastrada</strong>
              <p>
                Adicione formas de pagamento para usar na baixa dos recebíveis.
              </p>
            </div>
          ) : (
            <div className="fp-list">
              {methods.map((m) => (
                <article className="fp-item" key={m.id}>
                  <div className="fp-item-info">
                    <strong>{m.name}</strong>
                  </div>
                  <div className="fp-item-actions">
                    <button
                      type="button"
                      className="fp-edit-btn"
                      onClick={() => openEdit(m)}
                      aria-label="Editar"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4.75 16.95 16.67 5.03a2.3 2.3 0 0 1 3.25 3.25L8 20.2a1.2 1.2 0 0 1-.55.31l-3.15.78a.75.75 0 0 1-.9-.9l.78-3.15c.05-.21.16-.4.31-.55Zm13-10.86L6.05 17.79l-.39 1.56 1.56-.39 11.7-11.7a.8.8 0 0 0-1.13-1.13Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="fp-delete-btn"
                      onClick={() => deleteMethod(m)}
                      disabled={deleting}
                      aria-label="Excluir"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
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

export default FormasPagamento;
