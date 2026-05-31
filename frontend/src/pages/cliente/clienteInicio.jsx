import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./clienteInicio.css";

const weekDayLabels = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

function ClienteInicio() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const businessId = pathParts[1];

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationOpen, setLocationOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [error, setError] = useState("");

  async function loadCustomerPage() {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(
        `/api/public/customer-page/${businessId}`,
      );

      setBusiness(response.business);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function goToNextStep() {
    window.location.href = `/agendar/${businessId}/categorias`;
  }

  function showComingSoonMessage(label) {
    alert(`${label} será configurado em breve pelo lava-jato.`);
  }

  function toBoolean(value) {
    return value === true || value === 1 || value === "1";
  }

  function getFormattedAddress() {
    return [
      business?.addressStreet,
      business?.addressNumber,
      business?.addressNeighborhood,
      business?.addressCity,
      business?.addressState,
    ]
      .filter(Boolean)
      .join(", ");
  }

  function openLocationModal() {
    const address = getFormattedAddress();

    if (!address) {
      alert("Localização ainda não cadastrada pelo lava-jato.");
      return;
    }

    setLocationOpen(true);
  }

  function openGoogleMaps() {
    const address = getFormattedAddress();

    if (!address) {
      alert("Localização ainda não cadastrada pelo lava-jato.");
      return;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;

    window.open(mapsUrl, "_blank");
  }

  function formatWorkingHour(day) {
    const isOpen = toBoolean(day.is_open);
    const hasLunchBreak = toBoolean(day.has_lunch_break);

    if (!isOpen) {
      return "Fechado";
    }

    if (hasLunchBreak && day.lunch_start && day.lunch_end) {
      return `${day.open_time} às ${day.lunch_start} / ${day.lunch_end} às ${day.close_time}`;
    }

    return `${day.open_time} às ${day.close_time}`;
  }

  function getOrderedWorkingHours() {
    const order = [1, 2, 3, 4, 5, 6, 0];

    return order
      .map((weekday) =>
        business?.workingHours?.find(
          (item) => Number(item.weekday) === Number(weekday),
        ),
      )
      .filter(Boolean);
  }

  useEffect(() => {
    loadCustomerPage();
  }, []);

  if (loading) {
    return (
      <main className="customer-page">
        <section className="customer-loading">
          <div className="customer-loading-circle"></div>
          <p>Carregando...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="customer-page">
        <section className="customer-error-card">
          <strong>Não foi possível carregar a página</strong>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-page">
      {locationOpen && (
        <div
          className="customer-modal-overlay"
          onClick={() => setLocationOpen(false)}
        >
          <section
            className="customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-modal-header">
              <div>
                <strong>Localização</strong>
                <span>{business?.name || "Lava-jato"}</span>
              </div>

              <button type="button" onClick={() => setLocationOpen(false)}>
                ×
              </button>
            </div>

            <div className="customer-modal-body">
              <div className="modal-main-icon location-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.75a7.25 7.25 0 0 0-7.25 7.25c0 5.05 6.15 10.77 6.41 11.01a1.25 1.25 0 0 0 1.68 0c.26-.24 6.41-5.96 6.41-11.01A7.25 7.25 0 0 0 12 2.75Zm0 9.75a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                </svg>
              </div>

              <h2>Endereço</h2>
              <p>{getFormattedAddress()}</p>
            </div>

            <button
              type="button"
              className="modal-primary-button"
              onClick={openGoogleMaps}
            >
              Abrir no Google Maps
            </button>
          </section>
        </div>
      )}

      {hoursOpen && (
        <div
          className="customer-modal-overlay"
          onClick={() => setHoursOpen(false)}
        >
          <section
            className="customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-modal-header">
              <div>
                <strong>Horários</strong>
                <span>Funcionamento do lava-jato</span>
              </div>

              <button type="button" onClick={() => setHoursOpen(false)}>
                ×
              </button>
            </div>

            <div className="working-hours-modal-list">
              {getOrderedWorkingHours().map((day) => (
                <div className="working-hours-modal-row" key={day.weekday}>
                  <strong>{weekDayLabels[day.weekday]}</strong>
                  <span>{formatWorkingHour(day)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="customer-app">
        <section className="customer-hero">
          <div className="customer-main-logo">
            {business?.logoUrl ? (
              <img src={business.logoUrl} alt={`Logo ${business.name}`} />
            ) : (
              <strong>{business?.name?.slice(0, 1) || "P"}</strong>
            )}
          </div>

          <div className="customer-main-text">
            <span>Agendamento online</span>

            <h1>{business?.name || "Lava-jato"}</h1>

            <p>
              {business?.phrase ||
                "Agende sua lavagem de forma rápida e prática."}
            </p>
          </div>

          <button
            type="button"
            className="customer-main-button"
            onClick={goToNextStep}
          >
            Marcar atendimento
          </button>
        </section>

        <section className="customer-shortcuts">
          <button
            type="button"
            className="shortcut-button whatsapp"
            onClick={() => showComingSoonMessage("WhatsApp")}
          >
            <span className="shortcut-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.49 0 .14 5.35.14 11.94c0 2.1.55 4.16 1.6 5.98L0 24l6.25-1.64a11.9 11.9 0 0 0 5.83 1.49h.01c6.58 0 11.94-5.35 11.94-11.94 0-3.18-1.24-6.18-3.51-8.43ZM12.09 21.84h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.71.97.99-3.62-.23-.37a9.89 9.89 0 0 1-1.52-5.29C2.2 6.46 6.62 2.03 12.1 2.03a9.83 9.83 0 0 1 7 2.9 9.85 9.85 0 0 1 2.9 7c0 5.47-4.44 9.91-9.91 9.91Zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.13-.27-.2-.57-.35Z" />
              </svg>
            </span>
            <strong>WhatsApp</strong>
          </button>

          <button
            type="button"
            className="shortcut-button instagram"
            onClick={() => showComingSoonMessage("Instagram")}
          >
            <span className="shortcut-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.8 2h8.4A5.81 5.81 0 0 1 22 7.8v8.4A5.81 5.81 0 0 1 16.2 22H7.8A5.81 5.81 0 0 1 2 16.2V7.8A5.81 5.81 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7.25A4.75 4.75 0 1 1 12 16.75 4.75 4.75 0 0 1 12 7.25Zm0 2A2.75 2.75 0 1 0 12 14.75 2.75 2.75 0 0 0 12 9.25Z" />
              </svg>
            </span>
            <strong>Instagram</strong>
          </button>

          <button
            type="button"
            className="shortcut-button location"
            onClick={openLocationModal}
          >
            <span className="shortcut-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.75a7.25 7.25 0 0 0-7.25 7.25c0 5.05 6.15 10.77 6.41 11.01a1.25 1.25 0 0 0 1.68 0c.26-.24 6.41-5.96 6.41-11.01A7.25 7.25 0 0 0 12 2.75Zm0 9.75a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
              </svg>
            </span>
            <strong>Localização</strong>
          </button>

          <button
            type="button"
            className="shortcut-button hours"
            onClick={() => setHoursOpen(true)}
          >
            <span className="shortcut-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.75a9.25 9.25 0 1 0 0 18.5 9.25 9.25 0 0 0 0-18.5Zm.75 9.02 3.02 1.74a.75.75 0 1 1-.75 1.3l-3.39-1.96a.75.75 0 0 1-.38-.65V7.75a.75.75 0 0 1 1.5 0v4.02Z" />
              </svg>
            </span>
            <strong>Horários</strong>
          </button>
        </section>

        <footer className="customer-footer">
          Todos os direitos reservados a {business?.name || "Lava-jato"}.
        </footer>
      </section>
    </main>
  );
}

export default ClienteInicio;
