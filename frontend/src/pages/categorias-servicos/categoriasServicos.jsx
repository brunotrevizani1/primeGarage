import { useEffect, useState } from "react";
import MenuIcon from "../../components/MenuIcon";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./categoriasServicos.css";

function CategoriasServicos() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [saving, setSavinStateg] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canCreateCategory = hasPermission("criar_categoria", userPermissions);
  const canEditCategory = hasPermission("editar_categoria", userPermissions);
  const canDeleteCategory = hasPermission("excluir_categoria", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);

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

    if (permissions.includes("ver_categorias")) {
      return "/categorias-servicos";
    }

    if (permissions.includes("ver_equipe")) {
      return "/equipe";
    }

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

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();

      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";

      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const canAccessCategories =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("ver_categorias");

      if (!canAccessCategories) {
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

  function openCreateCategoryModal() {
    if (!canCreateCategory) {
      setError("Você não possui permissão para criar categorias.");
      return;
    }

    setEditingCategory(null);
    setCategoryName("");
    setError("");
    setCategoryModalOpen(true);
  }

  function openEditCategoryModal(category) {
    if (!canEditCategory) {
      setError("Você não possui permissão para editar categorias.");
      return;
    }

    setEditingCategory(category);
    setCategoryName(category.name);
    setError("");
    setCategoryModalOpen(true);
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryName("");
    setError("");
  }

  async function saveCategory(event) {
    event.preventDefault();

    if (!editingCategory && !canCreateCategory) {
      setError("Você não possui permissão para criar categorias.");
      return;
    }

    if (editingCategory && !canEditCategory) {
      setError("Você não possui permissão para editar categorias.");
      return;
    }

    if (!categoryName.trim()) {
      setError("Preencha o nome da categoria.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingCategory) {
        await apiRequest(`/api/service-categories/${editingCategory.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: categoryName.trim(),
            status: "active",
          }),
        });
      } else {
        await apiRequest("/api/service-categories", {
          method: "POST",
          body: JSON.stringify({
            name: categoryName.trim(),
          }),
        });
      }

      closeCategoryModal();
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category) {
    if (!canDeleteCategory) {
      setError("Você não possui permissão para excluir categorias.");
      return;
    }
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a categoria "${category.name}"? Os serviços dela também vão sair da tela.`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setError("");

      await apiRequest(`/api/service-categories/${category.id}/disable`, {
        method: "PATCH",
      });

      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }

  function getTotalServices(categoryId) {
    return services.filter(
      (service) => String(service.category_id) === String(categoryId),
    ).length;
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <main className="categories-page">
        <section className="categories-loading">
          <div className="loading-circle"></div>
          <p>Carregando categorias...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="categories-page">
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
                    </div>
                  )}
                </div>
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

              {(canViewServices || canViewCategories) && (
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
                      {canViewServices && (
                        <button
                          type="button"
                          onClick={() => (window.location.href = "/servicos")}
                        >
                          <MenuIcon name="services" />
                          <span>Lista de serviços</span>
                        </button>
                      )}

                      {canViewCategories && (
                        <button className="active" type="button">
                          <MenuIcon name="categories" />
                          <span>Categorias</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {canViewFinance && (
                <button type="button">
                  <MenuIcon name="finance" />
                  <span>Financeiro</span>
                </button>
              )}

              {hasPermission("gerenciar_configuracoes", userPermissions) && (
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

      {categoryModalOpen && (
        <div className="category-modal-overlay" onClick={closeCategoryModal}>
          <section
            className="category-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <strong>
                  {editingCategory ? "Editar categoria" : "Nova categoria"}
                </strong>
                <p>Organize os serviços por tipo de veículo.</p>
              </div>

              <button type="button" onClick={closeCategoryModal}>
                ×
              </button>
            </div>

            {error && <div className="categories-error">{error}</div>}

            <form className="category-form" onSubmit={saveCategory}>
              <div className="form-group">
                <label>Nome da categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Carro, Moto, Caminhonete"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>

              <button
                className="save-category-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Salvando..."
                  : editingCategory
                    ? "Salvar alterações"
                    : "Criar categoria"}
              </button>
            </form>
          </section>
        </div>
      )}

      <section className="categories-container">
        <header className="categories-header">
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
            <h1>Categorias</h1>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={loadData}
            aria-label="Atualizar categorias"
          >
            ↻
          </button>
        </header>

        {error && !categoryModalOpen && (
          <div className="categories-error">{error}</div>
        )}

        <section className="categories-list-section">
          <div className="panel-header">
            <div>
              <small>Categorias cadastradas</small>
              <h2>{categories.length} categorias</h2>
            </div>

            {canCreateCategory && (
              <button
                className="add-category-icon-button"
                type="button"
                onClick={openCreateCategoryModal}
                aria-label="Adicionar categoria"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <div className="empty-categories">
              <strong>Nenhuma categoria encontrada</strong>
              <p>Crie categorias para organizar os serviços.</p>
            </div>
          ) : (
            <div className="categories-list">
              {categories.map((category) => (
                <article className="category-card" key={category.id}>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{getTotalServices(category.id)} serviços vinculados</p>
                  </div>

                  {(canEditCategory || canDeleteCategory) && (
                    <div className="category-actions">
                      {canEditCategory && (
                        <button
                          type="button"
                          className="edit-icon"
                          onClick={() => openEditCategoryModal(category)}
                          aria-label="Editar categoria"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4.75 16.95 16.67 5.03a2.3 2.3 0 0 1 3.25 3.25L8 20.2a1.2 1.2 0 0 1-.55.31l-3.15.78a.75.75 0 0 1-.9-.9l.78-3.15c.05-.21.16-.4.31-.55Zm13-10.86L6.05 17.79l-.39 1.56 1.56-.39 11.7-11.7a.8.8 0 0 0-1.13-1.13Z" />
                          </svg>
                        </button>
                      )}

                      {canDeleteCategory && (
                        <button
                          type="button"
                          className="delete-icon"
                          onClick={() => deleteCategory(category)}
                          aria-label="Excluir categoria"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 4.75A2.75 2.75 0 0 1 11.75 2h.5A2.75 2.75 0 0 1 15 4.75h3.25a.75.75 0 0 1 0 1.5H17.5l-.68 12.2A2.75 2.75 0 0 1 14.07 21H9.93a2.75 2.75 0 0 1-2.75-2.55L6.5 6.25h-.75a.75.75 0 0 1 0-1.5H9Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default CategoriasServicos;
