import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./clienteConfirmacao.css";

const PERIOD_LABELS = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
};

const WEEKDAYS = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

function ClienteConfirmacao() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const businessId = pathParts[1];

  const [business, setBusiness] = useState(null);
  const [service, setService] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState("");

  async function loadPage() {
    try {
      setLoadingPage(true);
      setError("");

      const raw = sessionStorage.getItem(`primegarage_booking_${businessId}`);
      if (!raw) {
        setError("Dados do agendamento não encontrados. Volte e tente novamente.");
        return;
      }

      const bookingData = JSON.parse(raw);
      setBooking(bookingData);

      const [pageRes, serviceRes] = await Promise.all([
        apiRequest(`/api/public/customer-page/${businessId}`),
        apiRequest(`/api/public/service-detail/${businessId}/${bookingData.serviceId}`),
      ]);

      setBusiness(pageRes.business || pageRes.settings || null);
      setService(serviceRes.service || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPage(false);
    }
  }

  async function handleConfirm() {
    if (!booking) return;
    try {
      setSubmitting(true);
      setError("");

      const res = await apiRequest(`/api/public/bookings/${businessId}`, {
        method: "POST",
        body: JSON.stringify({
          serviceId: booking.serviceId,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          vehiclePlate: booking.vehiclePlate,
          vehicleModel: booking.vehicleModel,
          vehicleColor: booking.vehicleColor,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime || null,
          scheduledPeriod: booking.scheduledPeriod || null,
        }),
      });

      sessionStorage.removeItem(`primegarage_booking_${businessId}`);
      setOrderId(res.orderId);
      setConfirmed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
    return `${weekday}, ${d}/${m}/${y}`;
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatPhone(raw) {
    const n = String(raw || "").replace(/\D/g, "");
    if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return n;
  }

  useEffect(() => { loadPage(); }, []);

  const businessName = business?.name || business?.customerPageName || "Lava-jato";
  const businessLogo = business?.logoUrl || business?.customerPageLogoUrl;

  if (loadingPage) {
    return (
      <main className="cc-page">
        <section className="cc-loading">
          <div className="cc-spinner" />
          <p>Carregando...</p>
        </section>
      </main>
    );
  }

  /* ── TELA DE SUCESSO ─────────────────────── */
  if (confirmed) {
    return (
      <main className="cc-page">
        <section className="cc-app">
          <section className="cc-hero cc-hero--compact">
            <div className="cc-logo">
              {businessLogo
                ? <img src={businessLogo} alt={`Logo ${businessName}`} />
                : <strong>{businessName.slice(0, 1)}</strong>}
            </div>
            <span className="cc-business">{businessName}</span>
          </section>

          <section className="cc-card">
            <div className="cc-check-wrap">
              <div className="cc-check-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <div className="cc-confirmed-text">
              <strong>Agendamento confirmado!</strong>
              <span>Seu agendamento foi realizado com sucesso.</span>
            </div>

            <div className="cc-protocol">
              <span className="cc-protocol-label">Protocolo</span>
              <span className="cc-protocol-number">#{String(orderId).padStart(5, "0")}</span>
            </div>

            <div className="cc-divider" />

            <div className="cc-row">
              <span className="cc-row-label">Serviço</span>
              <span className="cc-row-value">{service?.name || "—"}</span>
            </div>
            <div className="cc-row">
              <span className="cc-row-label">Data</span>
              <span className="cc-row-value">{formatDate(booking?.scheduledDate)}</span>
            </div>
            {booking?.scheduledTime && (
              <div className="cc-row">
                <span className="cc-row-label">Horário</span>
                <span className="cc-row-value">{booking.scheduledTime}</span>
              </div>
            )}
            {booking?.scheduledPeriod && (
              <div className="cc-row">
                <span className="cc-row-label">Turno</span>
                <span className="cc-row-value">{PERIOD_LABELS[booking.scheduledPeriod]}</span>
              </div>
            )}
          </section>

          <button
            type="button"
            className="cc-btn"
            onClick={() => (window.location.href = `/agendar/${businessId}`)}
          >
            Voltar ao início
          </button>

          <footer className="cc-footer">
            Todos os direitos reservados a {businessName}.
          </footer>
        </section>
      </main>
    );
  }

  /* ── TELA DE REVISÃO ─────────────────────── */
  return (
    <main className="cc-page">
      <section className="cc-app">
        <section className="cc-hero">
          <button
            type="button"
            className="cc-back"
            onClick={() => window.history.back()}
            aria-label="Voltar"
          >
            ‹
          </button>
          <div className="cc-logo">
            {businessLogo
              ? <img src={businessLogo} alt={`Logo ${businessName}`} />
              : <strong>{businessName.slice(0, 1)}</strong>}
          </div>
          <span className="cc-business">{businessName}</span>
          <h1>Revisar agendamento</h1>
        </section>

        {error && <div className="cc-error">{error}</div>}

        <section className="cc-card">
          {/* Serviço */}
          <div className="cc-row cc-row--between">
            <div className="cc-info-stack">
              <span className="cc-info-label">Serviço</span>
              <span className="cc-info-value cc-info-value--strong">{service?.name || "—"}</span>
            </div>
            <span className="cc-price">{formatMoney(service?.price)}</span>
          </div>

          <div className="cc-divider" />

          {/* Data e horário */}
          <div className="cc-row cc-row--between">
            <div className="cc-info-stack">
              <span className="cc-info-label">Data</span>
              <span className="cc-info-value">{formatDate(booking?.scheduledDate)}</span>
            </div>
            {booking?.scheduledTime && (
              <div className="cc-info-stack cc-info-stack--right">
                <span className="cc-info-label">Horário</span>
                <span className="cc-info-value cc-info-value--strong">{booking.scheduledTime}</span>
              </div>
            )}
            {booking?.scheduledPeriod && (
              <div className="cc-info-stack cc-info-stack--right">
                <span className="cc-info-label">Turno</span>
                <span className="cc-info-value cc-info-value--strong">
                  {PERIOD_LABELS[booking.scheduledPeriod]}
                </span>
              </div>
            )}
          </div>

          <div className="cc-divider" />

          {/* Veículo */}
          <div className="cc-row cc-row--between">
            <div className="cc-info-stack">
              <span className="cc-info-label">Veículo</span>
              <span className="cc-info-value">
                {booking?.vehicleModel || "—"}{booking?.vehicleColor ? ` · ${booking.vehicleColor}` : ""}
              </span>
            </div>
            <span className="cc-plate-chip">{booking?.vehiclePlate || "—"}</span>
          </div>

          <div className="cc-divider" />

          {/* Cliente */}
          <div className="cc-row cc-row--between">
            <div className="cc-info-stack">
              <span className="cc-info-label">Cliente</span>
              <span className="cc-info-value cc-info-value--strong">{booking?.customerName || "—"}</span>
              <span className="cc-info-sub">{formatPhone(booking?.customerPhone)}</span>
            </div>
          </div>
        </section>

        <button
          type="button"
          className={`cc-btn${submitting ? " cc-btn--loading" : ""}`}
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? "Confirmando..." : "Confirmar agendamento"}
        </button>

        <div className="cc-step">Etapa 5 de 5</div>

        <footer className="cc-footer">
          Todos os direitos reservados a {businessName}.
        </footer>
      </section>
    </main>
  );
}

export default ClienteConfirmacao;
