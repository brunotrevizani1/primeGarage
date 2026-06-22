import { useEffect, useState } from "react";
import MenuIcon from "../../components/MenuIcon";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./servicos.css";

function Servicos() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const [serviceForm, setServiceForm] = useState({
    category_id: "",
    name: "",
    description: "",
    price: "",
    duration_minutes: "",
  });

  const canManageSettings = hasPermission(
    "gerenciar_configuracoes",
    userPermissions,
  );

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canCreateService = hasPermission("criar_servico", userPermissions);
  const canEditService = hasPermission("editar_servico", userPermissions);
  const canDeleteService = hasPermission("excluir_servico", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

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

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatCurrencyInput(value) {
    const numbers = String(value).replace(/\D/g, "");

    if (!numbers) return "";

    const amount = Number(numbers) / 100;

    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function currencyToNumber(value) {
    const numbers = String(value).replace(/\D/g, "");

    if (!numbers) return 0;

    return Number(numbers) / 100;
  }

  function formatDurationInput(value) {
    const numbers = String(value).replace(/\D/g, "").slice(0, 4);

    if (!numbers) return "";

    if (numbers.length <= 2) {
      return `0:${numbers.padStart(2, "0")}`;
    }

    const minutes = numbers.slice(-2);
    const hours = numbers.slice(0, -2);

    return `${Number(hours)}:${minutes}`;
  }

  function durationToMinutes(value) {
    if (!value) return null;

    const [hours, minutes] = value.split(":");

    return Number(hours || 0) * 60 + Number(minutes || 0);
  }

  function minutesToDuration(value) {
    if (!value) return "";

    const hours = Math.floor(Number(value) / 60);
    const minutes = Number(value) % 60;

    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }

  function formatDurationPreview(value) {
    const totalMinutes = durationToMinutes(value);

    if (!totalMinutes) return "";

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;

    return `${minutes}min`;
  }

  function formatDurationDisplay(value) {
    if (!value) return "Não definida";

    const hours = Math.floor(Number(value) / 60);
    const minutes = Number(value) % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;

    return `${minutes} min`;
  }

  function updateServiceField(field, value) {
    setServiceForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
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

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();

      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";

      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const canAccessServices =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("ver_servicos");

      if (!canAccessServices) {
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const categoriesResponse = await apiRequest("/api/service-categories");
      const servicesResponse = await apiRequest("/api/services");

      setCategories(categoriesResponse.categories || []);
      setServices(servicesResponse.services || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateServiceModal() {
    if (!canCreateService) {
      setError("Você não possui permissão para criar serviços.");
      return;
    }

    setEditingService(null);

    setServiceForm({
      category_id: categories[0]?.id || "",
      name: "",
      description: "",
      price: "",
      duration_minutes: "",
    });

    setError("");
    setServiceModalOpen(true);
  }

  function openEditServiceModal(service) {
    if (!canEditService) {
      setError("Você não possui permissão para editar serviços.");
      return;
    }

    setEditingService(service);

    setServiceForm({
      category_id: service.category_id || "",
      name: service.name || "",
      description: service.description || "",
      price: formatCurrencyInput(
        String(Math.round(Number(service.price || 0) * 100)),
      ),
      duration_minutes: minutesToDuration(service.duration_minutes),
    });

    setError("");
    setServiceModalOpen(true);
  }

  function closeServiceModal() {
    setServiceModalOpen(false);
    setEditingService(null);
    setError("");
  }

  function validateServiceForm() {
    const missingFields = [];

    if (!serviceForm.category_id) missingFields.push("categoria");
    if (!serviceForm.name.trim()) missingFields.push("nome do serviço");
    if (!serviceForm.price) missingFields.push("preço");
    if (!serviceForm.duration_minutes) missingFields.push("duração média");

    if (missingFields.length === 0) return "";

    if (missingFields.length === 1) {
      return `Preencha o campo obrigatório: ${missingFields[0]}.`;
    }

    const lastField = missingFields.pop();

    return `Preencha os campos obrigatórios: ${missingFields.join(", ")} e ${lastField}.`;
  }

  async function saveService(event) {
    event.preventDefault();

    if (!editingService && !canCreateService) {
      setError("Você não possui permissão para criar serviços.");
      return;
    }

    if (editingService && !canEditService) {
      setError("Você não possui permissão para editar serviços.");
      return;
    }

    const validationMessage = validateServiceForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        category_id: Number(serviceForm.category_id),
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim(),
        price: currencyToNumber(serviceForm.price),
        duration_minutes: durationToMinutes(serviceForm.duration_minutes),
      };

      if (editingService) {
        await apiRequest(`/api/services/${editingService.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/services", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await loadData();
      closeServiceModal();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(serviceId) {
    if (!canDeleteService) {
      setError("Você não possui permissão para excluir serviços.");
      return;
    }

    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir este serviço?",
    );

    if (!confirmDelete) return;

    try {
      setError("");

      await apiRequest(`/api/services/${serviceId}/disable`, {
        method: "PATCH",
      });

      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }

  const filteredServices =
    selectedCategory === "todos"
      ? services
      : services.filter(
          (service) => String(service.category_id) === String(selectedCategory),
        );

  const selectedCategoryName =
    selectedCategory === "todos"
      ? "Todas as categorias"
      : categories.find(
          (category) => String(category.id) === String(selectedCategory),
        )?.name || "Categoria";

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <main className="services-page">
        <section className="services-loading">
          <div className="loading-circle"></div>
          <p>Carregando serviços...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="services-page">
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
                <button type="button">
                  <MenuIcon name="finance" />
                  <span>Financeiro</span>
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
                    className="menu-parent-button active"
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
                      <button className="active" type="button">
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

      {filterOpen && (
        <div
          className="service-modal-overlay"
          onClick={() => setFilterOpen(false)}
        >
          <section
            className="service-modal small"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <strong>Filtrar serviços</strong>
                <p>Escolha uma categoria para visualizar.</p>
              </div>

              <button type="button" onClick={() => setFilterOpen(false)}>
                ×
              </button>
            </div>

            <div className="filter-list">
              <button
                type="button"
                className={selectedCategory === "todos" ? "active" : ""}
                onClick={() => {
                  setSelectedCategory("todos");
                  setFilterOpen(false);
                }}
              >
                <div>
                  <strong>Todas as categorias</strong>
                  <span>{services.length} serviços</span>
                </div>
              </button>

              {categories.map((category) => {
                const totalServices = services.filter(
                  (service) =>
                    String(service.category_id) === String(category.id),
                ).length;

                return (
                  <button
                    type="button"
                    key={category.id}
                    className={
                      String(selectedCategory) === String(category.id)
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setFilterOpen(false);
                    }}
                  >
                    <div>
                      <strong>{category.name}</strong>
                      <span>{totalServices} serviços</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {serviceModalOpen && (
        <div className="service-modal-overlay" onClick={closeServiceModal}>
          <section
            className="service-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <strong>
                  {editingService ? "Editar serviço" : "Novo serviço"}
                </strong>
                <p>Configure categoria, nome, preço e duração.</p>
              </div>

              <button type="button" onClick={closeServiceModal}>
                ×
              </button>
            </div>

            {error && <div className="services-error">{error}</div>}

            <form className="service-form" onSubmit={saveService}>
              <div className="form-group">
                <label>Categoria</label>
                <select
                  value={serviceForm.category_id}
                  onChange={(event) =>
                    updateServiceField("category_id", event.target.value)
                  }
                >
                  <option value="">Selecione uma categoria</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Nome do serviço</label>
                <input
                  type="text"
                  placeholder="Ex: Lavagem completa"
                  value={serviceForm.name}
                  onChange={(event) =>
                    updateServiceField("name", event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  placeholder="Ex: Lavagem externa, aspiração interna e acabamento..."
                  value={serviceForm.description}
                  onChange={(event) =>
                    updateServiceField("description", event.target.value)
                  }
                ></textarea>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Preço</label>
                  <input
                    type="text"
                    placeholder="R$ 80,00"
                    value={serviceForm.price}
                    onChange={(event) =>
                      updateServiceField(
                        "price",
                        formatCurrencyInput(event.target.value),
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Duração média</label>

                  <div className="duration-input-wrapper">
                    <input
                      type="text"
                      placeholder="Ex: 0:30"
                      value={serviceForm.duration_minutes}
                      onChange={(event) =>
                        updateServiceField(
                          "duration_minutes",
                          formatDurationInput(event.target.value),
                        )
                      }
                    />

                    {formatDurationPreview(serviceForm.duration_minutes) && (
                      <span>
                        {formatDurationPreview(serviceForm.duration_minutes)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="save-service-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Salvando..."
                  : editingService
                    ? "Salvar alterações"
                    : "Criar serviço"}
              </button>
            </form>
          </section>
        </div>
      )}

      <section className="services-container">
        <header className="services-header">
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
            <h1>Serviços</h1>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={loadData}
            aria-label="Atualizar serviços"
          >
            ↻
          </button>
        </header>

        {error && !serviceModalOpen && (
          <div className="services-error">{error}</div>
        )}

        <section className="services-list-section">
          <div className="panel-header">
            <div>
              <small>{selectedCategoryName}</small>

              <div className="title-with-actions">
                <h2>{filteredServices.length} serviços</h2>

                <button
                  type="button"
                  className={`filter-icon-button ${
                    selectedCategory !== "todos" ? "active" : ""
                  }`}
                  onClick={() => setFilterOpen(true)}
                  aria-label="Filtrar serviços"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4.5 6.75A.75.75 0 0 1 5.25 6h13.5a.75.75 0 0 1 .53 1.28L14 12.56v4.69a.75.75 0 0 1-.36.64l-3 1.8A.75.75 0 0 1 9.5 19.05v-6.49L4.72 7.28a.75.75 0 0 1-.22-.53Zm2.44.75 3.86 4.26c.13.14.2.32.2.5v5.46l1.5-.9v-4.56c0-.2.08-.39.22-.53l4.22-4.23H6.94Z" />
                  </svg>
                </button>
              </div>
            </div>

            {canCreateService && (
              <button
                className="add-service-icon-button"
                type="button"
                onClick={openCreateServiceModal}
                aria-label="Adicionar serviço"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            )}
          </div>

          {filteredServices.length === 0 ? (
            <div className="empty-services">
              <strong>Nenhum serviço encontrado</strong>
              <p>Crie um serviço para começar a usar nos atendimentos.</p>
            </div>
          ) : (
            <div className="services-list">
              {filteredServices.map((service) => (
                <article className="service-card" key={service.id}>
                  <div className="service-card-top">
                    <div>
                      <span>{service.category_name || "Sem categoria"}</span>
                      <h3>{service.name}</h3>
                    </div>

                    {(canEditService || canDeleteService) && (
                      <div className="service-icon-actions">
                        {canEditService && (
                          <button
                            type="button"
                            className="icon-action edit-icon"
                            onClick={() => openEditServiceModal(service)}
                            aria-label="Editar serviço"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4.75 16.95 16.67 5.03a2.3 2.3 0 0 1 3.25 3.25L8 20.2a1.2 1.2 0 0 1-.55.31l-3.15.78a.75.75 0 0 1-.9-.9l.78-3.15c.05-.21.16-.4.31-.55Zm13-10.86L6.05 17.79l-.39 1.56 1.56-.39 11.7-11.7a.8.8 0 0 0-1.13-1.13Z" />
                            </svg>
                          </button>
                        )}

                        {canDeleteService && (
                          <button
                            type="button"
                            className="icon-action delete-icon"
                            onClick={() => deleteService(service.id)}
                            aria-label="Excluir serviço"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M9 4.75A2.75 2.75 0 0 1 11.75 2h.5A2.75 2.75 0 0 1 15 4.75h3.25a.75.75 0 0 1 0 1.5H17.5l-.68 12.2A2.75 2.75 0 0 1 14.07 21H9.93a2.75 2.75 0 0 1-2.75-2.55L6.5 6.25h-.75a.75.75 0 0 1 0-1.5H9Z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {service.description && (
                    <p className="service-description">{service.description}</p>
                  )}

                  <div className="service-info">
                    <div>
                      <small>Preço</small>
                      <strong>{formatMoney(service.price)}</strong>
                    </div>

                    <div>
                      <small>Duração</small>
                      <strong>
                        {formatDurationDisplay(service.duration_minutes)}
                      </strong>
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

export default Servicos;
