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
import "./configuracoes.css";

function getInitialSettingsTab() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");

  return tab === "location" ? "location" : "initial";
}

function Configuracoes() {
  const [form, setForm] = useState({
    customerPageName: "",
    customerPagePhrase: "",
    customerPageLogoUrl: "",

    addressStreet: "",
    addressNumber: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [error, setError] = useState("");

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const [settingsMenuOpen, setSettingsMenuOpen] = useState(true);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState(
    getInitialSettingsTab(),
  );

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);
  const canManageSettings = hasPermission(
    "gerenciar_configuracoes",
    userPermissions,
  );

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  function handleLogoFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido.");
      return;
    }

    const maxSizeInMb = 2;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setError(`A imagem deve ter no máximo ${maxSizeInMb}MB.`);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateField("customerPageLogoUrl", reader.result);
      setError("");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  }

  function removeLogo() {
    updateField("customerPageLogoUrl", "");
  }

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function changeSettingsTab(tab) {
    setActiveSettingsTab(tab);
    setMenuOpen(false);
    window.history.replaceState(null, "", `/configuracoes?tab=${tab}`);
  }

  function getFirstAllowedPath(permissions, role) {
    if (role === "owner" || role === "super_admin") return "/dashboard";
    if (permissions.includes("ver_dashboard")) return "/dashboard";
    if (permissions.includes("ver_fila")) return "/atendimentos";
    if (permissions.includes("ver_agenda")) return "/agenda?tab=hours";
    if (permissions.includes("ver_servicos")) return "/servicos";
    if (permissions.includes("ver_equipe")) return "/equipe";

    return "/";
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

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();

      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";

      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const canAccessSettings =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("gerenciar_configuracoes");

      if (!canAccessSettings) {
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const response = await apiRequest("/api/settings/customer-page");

      setForm({
        customerPageName: response.settings?.customerPageName || "",
        customerPagePhrase: response.settings?.customerPagePhrase || "",
        customerPageLogoUrl: response.settings?.customerPageLogoUrl || "",

        addressStreet: response.settings?.addressStreet || "",
        addressNumber: response.settings?.addressNumber || "",
        addressNeighborhood: response.settings?.addressNeighborhood || "",
        addressCity: response.settings?.addressCity || "",
        addressState: response.settings?.addressState || "",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();

    if (!form.customerPageName.trim()) {
      setError("Informe o nome que aparecerá para o cliente.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await apiRequest("/api/settings/customer-page", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      await loadSettings();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <main className="settings-page">
        <section className="settings-loading">
          <div className="loading-circle"></div>
          <p>Carregando configurações...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="settings-page">
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
                    className="menu-parent-button active"
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
                        className={
                          activeSettingsTab === "initial" ? "active" : ""
                        }
                        onClick={() => changeSettingsTab("initial")}
                      >
                        <MenuIcon name="info" />
                        <span>Informações iniciais</span>
                      </button>

                      <button
                        type="button"
                        className={
                          activeSettingsTab === "location" ? "active" : ""
                        }
                        onClick={() => changeSettingsTab("location")}
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

      <section className="settings-container">
        <header className="settings-header">
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
            <h1>Configurações</h1>
          </div>

          <AccountMenu onLogout={handleLogout} />
        </header>

        {error && <div className="settings-error">{error}</div>}

        {activeSettingsTab === "initial" && (
          <>
            <form className="settings-card" onSubmit={saveSettings}>
              <div className="section-heading">
                <h2>Tela do cliente</h2>
                <p>Essas informações aparecerão na página do cliente.</p>
              </div>

              <div className="form-group">
                <label>Nome exibido</label>
                <input
                  type="text"
                  placeholder="Ex: PrimeGarage Lava Jato"
                  value={form.customerPageName}
                  onChange={(event) =>
                    updateField("customerPageName", event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Frase inicial</label>
                <textarea
                  placeholder="Ex: Agende sua lavagem de forma rápida e prática."
                  value={form.customerPagePhrase}
                  onChange={(event) =>
                    updateField("customerPagePhrase", event.target.value)
                  }
                ></textarea>
              </div>

              <div className="form-group">
                <label>Logo</label>

                <div className="logo-picker-wrapper">
                  <label className="logo-picker">
                    {form.customerPageLogoUrl ? (
                      <img
                        src={form.customerPageLogoUrl}
                        alt="Logo do lava-jato"
                      />
                    ) : (
                      <div className="logo-picker-placeholder">
                        <strong>
                          {form.customerPageName?.slice(0, 1) || "P"}
                        </strong>
                        <span>Adicionar logo</span>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                    />
                  </label>

                  <p>Clique na imagem para escolher ou trocar a logo.</p>

                  {form.customerPageLogoUrl && (
                    <button
                      type="button"
                      className="remove-logo-button"
                      onClick={removeLogo}
                    >
                      Remover logo
                    </button>
                  )}
                </div>
              </div>

              <button
                className="save-settings-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar configurações"}
              </button>
            </form>
          </>
        )}

        {activeSettingsTab === "location" && (
          <form className="settings-card" onSubmit={saveSettings}>
            <div className="section-heading">
              <h2>Localização</h2>
              <p>Informe o endereço que aparecerá para o cliente.</p>
            </div>

            <div className="form-group">
              <label>Rua</label>
              <input
                type="text"
                placeholder="Ex: Rua das Flores"
                value={form.addressStreet}
                onChange={(event) =>
                  updateField("addressStreet", event.target.value)
                }
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Número</label>
                <input
                  type="text"
                  placeholder="Ex: 123"
                  value={form.addressNumber}
                  onChange={(event) =>
                    updateField("addressNumber", event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Bairro</label>
                <input
                  type="text"
                  placeholder="Ex: Centro"
                  value={form.addressNeighborhood}
                  onChange={(event) =>
                    updateField("addressNeighborhood", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: Campo Bom"
                  value={form.addressCity}
                  onChange={(event) =>
                    updateField("addressCity", event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Estado</label>
                <input
                  type="text"
                  placeholder="Ex: RS"
                  value={form.addressState}
                  onChange={(event) =>
                    updateField("addressState", event.target.value)
                  }
                />
              </div>
            </div>

            <button
              className="save-settings-button"
              type="submit"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default Configuracoes;
