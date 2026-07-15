import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./clienteAgenda.css";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ClienteAgenda() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const businessId = pathParts[1];
  const serviceId = new URLSearchParams(window.location.search).get("servico");

  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [availability, setAvailability] = useState({});
  const [blockReasons, setBlockReasons] = useState({});
  const [blockModal, setBlockModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [daySlots, setDaySlots] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  async function loadPage() {
    try {
      setLoadingPage(true);
      const [pageRes, settingsRes] = await Promise.all([
        apiRequest(`/api/public/customer-page/${businessId}`),
        apiRequest(`/api/public/schedule-settings/${businessId}`),
      ]);
      setBusiness(pageRes.business || pageRes.settings || null);
      setSettings(settingsRes.settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPage(false);
    }
  }

  async function loadMonthAvailability(year, month) {
    try {
      setLoadingDays(true);
      setError("");
      const res = await apiRequest(
        `/api/public/schedule-availability/${businessId}?year=${year}&month=${month}`,
      );
      setAvailability(res.days || {});
      setBlockReasons(res.blockReasons || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDays(false);
    }
  }

  async function loadDaySlots(date) {
    try {
      setLoadingSlots(true);
      setError("");
      const res = await apiRequest(
        `/api/public/schedule-slots/${businessId}?date=${date}`,
      );
      setDaySlots(res);
    } catch (err) {
      setError(err.message);
      setDaySlots(null);
    } finally {
      setLoadingSlots(false);
    }
  }

  function prevMonth() {
    if (viewYear === now.getFullYear() && viewMonth <= now.getMonth() + 1)
      return;
    const newMonth = viewMonth === 1 ? 12 : viewMonth - 1;
    const newYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    setViewYear(newYear);
    setViewMonth(newMonth);
    clearSelection();
  }

  function nextMonth() {
    const newMonth = viewMonth === 12 ? 1 : viewMonth + 1;
    const newYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    setViewYear(newYear);
    setViewMonth(newMonth);
    clearSelection();
  }

  function clearSelection() {
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedPeriod(null);
    setDaySlots(null);
  }

  function handleDayClick(dateStr, status) {
    if (status === "blocked") {
      setBlockModal(blockReasons[dateStr] || "");
      return;
    }
    if (status !== "available") return;
    if (selectedDate === dateStr) {
      clearSelection();
      return;
    }
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setSelectedPeriod(null);
    setDaySlots(null);
    if (settings?.schedule_type !== "daily") {
      loadDaySlots(dateStr);
    }
  }

  function handleContinue() {
    if (!selectedDate) {
      setError("Selecione uma data.");
      return;
    }
    if (settings?.schedule_type === "time_slots" && !selectedSlot) {
      setError("Selecione um horário.");
      return;
    }
    if (settings?.schedule_type === "periods" && !selectedPeriod) {
      setError("Selecione um turno.");
      return;
    }

    const raw = sessionStorage.getItem(`primegarage_booking_${businessId}`);
    if (!raw) {
      setError(
        "Dados do agendamento não encontrados. Volte e tente novamente.",
      );
      return;
    }

    const bookingData = JSON.parse(raw);
    bookingData.scheduledDate = selectedDate;
    if (selectedSlot) bookingData.scheduledTime = selectedSlot;
    if (selectedPeriod) bookingData.scheduledPeriod = selectedPeriod;

    sessionStorage.setItem(
      `primegarage_booking_${businessId}`,
      JSON.stringify(bookingData),
    );

    window.location.href = `/agendar/${businessId}/confirmacao?servico=${serviceId}`;
  }

  function buildCalendarCells() {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
    const cells = Array(firstWeekday).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        dateStr,
        status: availability[dateStr] || "unavailable",
      });
    }

    return cells;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!loadingPage) loadMonthAvailability(viewYear, viewMonth);
  }, [viewYear, viewMonth, loadingPage]);

  const isPrevDisabled =
    viewYear === now.getFullYear() && viewMonth <= now.getMonth() + 1;

  const canContinue =
    !!selectedDate &&
    (settings?.schedule_type === "daily" ||
      (settings?.schedule_type === "time_slots" && !!selectedSlot) ||
      (settings?.schedule_type === "periods" && !!selectedPeriod));

  const businessName =
    business?.name || business?.customerPageName || "Lava-jato";
  const businessLogo = business?.logoUrl || business?.customerPageLogoUrl;

  if (loadingPage) {
    return (
      <main className="ca-page">
        <section className="ca-loading">
          <div className="ca-spinner"></div>
          <p>Carregando agenda...</p>
        </section>
      </main>
    );
  }

  const cells = buildCalendarCells();

  return (
    <main className="ca-page">
      {blockModal !== null && (
        <div className="ca-block-overlay" onClick={() => setBlockModal(null)}>
          <section
            className="ca-block-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <strong>Dia indisponível</strong>
            <p>
              {blockModal || "Este dia não está disponível para agendamentos."}
            </p>
            <button type="button" onClick={() => setBlockModal(null)}>
              Entendido
            </button>
          </section>
        </div>
      )}

      <section className="ca-app">
        <section className="ca-hero">
          <button
            type="button"
            className="ca-back"
            onClick={() => window.history.back()}
            aria-label="Voltar"
          >
            ‹
          </button>

          <div className="ca-logo">
            {businessLogo ? (
              <img src={businessLogo} alt={`Logo ${businessName}`} />
            ) : (
              <strong>{businessName.slice(0, 1)}</strong>
            )}
          </div>

          <span className="ca-business">{businessName}</span>
          <h1>Escolha a data</h1>
        </section>

        <section className="ca-card">
          {error && <div className="ca-error">{error}</div>}

          <div className="ca-month-nav">
            <button
              type="button"
              onClick={prevMonth}
              disabled={isPrevDisabled}
              aria-label="Mês anterior"
              className="ca-month-btn"
            >
              ‹
            </button>
            <strong className="ca-month-label">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </strong>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="ca-month-btn"
            >
              ›
            </button>
          </div>

          <div className="ca-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div
            className={`ca-day-grid${loadingDays ? " ca-day-grid--loading" : ""}`}
          >
            {cells.map((cell, i) => {
              if (!cell) {
                return <div key={`e${i}`} className="ca-day-empty" />;
              }

              const isSelected = selectedDate === cell.dateStr;
              const isToday = cell.dateStr === todayStr;
              const { status } = cell;

              const classList = [
                "ca-day",
                `ca-day--${status}`,
                isSelected ? "ca-day--selected" : "",
                isToday && !isSelected ? "ca-day--today" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  className={classList}
                  onClick={() => handleDayClick(cell.dateStr, status)}
                  disabled={status !== "available" && status !== "blocked"}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </section>

        {selectedDate && settings?.schedule_type === "daily" && (
          <section className="ca-daily-card">
            <span className="ca-daily-text">
              Data selecionada:{" "}
              <strong>{formatDateDisplay(selectedDate)}</strong>
            </span>
          </section>
        )}

        {selectedDate && settings?.schedule_type === "time_slots" && (
          <section className="ca-slots-card">
            <div className="ca-slots-header">
              <strong>Escolha o horário</strong>
              <span>{formatDateDisplay(selectedDate)}</span>
            </div>

            {loadingSlots && (
              <div className="ca-slots-loading">
                <div className="ca-spinner ca-spinner--small"></div>
              </div>
            )}

            {!loadingSlots && daySlots?.type === "time_slots" && (
              <>
                {daySlots.slots.length === 0 && (
                  <p className="ca-slots-empty">
                    Nenhum horário disponível neste dia.
                  </p>
                )}
                <div className="ca-time-grid">
                  {daySlots.slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      className={[
                        "ca-time-slot",
                        !slot.available ? "ca-time-slot--full" : "",
                        selectedSlot === slot.time
                          ? "ca-time-slot--selected"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        slot.available && setSelectedSlot(slot.time)
                      }
                      disabled={!slot.available}
                    >
                      {slot.time}
                      {!slot.available && (
                        <span className="ca-slot-badge">Lotado</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {selectedDate && settings?.schedule_type === "periods" && (
          <section className="ca-slots-card">
            <div className="ca-slots-header">
              <div>
                <strong>Escolha o turno</strong>
                <p className="ca-slots-subtitle">
                  Escolha o turno que você irá deixar o veículo.
                </p>
              </div>
              <span>{formatDateDisplay(selectedDate)}</span>
            </div>

            {loadingSlots && (
              <div className="ca-slots-loading">
                <div className="ca-spinner ca-spinner--small"></div>
              </div>
            )}

            {!loadingSlots && daySlots?.type === "periods" && (
              <div className="ca-period-list">
                {daySlots.periods.map((p) => (
                  <button
                    key={p.period}
                    type="button"
                    className={[
                      "ca-period",
                      !p.available ? "ca-period--full" : "",
                      selectedPeriod === p.period ? "ca-period--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => p.available && setSelectedPeriod(p.period)}
                    disabled={!p.available}
                  >
                    <span className="ca-period-label">{p.label}</span>
                    {!p.available && (
                      <span className="ca-period-badge">Lotado</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          className="ca-next-button"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          Continuar
        </button>

        <div className="ca-step">Etapa 4 de 5</div>

        <footer className="ca-footer">
          Todos os direitos reservados a {businessName}.
        </footer>
      </section>
    </main>
  );
}

export default ClienteAgenda;
