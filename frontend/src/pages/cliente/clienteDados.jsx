import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./clienteDados.css";

function ClienteDados() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const businessId = pathParts[1];

  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get("servico");

  const [business, setBusiness] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingPlate, setLoadingPlate] = useState(false);
  const [vehicleFound, setVehicleFound] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    vehiclePlate: "",
    vehicleModel: "",
    vehicleColor: "",
    customerName: "",
    customerPhone: "",
  });

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

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function loadPageSettings() {
    try {
      setLoadingPage(true);
      setError("");

      const response = await apiRequest(
        `/api/public/customer-page/${businessId}`,
      );

      setBusiness(response.business || response.settings || null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingPage(false);
    }
  }

  async function searchVehicleByPlate(plate) {
    const cleanPlate = formatPlate(plate);

    setForm((currentForm) => ({
      ...currentForm,
      vehiclePlate: cleanPlate,
    }));

    setVehicleFound(false);

    if (cleanPlate.length < 7) {
      return;
    }

    try {
      setLoadingPlate(true);
      setError("");

      const response = await apiRequest(
        `/api/public/vehicles/${businessId}/${cleanPlate}`,
      );

      const vehicle = response.vehicle;

      setForm({
        vehiclePlate: vehicle.plate || cleanPlate,
        vehicleModel: vehicle.model || "",
        vehicleColor: vehicle.color || "",
        customerName: vehicle.customerName || "",
        customerPhone: formatPhone(vehicle.customerPhone || ""),
      });

      setVehicleFound(true);
    } catch (error) {
      setVehicleFound(false);

      setForm((currentForm) => ({
        ...currentForm,
        vehicleModel: "",
        vehicleColor: "",
        customerName: "",
        customerPhone: "",
      }));

      if (!String(error.message || "").includes("Veículo não encontrado")) {
        setError(error.message);
      }
    } finally {
      setLoadingPlate(false);
    }
  }

  function goBack() {
    window.history.back();
  }

  function goNext(event) {
    event.preventDefault();

    if (!serviceId) {
      setError("Serviço não informado.");
      return;
    }

    if (
      !form.vehiclePlate.trim() ||
      !form.vehicleModel.trim() ||
      !form.vehicleColor.trim() ||
      !form.customerName.trim() ||
      !form.customerPhone.trim()
    ) {
      setError("Preencha todos os dados para continuar.");
      return;
    }

    if (formatPlate(form.vehiclePlate).length < 7) {
      setError("Informe uma placa válida.");
      return;
    }

    const bookingData = {
      businessId,
      serviceId,
      customerName: form.customerName.trim(),
      customerPhone: onlyNumbers(form.customerPhone),
      vehiclePlate: formatPlate(form.vehiclePlate),
      vehicleModel: form.vehicleModel.trim(),
      vehicleColor: form.vehicleColor.trim(),
    };

    sessionStorage.setItem(
      `primegarage_booking_${businessId}`,
      JSON.stringify(bookingData),
    );

    window.location.href = `/agendar/${businessId}/agenda?servico=${serviceId}`;
  }

  useEffect(() => {
    loadPageSettings();
  }, []);

  if (loadingPage) {
    return (
      <main className="customer-data-page">
        <section className="customer-data-loading">
          <div className="customer-data-loading-circle"></div>
          <p>Carregando dados...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-data-page">
      <section className="customer-data-app">
        <section className="customer-data-hero">
          <button
            type="button"
            className="customer-data-back"
            onClick={goBack}
            aria-label="Voltar"
          >
            ‹
          </button>

          <div className="customer-data-logo">
            {business?.logoUrl || business?.customerPageLogoUrl ? (
              <img
                src={business.logoUrl || business.customerPageLogoUrl}
                alt={`Logo ${business.name || business.customerPageName}`}
              />
            ) : (
              <strong>
                {(business?.name || business?.customerPageName || "P").slice(
                  0,
                  1,
                )}
              </strong>
            )}
          </div>

          <span className="customer-data-business">
            {business?.name || business?.customerPageName || "Lava-jato"}
          </span>

          <h1>Seus dados</h1>
        </section>

        <section className="customer-data-card">
          {error && <div className="customer-data-error">{error}</div>}

          <form className="customer-data-form" onSubmit={goNext}>
            <div className="customer-data-grid">
              <div className="form-group full-field">
                <label>Placa</label>

                <div className="input-with-loader">
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    value={form.vehiclePlate}
                    onChange={(event) =>
                      searchVehicleByPlate(event.target.value)
                    }
                  />

                  {loadingPlate && (
                    <div
                      className="customer-data-small-loader"
                      aria-label="Buscando placa"
                    ></div>
                  )}
                </div>

                {form.vehiclePlate.length === 7 && vehicleFound && (
                  <p className="customer-data-success">
                    Cadastro encontrado. Dados preenchidos automaticamente.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Onix"
                  value={form.vehicleModel}
                  onChange={(event) =>
                    updateField(
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
                  value={form.vehicleColor}
                  onChange={(event) =>
                    updateField(
                      "vehicleColor",
                      capitalizeWords(event.target.value),
                    )
                  }
                />
              </div>

              <div className="form-group full-field">
                <label>Nome</label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={form.customerName}
                  onChange={(event) =>
                    updateField("customerName", event.target.value)
                  }
                />
              </div>

              <div className="form-group full-field">
                <label>Telefone</label>
                <input
                  type="text"
                  placeholder="(51) 99999-9999"
                  value={form.customerPhone}
                  onChange={(event) =>
                    updateField(
                      "customerPhone",
                      formatPhone(event.target.value),
                    )
                  }
                />
              </div>
            </div>

            <button className="customer-data-next-button" type="submit">
              Continuar
            </button>
          </form>
        </section>

        <div className="customer-data-step">Etapa 3 de 5</div>

        <footer className="customer-data-footer">
          Todos os direitos reservados a{" "}
          {business?.name || business?.customerPageName || "Lava-jato"}.
        </footer>
      </section>
    </main>
  );
}

export default ClienteDados;
