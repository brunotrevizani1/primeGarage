import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./novoAtendimento.css";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";

function NovoAtendimento() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingPlate, setSearchingPlate] = useState(false);
  const [plateMessage, setPlateMessage] = useState("");
  const [error, setError] = useState("");
  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());
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

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    vehiclePlate: "",
    vehicleModel: "",
    vehicleColor: "",
    categoryId: "",
    serviceId: "",
    price: "",
    scheduledDate: new Date().toISOString().slice(0, 10),
    responsibleUserId: "",
    notes: "",
  });

  function capitalizeWords(value) {
    return value
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function onlyLetters(value) {
    return value.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
  }

  function onlyNumbers(value) {
    return value.replace(/\D/g, "");
  }

  function formatCurrencyInput(value) {
    const numbers = String(value).replace(/\D/g, "");

    if (!numbers) {
      return "";
    }

    const amount = Number(numbers) / 100;

    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function currencyToNumber(value) {
    const numbers = String(value).replace(/\D/g, "");

    if (!numbers) {
      return 0;
    }

    return Number(numbers) / 100;
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
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);
  }

  function handleNameChange(value) {
    updateField("customerName", onlyLetters(value));
  }

  function handlePhoneChange(value) {
    updateField("customerPhone", formatPhone(value));
  }

  function handlePlateChange(value) {
    setPlateMessage("");
    updateField("vehiclePlate", formatPlate(value));
  }

  function handleModelChange(value) {
    const cleanValue = value.replace(/[^A-Za-zÀ-ÿ0-9\s]/g, "");
    updateField("vehicleModel", capitalizeWords(cleanValue));
  }

  function handleColorChange(value) {
    const cleanValue = onlyLetters(value);
    updateField("vehicleColor", capitalizeWords(cleanValue));
  }

  async function loadOptions() {
    try {
      setLoadingOptions(true);
      setError("");

      const categoriesResponse = await apiRequest("/api/service-categories");
      const servicesResponse = await apiRequest("/api/services");
      const employeesResponse = await apiRequest("/api/team/responsibles");
      setCategories(categoriesResponse.categories || []);
      setServices(servicesResponse.services || []);
      setEmployees(employeesResponse.employees || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function searchVehicleByPlate() {
    try {
      const plate = form.vehiclePlate;

      if (plate.length < 7) {
        return;
      }

      setSearchingPlate(true);
      setPlateMessage("");

      const response = await apiRequest(`/api/vehicles/plate/${plate}`);

      const vehicle = response.vehicle;

      setForm((currentForm) => ({
        ...currentForm,
        vehicleModel: vehicle.model || currentForm.vehicleModel,
        vehicleColor: vehicle.color || currentForm.vehicleColor,
        customerName: vehicle.customer_name || currentForm.customerName,
        customerPhone: vehicle.customer_phone
          ? formatPhone(vehicle.customer_phone)
          : currentForm.customerPhone,
      }));

      setPlateMessage("Veículo encontrado e dados preenchidos!");
    } catch (error) {
      setPlateMessage("Veículo ainda não cadastrado.");
    } finally {
      setSearchingPlate(false);
    }
  }

  function handleCategoryChange(categoryId) {
    setForm((currentForm) => ({
      ...currentForm,
      categoryId,
      serviceId: "",
      price: "",
    }));
  }

  function handleServiceChange(serviceId) {
    const selectedService = services.find(
      (service) => String(service.id) === String(serviceId),
    );

    setForm((currentForm) => ({
      ...currentForm,
      serviceId,
      price: selectedService
        ? formatCurrencyInput(
            String(Math.round(Number(selectedService.price || 0) * 100)),
          )
        : "",
    }));
  }

  function validateForm() {
    const missingFields = [];

    if (!form.vehiclePlate.trim()) {
      missingFields.push("Placa");
    }

    if (!form.vehicleModel.trim()) {
      missingFields.push("Modelo");
    }

    if (!form.vehicleColor.trim()) {
      missingFields.push("Cor");
    }

    if (!form.customerName.trim()) {
      missingFields.push("Nome do cliente");
    }

    if (!form.customerPhone.trim()) {
      missingFields.push("Telefone do cliente");
    }

    if (!form.categoryId) {
      missingFields.push("categoria");
    }

    if (!form.serviceId) {
      missingFields.push("Serviço");
    }

    if (!form.price || currencyToNumber(form.price) <= 0) {
      missingFields.push("preço");
    }

    if (missingFields.length === 0) {
      return "";
    }

    if (missingFields.length === 1) {
      return `Antes de continuar, preencha o campo: ${missingFields[0]}.`;
    }

    const lastField = missingFields.pop();

    return `Antes de continuar, preencha: ${missingFields.join(", ")} e ${lastField}.`;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSaving(true);
      setError("");

      const cleanPhone = onlyNumbers(form.customerPhone);

      await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: cleanPhone,
          vehiclePlate: form.vehiclePlate.toUpperCase(),
          vehicleModel: form.vehicleModel.trim(),
          vehicleColor: form.vehicleColor.trim(),
          serviceId: Number(form.serviceId),
          scheduledDate: form.scheduledDate,
          responsibleUserId: form.responsibleUserId
            ? Number(form.responsibleUserId)
            : null,
          price: currencyToNumber(form.price),
          notes: form.notes,
        }),
      });

      window.location.href = "/atendimentos";
    } catch (error) {
      setError(error.message);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function checkPermissionAndLoad() {
      try {
        const permissionResponse = await loadUserPermissions();

        const currentPermissions = permissionResponse.permissions || [];
        const currentRole = permissionResponse.role || "";

        setUserPermissions(currentPermissions);
        setUserRole(currentRole);

        const canAccessNewOrder =
          currentRole === "owner" ||
          currentRole === "super_admin" ||
          currentPermissions.includes("criar_atendimento");

        if (!canAccessNewOrder) {
          window.location.href = getFirstAllowedPath(
            currentPermissions,
            currentRole,
          );
          return;
        }

        loadOptions();
      } catch (error) {
        setError(error.message);
      }
    }

    checkPermissionAndLoad();
  }, []);

  useEffect(() => {
    if (form.vehiclePlate.length === 7) {
      searchVehicleByPlate();
    }
  }, [form.vehiclePlate]);

  const filteredServices = form.categoryId
    ? services.filter(
        (service) => String(service.category_id) === String(form.categoryId),
      )
    : [];

  return (
    <main className="new-order-page">
      <section className="new-order-container">
        <header className="new-order-header">
          <button
            type="button"
            onClick={() => (window.location.href = "/atendimentos")}
          >
            ←
          </button>

          <div>
            <h1>Novo atendimento</h1>
          </div>
        </header>

        {error && <div className="new-order-error">{error}</div>}

        <form className="new-order-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Veículo</h2>

            <div className="form-group">
              <label>Placa</label>
              <input
                type="text"
                placeholder="Ex: ABC1D23"
                value={form.vehiclePlate}
                onChange={(event) => handlePlateChange(event.target.value)}
              />

              {searchingPlate && (
                <p className="field-message">Buscando veículo...</p>
              )}

              {!searchingPlate && plateMessage && (
                <p className="field-message">{plateMessage}</p>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Onix"
                  value={form.vehicleModel}
                  onChange={(event) => handleModelChange(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Cor</label>
                <input
                  type="text"
                  placeholder="Ex: Branco"
                  value={form.vehicleColor}
                  onChange={(event) => handleColorChange(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Cliente</h2>

            <div className="form-group">
              <label>Nome do cliente</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={form.customerName}
                onChange={(event) => handleNameChange(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input
                type="text"
                placeholder="Ex: (51) 99999-9999"
                value={form.customerPhone}
                onChange={(event) => handlePhoneChange(event.target.value)}
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Serviço</h2>

            <div className="form-group">
              <label>Categoria</label>
              <select
                value={form.categoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                disabled={loadingOptions}
              >
                <option value="">
                  {loadingOptions
                    ? "Carregando categorias..."
                    : "Selecione uma categoria"}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Serviço</label>
              <select
                value={form.serviceId}
                onChange={(event) => handleServiceChange(event.target.value)}
                disabled={loadingOptions || !form.categoryId}
              >
                <option value="">
                  {!form.categoryId
                    ? "Escolha uma categoria primeiro"
                    : filteredServices.length === 0
                      ? "Nenhum serviço nessa categoria"
                      : "Selecione um serviço"}
                </option>

                {filteredServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <div className="form-group">
                <label>Preço</label>
                <input
                  type="text"
                  placeholder="R$ 0,00"
                  value={form.price}
                  onChange={(event) =>
                    updateField(
                      "price",
                      formatCurrencyInput(event.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>
          <div className="form-section">
            <h2>Detalhes do atendimento</h2>

            <div className="form-group">
              <label>Data do atendimento</label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(event) =>
                  updateField("scheduledDate", event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Responsável</label>
              <select
                value={form.responsibleUserId}
                onChange={(event) =>
                  updateField("responsibleUserId", event.target.value)
                }
                disabled={loadingOptions}
              >
                <option value="">Decidir depois</option>

                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Observação</label>
              <textarea
                placeholder="Alguma observação sobre o atendimento..."
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              ></textarea>
            </div>
          </div>

          <button className="save-button" type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar atendimento"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default NovoAtendimento;
