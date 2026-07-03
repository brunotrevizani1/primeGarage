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
import "./clientes.css";

function Clientes() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const [error, setError] = useState("");

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    name: "",
    phone: "",
    plate: "",
    model: "",
    color: "",
  });

  const [temporaryFilters, setTemporaryFilters] = useState({
    name: "",
    phone: "",
    plate: "",
    model: "",
    color: "",
  });

  const [customerForm, setCustomerForm] = useState({
    customerName: "",
    customerPhone: "",
    vehiclePlate: "",
    vehicleModel: "",
    vehicleColor: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);
  const canEditCustomers = hasPermission("editar_cliente", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canManageSettings = hasPermission(
    "gerenciar_configuracoes",
    userPermissions,
  );

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  function hasActiveFilter(filterValues = filters) {
    return Object.values(filterValues).some((value) => value.trim());
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

    if (permissions.includes("ver_cliente")) {
      return "/clientes";
    }

    if (permissions.includes("ver_equipe")) {
      return "/equipe";
    }

    if (permissions.includes("ver_agenda")) {
      return "/agenda?tab=hours";
    }

    if (permissions.includes("ver_servicos")) {
      return "/servicos";
    }

    return "/";
  }

  function onlyNumbers(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatPhone(value) {
    const numbers = onlyNumbers(value).slice(0, 11);

    if (numbers.length <= 2) {
      return numbers;
    }

    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }

    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }

    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }

  function formatPlate(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);
  }

  function capitalizeWords(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  const NAME_LOWERCASE = new Set([
    "da",
    "de",
    "di",
    "do",
    "du",
    "das",
    "dos",
    "e",
    "ou",
    "a",
    "o",
  ]);

  function capitalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .split(" ")
      .map((word, index) => {
        if (!word) return word;
        if (index > 0 && NAME_LOWERCASE.has(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function updateCustomerField(field, value) {
    setCustomerForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateTemporaryFilter(field, value) {
    setTemporaryFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function resetCustomerForm() {
    setCustomerForm({
      customerName: "",
      customerPhone: "",
      vehiclePlate: "",
      vehicleModel: "",
      vehicleColor: "",
    });
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

  async function loadCustomers(customPage = page, customFilters = filters) {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();

      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";

      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const canAccessCustomers =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("ver_cliente");

      if (!canAccessCustomers) {
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const params = new URLSearchParams();

      params.append("page", customPage);
      params.append("limit", 10);

      Object.entries(customFilters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await apiRequest(`/api/customers?${params.toString()}`);

      setCustomers(response.customers || []);
      setPagination(
        response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function openFilterModal() {
    setTemporaryFilters(filters);
    setFilterModalOpen(true);
  }

  function applyFilter(event) {
    event.preventDefault();

    const cleanedFilters = {
      name: temporaryFilters.name.trim(),
      phone: temporaryFilters.phone.trim(),
      plate: formatPlate(temporaryFilters.plate),
      model: temporaryFilters.model.trim(),
      color: temporaryFilters.color.trim(),
    };

    setFilters(cleanedFilters);
    setPage(1);
    setFilterModalOpen(false);
    loadCustomers(1, cleanedFilters);
  }

  function clearFilter() {
    const emptyFilters = {
      name: "",
      phone: "",
      plate: "",
      model: "",
      color: "",
    };

    setTemporaryFilters(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
    setFilterModalOpen(false);
    loadCustomers(1, emptyFilters);
  }

  function openViewModal(customer) {
    setSelectedCustomer(customer);
    setViewModalOpen(true);
  }

  function closeViewModal() {
    setSelectedCustomer(null);
    setViewModalOpen(false);
  }

  function openCreateCustomerModal() {
    if (!canEditCustomers) {
      setError("Você não possui permissão para cadastrar clientes.");
      return;
    }

    setSelectedCustomer(null);
    resetCustomerForm();
    setError("");
    setCustomerModalOpen(true);
  }

  function openEditCustomerModal(customer) {
    if (!canEditCustomers) {
      setError("Você não possui permissão para editar clientes.");
      return;
    }

    setSelectedCustomer(customer);
    setError("");

    setCustomerForm({
      customerName: customer.customer_name || "",
      customerPhone: formatPhone(customer.customer_phone || ""),
      vehiclePlate: customer.vehicle_plate || "",
      vehicleModel: customer.vehicle_model || "",
      vehicleColor: customer.vehicle_color || "",
    });

    setCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setSelectedCustomer(null);
    setCustomerModalOpen(false);
    setError("");
    resetCustomerForm();
  }

  async function saveCustomer(event) {
    event.preventDefault();

    if (!canEditCustomers) {
      setError("Você não possui permissão para salvar clientes.");
      return;
    }

    if (
      !customerForm.customerName.trim() ||
      !customerForm.customerPhone.trim() ||
      !customerForm.vehiclePlate.trim() ||
      !customerForm.vehicleModel.trim() ||
      !customerForm.vehicleColor.trim()
    ) {
      setError("Preencha nome, telefone, placa, modelo e cor.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        customerName: customerForm.customerName.trim(),
        customerPhone: onlyNumbers(customerForm.customerPhone),
        vehiclePlate: formatPlate(customerForm.vehiclePlate),
        vehicleModel: customerForm.vehicleModel.trim(),
        vehicleColor: customerForm.vehicleColor.trim(),
      };

      if (selectedCustomer) {
        await apiRequest(`/api/customers/${selectedCustomer.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/customers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeCustomerModal();
      await loadCustomers(page, filters);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer() {
    if (!selectedCustomer || !canEditCustomers) {
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir "${selectedCustomer.customer_name}"?`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await apiRequest(`/api/customers/${selectedCustomer.id}`, {
        method: "DELETE",
      });

      closeCustomerModal();
      await loadCustomers(page, filters);
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  function previousPage() {
    if (!pagination.hasPreviousPage) {
      return;
    }

    const newPage = page - 1;
    setPage(newPage);
    loadCustomers(newPage, filters);
  }

  function nextPage() {
    if (!pagination.hasNextPage) {
      return;
    }

    const newPage = page + 1;
    setPage(newPage);
    loadCustomers(newPage, filters);
  }

  useEffect(() => {
    loadCustomers(1, filters);
  }, []);

  if (loading) {
    return (
      <main className="customers-page">
        <section className="customers-loading">
          <div className="loading-circle"></div>
          <p>Carregando clientes...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="customers-page">
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
                <button className="active" type="button">
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

      {filterModalOpen && (
        <div
          className="customer-modal-overlay"
          onClick={() => setFilterModalOpen(false)}
        >
          <section
            className="customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-modal-header">
              <div>
                <strong>Filtrar clientes</strong>
                <p>Preencha apenas os campos que deseja usar na busca.</p>
              </div>

              <button type="button" onClick={() => setFilterModalOpen(false)}>
                ×
              </button>
            </div>

            <form className="customer-form" onSubmit={applyFilter}>
              <div className="customer-form-grid">
                <div className="form-group">
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Ex: João"
                    value={temporaryFilters.name}
                    onChange={(event) =>
                      updateTemporaryFilter("name", event.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    placeholder="(51) 99999-9999"
                    value={temporaryFilters.phone}
                    onChange={(event) =>
                      updateTemporaryFilter(
                        "phone",
                        formatPhone(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Placa</label>
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    value={temporaryFilters.plate}
                    onChange={(event) =>
                      updateTemporaryFilter(
                        "plate",
                        formatPlate(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Onix"
                    value={temporaryFilters.model}
                    onChange={(event) =>
                      updateTemporaryFilter(
                        "model",
                        capitalizeWords(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group full-field">
                  <label>Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Preto"
                    value={temporaryFilters.color}
                    onChange={(event) =>
                      updateTemporaryFilter(
                        "color",
                        capitalizeWords(event.target.value),
                      )
                    }
                  />
                </div>
              </div>

              <div className="customer-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={clearFilter}
                >
                  Limpar
                </button>

                <button type="submit" className="primary-button">
                  Aplicar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {viewModalOpen && selectedCustomer && (
        <div className="customer-modal-overlay" onClick={closeViewModal}>
          <section
            className="customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-modal-header">
              <div>
                <strong>Dados do cliente</strong>
                <p>Informações cadastradas para este veículo.</p>
              </div>

              <button type="button" onClick={closeViewModal}>
                ×
              </button>
            </div>

            <div className="customer-details-grid">
              <div className="full-field">
                <span>Nome</span>
                <strong>{selectedCustomer.customer_name || "-"}</strong>
              </div>

              <div>
                <span>Telefone</span>
                <strong>{formatPhone(selectedCustomer.customer_phone)}</strong>
              </div>

              <div>
                <span>Placa</span>
                <strong>{selectedCustomer.vehicle_plate || "-"}</strong>
              </div>

              <div>
                <span>Modelo</span>
                <strong>{selectedCustomer.vehicle_model || "-"}</strong>
              </div>

              <div>
                <span>Cor</span>
                <strong>{selectedCustomer.vehicle_color || "-"}</strong>
              </div>
            </div>
          </section>
        </div>
      )}

      {customerModalOpen && (
        <div className="customer-modal-overlay" onClick={closeCustomerModal}>
          <section
            className="customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-modal-header compact">
              <strong>
                {selectedCustomer ? "Editar cliente" : "Novo cliente"}
              </strong>

              <button type="button" onClick={closeCustomerModal}>
                ×
              </button>
            </div>

            {error && <div className="customers-error">{error}</div>}

            <form className="customer-form" onSubmit={saveCustomer}>
              <div className="customer-form-grid">
                <div className="form-group full-field">
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={customerForm.customerName}
                    onChange={(event) =>
                      updateCustomerField(
                        "customerName",
                        capitalizeName(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    placeholder="(51) 99999-9999"
                    value={customerForm.customerPhone}
                    onChange={(event) =>
                      updateCustomerField(
                        "customerPhone",
                        formatPhone(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Placa</label>
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    value={customerForm.vehiclePlate}
                    onChange={(event) =>
                      updateCustomerField(
                        "vehiclePlate",
                        formatPlate(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Onix"
                    value={customerForm.vehicleModel}
                    onChange={(event) =>
                      updateCustomerField(
                        "vehicleModel",
                        capitalizeWords(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Preto"
                    value={customerForm.vehicleColor}
                    onChange={(event) =>
                      updateCustomerField(
                        "vehicleColor",
                        capitalizeWords(event.target.value),
                      )
                    }
                  />
                </div>
              </div>

              <button
                className="save-customer-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Salvando..."
                  : selectedCustomer
                    ? "Salvar alterações"
                    : "Cadastrar cliente"}
              </button>

              {selectedCustomer && (
                <button
                  className="delete-customer-danger-button"
                  type="button"
                  onClick={deleteCustomer}
                  disabled={deleting}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 4.75A2.75 2.75 0 0 1 11.75 2h.5A2.75 2.75 0 0 1 15 4.75h3.25a.75.75 0 0 1 0 1.5H17.5l-.68 12.2A2.75 2.75 0 0 1 14.07 21H9.93a2.75 2.75 0 0 1-2.75-2.55L6.5 6.25h-.75a.75.75 0 0 1 0-1.5H9Zm1.5 0h3A1.25 1.25 0 0 0 12.25 3.5h-.5A1.25 1.25 0 0 0 10.5 4.75Zm-2.5 1.5.67 12.12c.04.64.57 1.13 1.21 1.13h4.24c.64 0 1.17-.49 1.21-1.13L16 6.25H8Z" />
                  </svg>

                  <span>{deleting ? "Excluindo..." : "Excluir cliente"}</span>
                </button>
              )}
            </form>
          </section>
        </div>
      )}

      <section className="customers-container">
        <header className="customers-header">
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
            <h1>Clientes</h1>
          </div>

          <AccountMenu onLogout={handleLogout} />
        </header>

        {error && !customerModalOpen && (
          <div className="customers-error">{error}</div>
        )}

        <section className="customers-panel">
          <div className="customers-panel-header">
            <div className="customers-title-row">
              <h2>
                Clientes
                <span>cadastrados</span>
              </h2>

              <button
                className={
                  hasActiveFilter()
                    ? "filter-icon-button active"
                    : "filter-icon-button"
                }
                type="button"
                onClick={openFilterModal}
                aria-label="Filtrar clientes"
              >
                <MenuIcon name="filter" />
              </button>
            </div>

            {canEditCustomers && (
              <button
                className="add-customer-button"
                type="button"
                onClick={openCreateCustomerModal}
                aria-label="Cadastrar cliente"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            )}
          </div>

          {customers.length === 0 ? (
            <div className="empty-customers">
              <strong>Nenhum cliente encontrado</strong>
              <p>Cadastre clientes ou crie atendimentos para listar aqui.</p>
            </div>
          ) : (
            <div className="customers-list">
              {customers.map((customer) => (
                <article className="customer-card" key={customer.id}>
                  <div className="customer-main-info">
                    <h3>{customer.customer_name || "Cliente sem nome"}</h3>
                    <p>{formatPhone(customer.customer_phone)}</p>
                  </div>

                  <div className="customer-actions">
                    <button
                      type="button"
                      className="view-customer-button"
                      onClick={() => openViewModal(customer)}
                      aria-label="Visualizar cliente"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5.25c6.2 0 9.5 6.75 9.5 6.75s-3.3 6.75-9.5 6.75S2.5 12 2.5 12s3.3-6.75 9.5-6.75Zm0 2C8.02 7.25 5.44 10.78 4.74 12c.7 1.22 3.28 4.75 7.26 4.75s6.56-3.53 7.26-4.75c-.7-1.22-3.28-4.75-7.26-4.75Zm0 1.75a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
                      </svg>
                    </button>

                    {canEditCustomers && (
                      <button
                        type="button"
                        className="edit-customer-button"
                        onClick={() => openEditCustomerModal(customer)}
                        aria-label="Editar cliente"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4.75 16.95 16.67 5.03a2.3 2.3 0 0 1 3.25 3.25L8 20.2a1.2 1.2 0 0 1-.55.31l-3.15.78a.75.75 0 0 1-.9-.9l.78-3.15c.05-.21.16-.4.31-.55Zm13-10.86L6.05 17.79l-.39 1.56 1.56-.39 11.7-11.7a.8.8 0 0 0-1.13-1.13Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="customers-pagination">
            <button
              type="button"
              onClick={previousPage}
              disabled={!pagination.hasPreviousPage}
              aria-label="Página anterior"
            >
              ‹
            </button>

            <span>
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={nextPage}
              disabled={!pagination.hasNextPage}
              aria-label="Próxima página"
            >
              ›
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Clientes;
