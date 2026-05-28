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

  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [hasPayment, setHasPayment] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

  function handleNameChange(value) {
    updateField("customerName", onlyLetters(value));
  }

  function handlePhoneChange(value) {
    updateField("customerPhone", formatPhone(value));
  }

  function handlePlateChange(value) {
    updateField("vehiclePlate", formatPlate(value));
  }

  function handleModelChange(value) {
    const formatted = value.replace(/[^A-Za-zÀ-ÿ0-9\s]/g, "");
    updateField("vehicleModel", formatted);
  }

  function handleColorChange(value) {
    updateField("vehicleColor", onlyLetters(value));
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

      const servicesResponse = await apiRequest("/api/services");
      const employeesResponse = await apiRequest("/api/team/responsibles");
      const orderResponse = await apiRequest(`/api/orders/${orderId}`);

      const order = orderResponse.order;

      if (order.status === "entregue") {
        setError("Atendimentos entregues não podem ser editados.");
      }

      setServices(servicesResponse.services || []);
      setEmployees(employeesResponse.employees || []);
      setHasPayment(Boolean(order.has_payment));
      setStatus(order.status);

      setForm({
        customerName: order.customer_name || "",
        customerPhone: formatPhone(order.customer_phone || ""),
        vehiclePlate: order.vehicle_plate || "",
        vehicleModel: order.vehicle_model || "",
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
              <label>Serviço</label>
              <select
                value={form.serviceId}
                disabled={status === "entregue"}
                onChange={(event) => handleServiceChange(event.target.value)}
              >
                <option value="">Selecione um serviço</option>

                {services.map((service) => (
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
