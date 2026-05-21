import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./servicos.css";

function Servicos() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [serviceForm, setServiceForm] = useState({
    category_id: "",
    name: "",
    description: "",
    price: "",
    duration_minutes: "",
    status: "active",
  });

  const [categoryName, setCategoryName] = useState("");

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function updateServiceField(field, value) {
    setServiceForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function onlyNumbers(value) {
    return value.replace(/\D/g, "");
  }

  function handleLogout() {
    localStorage.removeItem("primegarage_token");
    localStorage.removeItem("primegarage_user");
    window.location.href = "/";
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

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
    setEditingService(null);

    setServiceForm({
      category_id:
        selectedCategory !== "todos"
          ? selectedCategory
          : categories[0]?.id || "",
      name: "",
      description: "",
      price: "",
      duration_minutes: "",
      status: "active",
    });

    setServiceModalOpen(true);
  }

  function openEditServiceModal(service) {
    setEditingService(service);

    setServiceForm({
      category_id: service.category_id || "",
      name: service.name || "",
      description: service.description || "",
      price: service.price || "",
      duration_minutes: service.duration_minutes || "",
      status: service.status || "active",
    });

    setServiceModalOpen(true);
  }

  function closeServiceModal() {
    setServiceModalOpen(false);
    setEditingService(null);
    setError("");
  }

  function validateServiceForm() {
    const missingFields = [];

    if (!serviceForm.category_id) {
      missingFields.push("categoria");
    }

    if (!serviceForm.name.trim()) {
      missingFields.push("nome do serviço");
    }

    if (!serviceForm.price) {
      missingFields.push("preço");
    }

    if (missingFields.length === 0) {
      return "";
    }

    if (missingFields.length === 1) {
      return `Preencha o campo obrigatório: ${missingFields[0]}.`;
    }

    const lastField = missingFields.pop();

    return `Preencha os campos obrigatórios: ${missingFields.join(", ")} e ${lastField}.`;
  }

  async function saveService(event) {
    event.preventDefault();

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
        price: Number(serviceForm.price),
        duration_minutes: serviceForm.duration_minutes
          ? Number(serviceForm.duration_minutes)
          : null,
        status: serviceForm.status,
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

  async function disableService(serviceId) {
    const confirmDisable = window.confirm(
      "Tem certeza que deseja desativar este serviço?",
    );

    if (!confirmDisable) {
      return;
    }

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

  async function saveCategory(event) {
    event.preventDefault();

    if (!categoryName.trim()) {
      setError("Preencha o nome da categoria.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await apiRequest("/api/service-categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryName.trim(),
        }),
      });

      setCategoryName("");
      setCategoryModalOpen(false);
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredServices =
    selectedCategory === "todos"
      ? services
      : services.filter(
          (service) => String(service.category_id) === String(selectedCategory),
        );

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
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/atendimentos")}
              >
                Atendimentos
              </button>

              <button type="button">Equipe</button>

              <button className="active" type="button">
                Serviços
              </button>

              <button type="button">Financeiro</button>
              <button type="button">Configurações</button>
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
                <p>Configure categoria, preço e duração.</p>
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

                  {categories
                    .filter((category) => category.status === "active")
                    .map((category) => (
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
                  placeholder="Ex: Lavagem externa, aspiração interna e acabamento nos pneus..."
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
                    type="number"
                    placeholder="Ex: 70"
                    value={serviceForm.price}
                    onChange={(event) =>
                      updateServiceField("price", event.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Duração</label>
                  <input
                    type="text"
                    placeholder="Minutos"
                    value={serviceForm.duration_minutes}
                    onChange={(event) =>
                      updateServiceField(
                        "duration_minutes",
                        onlyNumbers(event.target.value),
                      )
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={serviceForm.status}
                  onChange={(event) =>
                    updateServiceField("status", event.target.value)
                  }
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
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

      {categoryModalOpen && (
        <div
          className="service-modal-overlay"
          onClick={() => setCategoryModalOpen(false)}
        >
          <section
            className="service-modal small"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <strong>Nova categoria</strong>
                <p>Ex: Caminhonete, Frota, Estética premium.</p>
              </div>

              <button type="button" onClick={() => setCategoryModalOpen(false)}>
                ×
              </button>
            </div>

            {error && <div className="services-error">{error}</div>}

            <form className="service-form" onSubmit={saveCategory}>
              <div className="form-group">
                <label>Nome da categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Caminhonete"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>

              <button
                className="save-service-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Criar categoria"}
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
            className="add-service-button"
            type="button"
            onClick={openCreateServiceModal}
          >
            +
          </button>
        </header>

        {error && !serviceModalOpen && !categoryModalOpen && (
          <div className="services-error">{error}</div>
        )}

        <section className="category-section">
          <div className="category-title">
            <div>
              <h2>Categorias</h2>
            </div>

            <button type="button" onClick={() => setCategoryModalOpen(true)}>
              + Categoria
            </button>
          </div>

          <div className="category-list">
            <button
              type="button"
              className={selectedCategory === "todos" ? "active" : ""}
              onClick={() => setSelectedCategory("todos")}
            >
              Todos
            </button>

            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={
                  String(selectedCategory) === String(category.id)
                    ? "active"
                    : ""
                }
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        <section className="services-list-section">
          <div className="section-title">
            <div>
              <small>Serviços cadastrados</small>
              <h2>{filteredServices.length} serviços</h2>
            </div>
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

                    <span className={`service-status ${service.status}`}>
                      {service.status === "active" ? "Ativo" : "Inativo"}
                    </span>
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
                        {service.duration_minutes
                          ? `${service.duration_minutes} min`
                          : "Não definida"}
                      </strong>
                    </div>
                  </div>

                  <div className="service-actions">
                    <button
                      type="button"
                      className="edit-service"
                      onClick={() => openEditServiceModal(service)}
                    >
                      Editar
                    </button>

                    {service.status === "active" && (
                      <button
                        type="button"
                        className="disable-service"
                        onClick={() => disableService(service.id)}
                      >
                        Desativar
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

export default Servicos;
