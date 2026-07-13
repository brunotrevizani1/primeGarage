import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./editarAtendimento.css";
import {
  getSavedPermissions,
  getSavedRole,
  loadUserPermissions,
} from "../../services/permissions";

function getReturnDate() {
  const params = new URLSearchParams(window.location.search);
  return params.get("date");
}

function goBackToAttendances() {
  const returnDate = getReturnDate();

  window.location.href = returnDate
    ? `/atendimentos?date=${returnDate}`
    : "/atendimentos";
}

function EditarAtendimento() {
  const orderId = window.location.pathname.split("/").pop();

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [hasPayment, setHasPayment] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [basePrice, setBasePrice] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountMessage, setDiscountMessage] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    vehiclePlate: "",
    vehicleModel: "",
    vehicleColor: "",
    serviceId: "",
    price: "",
    scheduledDate: "",
    responsibleUserId: "",
    categoryId: "",
    notes: "",
  });

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

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function onlyLetters(value) {
    return value.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
  }

  const NAME_LOWERCASE = new Set(["da", "de", "di", "do", "du", "das", "dos", "e", "ou", "a", "o"]);

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

  function capitalizeWords(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  }

  function onlyNumbers(value) {
    return value.replace(/\D/g, "");
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

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function handleNameChange(value) {
    updateField("customerName", capitalizeName(onlyLetters(value)));
  }

  function handlePhoneChange(value) {
    updateField("customerPhone", formatPhone(value));
  }

  function handlePlateChange(value) {
    updateField("vehiclePlate", formatPlate(value));
  }

  function handleModelChange(value) {
    const letters = value.replace(/[^A-Za-zÀ-ÿ0-9\s]/g, "");
    updateField("vehicleModel", capitalizeWords(letters));
  }

  function handleColorChange(value) {
    updateField("vehicleColor", capitalizeWords(onlyLetters(value)));
  }

  function validateForm() {
    const missingFields = [];

    if (!form.vehiclePlate.trim()) {
      missingFields.push("placa");
    }

    if (!form.vehicleModel.trim()) {
      missingFields.push("modelo");
    }

    if (!form.vehicleColor.trim()) {
      missingFields.push("cor");
    }

    if (!form.customerName.trim()) {
      missingFields.push("nome do cliente");
    }

    if (!form.customerPhone.trim()) {
      missingFields.push("telefone");
    }

    if (!form.serviceId) {
      missingFields.push("serviço");
    }

    if (!form.price) {
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

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const categoriesResponse = await apiRequest("/api/service-categories");
      const servicesResponse = await apiRequest("/api/services");
      const employeesResponse = await apiRequest("/api/team/responsibles");
      const orderResponse = await apiRequest(`/api/orders/${orderId}`);

      const order = orderResponse.order;

      if (order.status === "entregue") {
        setError("Atendimentos entregues não podem ser editados.");
      }

      const loadedServices = servicesResponse.services || [];
      const currentService = loadedServices.find(
        (service) => String(service.id) === String(order.service_id),
      );

      setCategories(categoriesResponse.categories || []);
      setServices(loadedServices);
      setEmployees(employeesResponse.employees || []);
      setHasPayment(Boolean(order.has_payment));
      setStatus(order.status);

      const currentDiscount = Number(order.discount_amount) || 0;
      const currentPrice = Number(order.price) || 0;

      setDiscountAmount(currentDiscount);
      setBasePrice(currentPrice + currentDiscount);
      setDiscountInput(currentDiscount ? String(currentDiscount) : "");

      setForm({
        customerName: order.customer_name || "",
        customerPhone: formatPhone(order.customer_phone || ""),
        vehiclePlate: order.vehicle_plate || "",
        vehicleModel: order.vehicle_model || "",
        categoryId: currentService?.category_id || "",
        vehicleColor: order.vehicle_color || "",
        serviceId: order.service_id || "",
        price: order.price || "",
        scheduledDate: order.scheduled_date
          ? order.scheduled_date.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        responsibleUserId: order.responsible_user_id || "",
        notes: order.notes || "",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryChange(categoryId) {
    setForm((currentForm) => ({
      ...currentForm,
      categoryId,
      serviceId: "",
      price: hasPayment ? currentForm.price : "",
    }));
  }

  function handleServiceChange(serviceId) {
    const selectedService = services.find(
      (service) => String(service.id) === String(serviceId),
    );

    setForm((currentForm) => ({
      ...currentForm,
      serviceId,
      price: hasPayment
        ? currentForm.price
        : selectedService
          ? selectedService.price
          : currentForm.price,
    }));
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

      await apiRequest(`/api/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: onlyNumbers(form.customerPhone),
          vehiclePlate: form.vehiclePlate.toUpperCase(),
          vehicleModel: form.vehicleModel.trim(),
          vehicleColor: form.vehicleColor.trim(),
          serviceId: Number(form.serviceId),
          scheduledDate: form.scheduledDate,
          responsibleUserId: form.responsibleUserId
            ? Number(form.responsibleUserId)
            : null,
          price: Number(form.price),
          notes: form.notes,
        }),
      });

      const returnDate = getReturnDate();

      window.location.href = returnDate
        ? `/atendimentos?date=${returnDate}`
        : "/atendimentos";
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

  async function handleApplyDiscount() {
    const discountValue = Number(discountInput.replace(",", ".")) || 0;

    setDiscountError("");
    setDiscountMessage("");

    if (discountValue < 0) {
      setDiscountError("Informe um valor de desconto válido.");
      return;
    }

    if (discountValue > basePrice) {
      setDiscountError("O desconto não pode ser maior que o valor do atendimento.");
      return;
    }

    try {
      setApplyingDiscount(true);

      const response = await apiRequest(`/api/orders/${orderId}/discount`, {
        method: "PATCH",
        body: JSON.stringify({ discount: discountValue }),
      });

      setDiscountAmount(response.discount_amount);
      updateField("price", response.price);
      setDiscountMessage("Desconto aplicado com sucesso.");
    } catch (error) {
      setDiscountError(error.message);
    } finally {
      setApplyingDiscount(false);
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

        const canAccessEditOrder =
          currentRole === "owner" ||
          currentRole === "super_admin" ||
          currentPermissions.includes("editar_atendimento");

        if (!canAccessEditOrder) {
          window.location.href = getFirstAllowedPath(
            currentPermissions,
            currentRole,
          );
          return;
        }

        loadData();
      } catch (error) {
        setError(error.message);
      }
    }

    checkPermissionAndLoad();
  }, []);

  if (loading) {
    return (
      <main className="edit-order-page">
        <section className="edit-order-loading">
          <div className="loading-circle"></div>
          <p>Carregando atendimento...</p>
        </section>
      </main>
    );
  }

  const filteredServices = form.categoryId
    ? services.filter(
        (service) => String(service.category_id) === String(form.categoryId),
      )
    : [];

  return (
    <main className="edit-order-page">
      <section className="edit-order-container">
        <header className="edit-order-header">
          <button
            type="button"
            className="back-button"
            onClick={goBackToAttendances}
          >
            ‹
          </button>

          <div>
            <small>Operação</small>
            <h1>Editar atendimento</h1>
          </div>
        </header>

        {error && <div className="edit-order-error">{error}</div>}

        {hasPayment && (
          <div className="edit-order-warning">
            Este atendimento já possui pagamento registrado. O valor não pode
            ser alterado.
          </div>
        )}

        <div className="form-section discount-section">
          <h2>Desconto</h2>

          {discountError && <div className="edit-order-error">{discountError}</div>}
          {discountMessage && <div className="discount-success">{discountMessage}</div>}

          {hasPayment ? (
            <p className="field-message">
              Este atendimento já foi pago e não pode mais receber desconto.
            </p>
          ) : (
            <>
              <p className="field-message">
                Valor original: {formatMoney(basePrice)} · Valor final: {formatMoney(basePrice - discountAmount)}
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Desconto (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={discountInput}
                    onChange={(event) => setDiscountInput(event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="apply-discount-button"
                  onClick={handleApplyDiscount}
                  disabled={applyingDiscount}
                >
                  {applyingDiscount ? "Aplicando..." : "Aplicar desconto"}
                </button>
              </div>
            </>
          )}
        </div>

        <form className="edit-order-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Veículo</h2>

            <div className="form-group">
              <label>Placa</label>
              <input
                type="text"
                placeholder="Ex: ABC1D23"
                value={form.vehiclePlate}
                disabled={status === "entregue"}
                onChange={(event) => handlePlateChange(event.target.value)}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Onix"
                  value={form.vehicleModel}
                  disabled={status === "entregue"}
                  onChange={(event) => handleModelChange(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Cor</label>
                <input
                  type="text"
                  placeholder="Ex: Branco"
                  value={form.vehicleColor}
                  disabled={status === "entregue"}
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
                disabled={status === "entregue"}
                onChange={(event) => handleNameChange(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input
                type="text"
                placeholder="Ex: (51) 99999-9999"
                value={form.customerPhone}
                disabled={status === "entregue"}
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
                disabled={status === "entregue"}
                onChange={(event) => handleCategoryChange(event.target.value)}
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
              <label>Serviço</label>
              <select
                value={form.serviceId}
                disabled={status === "entregue" || !form.categoryId}
                onChange={(event) => handleServiceChange(event.target.value)}
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
            </div>

            <div className="form-group">
              <label>Valor</label>
              <input
                type="number"
                placeholder="Ex: 70"
                value={form.price}
                disabled={status === "entregue" || hasPayment}
                onChange={(event) => updateField("price", event.target.value)}
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Detalhes do atendimento</h2>

            <div className="form-group">
              <label>Data do atendimento</label>
              <input
                type="date"
                value={form.scheduledDate}
                disabled={status !== "agendado" && status !== "na_fila"}
                onChange={(event) =>
                  updateField("scheduledDate", event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Responsável</label>
              <select
                value={form.responsibleUserId}
                disabled={status === "entregue"}
                onChange={(event) =>
                  updateField("responsibleUserId", event.target.value)
                }
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
                disabled={status === "entregue"}
                onChange={(event) => updateField("notes", event.target.value)}
              ></textarea>
            </div>
          </div>

          {status !== "entregue" && (
            <button className="save-button" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

export default EditarAtendimento;
