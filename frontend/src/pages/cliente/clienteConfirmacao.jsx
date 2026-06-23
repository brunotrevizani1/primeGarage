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

function IcnService() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  );
}
function IcnCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IcnClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IcnSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function IcnCar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11L7.5 5h9L19 11"/>
      <rect x="2" y="11" width="20" height="7" rx="2"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
    </svg>
  );
}
function IcnPlate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="22" height="12" rx="2"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IcnUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

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
          <section className="cc-hero">
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

            <div className="cc-detail-row">
              <div className="cc-detail-icon"><IcnService /></div>
              <div className="cc-detail-text">
                <span className="cc-detail-main">{service?.name || "—"}</span>
              </div>
            </div>
            <div className="cc-detail-row">
              <div className="cc-detail-icon"><IcnCalendar /></div>
              <div className="cc-detail-text">
                <span className="cc-detail-main">{formatDate(booking?.scheduledDate)}</span>
              </div>
            </div>
            {booking?.scheduledTime && (
              <div className="cc-detail-row">
                <div className="cc-detail-icon"><IcnClock /></div>
                <div className="cc-detail-text">
                  <span className="cc-detail-main">{booking.scheduledTime}</span>
                </div>
              </div>
            )}
            {booking?.scheduledPeriod && (
              <div className="cc-detail-row">
                <div className="cc-detail-icon"><IcnSun /></div>
                <div className="cc-detail-text">
                  <span className="cc-detail-main">{PERIOD_LABELS[booking.scheduledPeriod]}</span>
                </div>
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
          <div className="cc-detail-row">
            <div className="cc-detail-icon"><IcnService /></div>
            <div className="cc-detail-text">
              <span className="cc-detail-main">{service?.name || "—"}</span>
              <span className="cc-detail-sub">{formatMoney(service?.price)}</span>
            </div>
          </div>

          <div className="cc-divider" />

          <div className="cc-detail-row">
            <div className="cc-detail-icon"><IcnCalendar /></div>
            <div className="cc-detail-text">
              <span className="cc-detail-main">{formatDate(booking?.scheduledDate)}</span>
            </div>
          </div>

          {booking?.scheduledTime && (
            <>
              <div className="cc-divider" />
              <div className="cc-detail-row">
                <div className="cc-detail-icon"><IcnClock /></div>
                <div className="cc-detail-text">
                  <span className="cc-detail-main">{booking.scheduledTime}</span>
                </div>
              </div>
            </>
          )}
          {booking?.scheduledPeriod && (
            <>
              <div className="cc-divider" />
              <div className="cc-detail-row">
                <div className="cc-detail-icon"><IcnSun /></div>
                <div className="cc-detail-text">
                  <span className="cc-detail-main">{PERIOD_LABELS[booking.scheduledPeriod]}</span>
                </div>
              </div>
            </>
          )}

          <div className="cc-divider" />

          <div className="cc-detail-row">
            <div className="cc-detail-icon"><IcnCar /></div>
            <div className="cc-detail-text">
              <span className="cc-detail-main">
                {booking?.vehicleModel || "—"}{booking?.vehicleColor ? ` · ${booking.vehicleColor}` : ""}
              </span>
            </div>
          </div>

          <div className="cc-divider" />

          <div className="cc-detail-row">
            <div className="cc-detail-icon"><IcnPlate /></div>
            <div className="cc-detail-text">
              <span className="cc-detail-main">{booking?.vehiclePlate || "—"}</span>
            </div>
          </div>

          <div className="cc-divider" />

          <div className="cc-detail-row">
            <div className="cc-detail-icon"><IcnUser /></div>
            <div className="cc-detail-text">
              <span className="cc-detail-main">{booking?.customerName || "—"}</span>
              <span className="cc-detail-sub">{formatPhone(booking?.customerPhone)}</span>
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
