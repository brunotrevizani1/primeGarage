import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./agenda.css";

const weekDays = [
  { weekday: 0, label: "Domingo" },
  { weekday: 1, label: "Segunda-feira" },
  { weekday: 2, label: "Terça-feira" },
  { weekday: 3, label: "Quarta-feira" },
  { weekday: 4, label: "Quinta-feira" },
  { weekday: 5, label: "Sexta-feira" },
  { weekday: 6, label: "Sábado" },
];

function toBoolean(value) {
  return value === true || value === 1 || value === "1";
}

function getInitialAgendaTab() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");

  return tab === "blocks" ? "blocks" : "hours";
}

function Agenda() {
  const [workingHours, setWorkingHours] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(true);
  const [activeAgendaTab, setActiveAgendaTab] = useState(getInitialAgendaTab());

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());

  const [blockForm, setBlockForm] = useState({
    block_date: "",
    is_full_day: true,
    start_time: "",
    end_time: "",
    reason: "",
  });

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canEditAgenda = hasPermission("editar_agenda", userPermissions);

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

  function changeAgendaTab(tab) {
    setActiveAgendaTab(tab);
    setMenuOpen(false);
    window.history.replaceState(null, "", `/agenda?tab=${tab}`);
  }
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

    if (permissions.includes("ver_agenda")) {
      return "/agenda";
    }

    if (permissions.includes("ver_servicos")) {
      return "/servicos";
    }

    if (permissions.includes("ver_equipe")) {
      return "/equipe";
    }

    return "/";
  }

  function updateWorkingHour(weekday, field, value) {
    setWorkingHours((currentHours) =>
      currentHours.map((day) =>
        Number(day.weekday) === Number(weekday)
          ? {
              ...day,
              [field]: value,
            }
          : day,
      ),
    );
  }

  function updateBlockField(field, value) {
    setBlockForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function formatDate(date) {
    if (!date) return "";

    const [year, month, day] = date.split("-");

    return `${day}/${month}/${year}`;
  }

  function formatBlockTime(block) {
    if (toBoolean(block.is_full_day)) {
      return "Dia inteiro";
    }

    return `${block.start_time} até ${block.end_time}`;
  }

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/";
    }
  }

  async function loadAgenda() {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();

      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";

      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const canAccessAgenda =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("ver_agenda");

      if (!canAccessAgenda) {
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const workingHoursResponse = await apiRequest(
        "/api/schedule/working-hours",
      );

      const blocksResponse = await apiRequest("/api/schedule/blocks");

      setWorkingHours(workingHoursResponse.workingHours || []);
      setBlocks(blocksResponse.blocks || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveWorkingHours() {
    if (!canEditAgenda) {
      setError("Você não possui permissão para editar a agenda.");
      return;
    }

    try {
      setSavingHours(true);
      setError("");

      await apiRequest("/api/schedule/working-hours", {
        method: "PUT",
        body: JSON.stringify({
          workingHours,
        }),
      });

      await loadAgenda();
    } catch (error) {
      setError(error.message);
    } finally {
      setSavingHours(false);
    }
  }

  async function createBlock(event) {
    event.preventDefault();

    if (!canEditAgenda) {
      setError("Você não possui permissão para criar bloqueios.");
      return;
    }

    if (!blockForm.block_date) {
      setError("Informe a data do bloqueio.");
      return;
    }

    if (
      !blockForm.is_full_day &&
      (!blockForm.start_time || !blockForm.end_time)
    ) {
      setError("Informe o horário inicial e final do bloqueio.");
      return;
    }

    try {
      setSavingBlock(true);
      setError("");

      await apiRequest("/api/schedule/blocks", {
        method: "POST",
        body: JSON.stringify(blockForm),
      });

      setBlockForm({
        block_date: "",
        is_full_day: true,
        start_time: "",
        end_time: "",
        reason: "",
      });

      await loadAgenda();
    } catch (error) {
      setError(error.message);
    } finally {
      setSavingBlock(false);
    }
  }

  async function deleteBlock(blockId) {
    if (!canEditAgenda) {
      setError("Você não possui permissão para remover bloqueios.");
      return;
    }

    const confirmDelete = window.confirm("Deseja remover este bloqueio?");

    if (!confirmDelete) return;

    try {
      setError("");

      await apiRequest(`/api/schedule/blocks/${blockId}`, {
        method: "DELETE",
      });

      await loadAgenda();
    } catch (error) {
      setError(error.message);
    }
  }

  useEffect(() => {
    loadAgenda();
  }, []);

  if (loading) {
    return (
      <main className="agenda-page">
        <section className="agenda-loading">
          <div className="loading-circle"></div>
          <p>Carregando agenda...</p>
        </section>
      </main>
    );
  }

  const isFullDayBlock = toBoolean(blockForm.is_full_day);

  return (
    <main className="agenda-page">
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
              {canViewDashboard && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  Dashboard
                </button>
              )}

              {canViewQueue && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/atendimentos")}
                >
                  Atendimentos
                </button>
              )}

              {canViewAgenda && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button active"
                    onClick={() => setAgendaMenuOpen(!agendaMenuOpen)}
                  >
                    <span>Agenda</span>

                    <svg
                      className={
                        agendaMenuOpen ? "submenu-arrow open" : "submenu-arrow"
                      }
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>

                  {agendaMenuOpen && (
                    <div className="submenu-links">
                      <button
                        type="button"
                        className={activeAgendaTab === "hours" ? "active" : ""}
                        onClick={() => changeAgendaTab("hours")}
                      >
                        Horários de funcionamento
                      </button>

                      <button
                        type="button"
                        className={activeAgendaTab === "blocks" ? "active" : ""}
                        onClick={() => changeAgendaTab("blocks")}
                      >
                        Bloqueios de agenda
                      </button>
                    </div>
                  )}
                </div>
              )}

              {canViewTeam && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/equipe")}
                >
                  Equipe
                </button>
              )}

              {canViewServices && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setServicesMenuOpen(!servicesMenuOpen)}
                  >
                    <span>Serviços</span>

                    <svg
                      className={
                        servicesMenuOpen
                          ? "submenu-arrow open"
                          : "submenu-arrow"
                      }
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>

                  {servicesMenuOpen && (
                    <div className="submenu-links">
                      <button
                        type="button"
                        onClick={() => (window.location.href = "/servicos")}
                      >
                        Lista de serviços
                      </button>

                      {canViewCategories && (
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href = "/categorias-servicos")
                          }
                        >
                          Categorias
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {canViewFinance && <button type="button">Financeiro</button>}

              {canViewFinance && <button type="button">Configurações</button>}
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

      <section className="agenda-container">
        <header className="agenda-header">
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
            <h1>Agenda</h1>
            <p>Configure funcionamento e bloqueios</p>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={loadAgenda}
            aria-label="Atualizar agenda"
          >
            ↻
          </button>
        </header>

        {error && <div className="agenda-error">{error}</div>}

        {activeAgendaTab === "hours" && (
          <section className="agenda-section">
            <div className="section-heading">
              <div>
                <h2>Horários de funcionamento</h2>
                <p>Defina os horários de cada dia da semana.</p>
              </div>
            </div>

            <div className="working-hours-list">
              {weekDays.map((weekDay) => {
                const dayConfig = workingHours.find(
                  (item) => Number(item.weekday) === Number(weekDay.weekday),
                );

                if (!dayConfig) return null;

                const isOpen = toBoolean(dayConfig.is_open);
                const hasLunchBreak = toBoolean(dayConfig.has_lunch_break);

                return (
                  <article className="working-day-card" key={weekDay.weekday}>
                    <div className="working-day-header">
                      <div>
                        <strong>{weekDay.label}</strong>
                        <span>{isOpen ? "Aberto" : "Fechado"}</span>
                      </div>

                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          disabled={!canEditAgenda}
                          onChange={(event) =>
                            updateWorkingHour(
                              weekDay.weekday,
                              "is_open",
                              event.target.checked,
                            )
                          }
                        />
                        <span></span>
                      </label>
                    </div>

                    {isOpen && (
                      <>
                        <div className="time-grid">
                          <div className="form-group">
                            <label>Início</label>
                            <input
                              type="time"
                              value={dayConfig.open_time || ""}
                              disabled={!canEditAgenda}
                              onChange={(event) =>
                                updateWorkingHour(
                                  weekDay.weekday,
                                  "open_time",
                                  event.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label>Fim</label>
                            <input
                              type="time"
                              value={dayConfig.close_time || ""}
                              disabled={!canEditAgenda}
                              onChange={(event) =>
                                updateWorkingHour(
                                  weekDay.weekday,
                                  "close_time",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="lunch-row">
                          <label>
                            <input
                              type="checkbox"
                              checked={hasLunchBreak}
                              disabled={!canEditAgenda}
                              onChange={(event) =>
                                updateWorkingHour(
                                  weekDay.weekday,
                                  "has_lunch_break",
                                  event.target.checked,
                                )
                              }
                            />
                            Possui horário de almoço
                          </label>
                        </div>

                        {hasLunchBreak && (
                          <div className="time-grid">
                            <div className="form-group">
                              <label>Início almoço</label>
                              <input
                                type="time"
                                value={dayConfig.lunch_start || ""}
                                disabled={!canEditAgenda}
                                onChange={(event) =>
                                  updateWorkingHour(
                                    weekDay.weekday,
                                    "lunch_start",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="form-group">
                              <label>Fim almoço</label>
                              <input
                                type="time"
                                value={dayConfig.lunch_end || ""}
                                disabled={!canEditAgenda}
                                onChange={(event) =>
                                  updateWorkingHour(
                                    weekDay.weekday,
                                    "lunch_end",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>

            {canEditAgenda && (
              <button
                type="button"
                className="save-agenda-button"
                onClick={saveWorkingHours}
                disabled={savingHours}
              >
                {savingHours ? "Salvando..." : "Salvar horários"}
              </button>
            )}
          </section>
        )}

        {activeAgendaTab === "blocks" && (
          <section className="agenda-section">
            <div className="section-heading">
              <div>
                <h2>Bloqueios de agenda</h2>
                <p>Bloqueie dias inteiros ou horários específicos.</p>
              </div>
            </div>

            {canEditAgenda && (
              <form className="block-form" onSubmit={createBlock}>
                <div className="form-group">
                  <label>Data</label>
                  <input
                    type="date"
                    value={blockForm.block_date}
                    onChange={(event) =>
                      updateBlockField("block_date", event.target.value)
                    }
                  />
                </div>

                <div className="full-day-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={isFullDayBlock}
                      onChange={(event) =>
                        updateBlockField("is_full_day", event.target.checked)
                      }
                    />
                    Bloquear o dia inteiro
                  </label>
                </div>

                {!isFullDayBlock && (
                  <div className="time-grid">
                    <div className="form-group">
                      <label>Início</label>
                      <input
                        type="time"
                        value={blockForm.start_time}
                        onChange={(event) =>
                          updateBlockField("start_time", event.target.value)
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Fim</label>
                      <input
                        type="time"
                        value={blockForm.end_time}
                        onChange={(event) =>
                          updateBlockField("end_time", event.target.value)
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Motivo</label>
                  <input
                    type="text"
                    placeholder="Ex: Compromisso, manutenção, etc..."
                    value={blockForm.reason}
                    onChange={(event) =>
                      updateBlockField("reason", event.target.value)
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="save-block-button"
                  disabled={savingBlock}
                >
                  {savingBlock ? "Salvando..." : "Adicionar bloqueio"}
                </button>
              </form>
            )}

            {blocks.length === 0 ? (
              <div className="empty-blocks">
                <strong>Nenhum bloqueio cadastrado</strong>
                <p>Dias e horários bloqueados aparecerão aqui.</p>
              </div>
            ) : (
              <div className="blocks-list">
                {blocks.map((block) => (
                  <article className="block-card" key={block.id}>
                    <div>
                      <strong>{formatDate(block.block_date)}</strong>
                      <span>{formatBlockTime(block)}</span>
                      {block.reason && <p>{block.reason}</p>}
                    </div>

                    {canEditAgenda && (
                      <button
                        type="button"
                        onClick={() => deleteBlock(block.id)}
                        aria-label="Remover bloqueio"
                      >
                        ×
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

export default Agenda;
