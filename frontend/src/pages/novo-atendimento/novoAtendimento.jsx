import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./novoAtendimento.css";

function NovoAtendimento() {
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingPlate, setSearchingPlate] = useState(false);
  const [plateMessage, setPlateMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    vehiclePlate: "",
    vehicleModel: "",
    vehicleColor: "",
    serviceId: "",
    price: "",
    notes: "",
  });

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
    setPlateMessage("");
    updateField("vehiclePlate", formatPlate(value));
  }

  function handleModelChange(value) {
    const formatted = value.replace(/[^A-Za-zÀ-ÿ0-9\s]/g, "");
    updateField("vehicleModel", formatted);
  }

  function handleColorChange(value) {
    updateField("vehicleColor", onlyLetters(value));
  }

  async function loadServices() {
    try {
      setLoadingServices(true);
      setError("");

      const response = await apiRequest("/api/services");
      setServices(response.services || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingServices(false);
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

  function handleServiceChange(serviceId) {
    const selectedService = services.find(
      (service) => String(service.id) === String(serviceId),
    );

    setForm((currentForm) => ({
      ...currentForm,
      serviceId,
      price: selectedService ? selectedService.price : "",
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

    if (!form.serviceId) {
      missingFields.push("Serviço");
    }

    if (!form.price) {
      missingFields.push("Preço");
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
          price: Number(form.price),
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
    loadServices();
  }, []);

  useEffect(() => {
    if (form.vehiclePlate.length === 7) {
      searchVehicleByPlate();
    }
  }, [form.vehiclePlate]);

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
            <small>Operação</small>
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
              <label>Serviço</label>
              <select
                value={form.serviceId}
                onChange={(event) => handleServiceChange(event.target.value)}
                disabled={loadingServices}
              >
                <option value="">
                  {loadingServices
                    ? "Carregando serviços..."
                    : "Selecione um serviço"}
                </option>

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
                onChange={(event) => updateField("price", event.target.value)}
              />
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
            {saving ? "Salvando..." : "Adicionar à fila"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default NovoAtendimento;
