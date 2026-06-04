import { useEffect, useState } from "react";
import MenuIcon from "../../components/MenuIcon";
import { apiRequest } from "../../services/api";
import {
  getSavedPermissions,
  getSavedRole,
  hasPermission,
  loadUserPermissions,
} from "../../services/permissions";
import "./equipe.css";

function Equipe() {
  const [employees, setEmployees] = useState([]);
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [userPermissions, setUserPermissions] = useState(getSavedPermissions());
  const [userRole, setUserRole] = useState(getSavedRole());
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    permissions: [],
  });

  const canManageSettings = hasPermission(
    "gerenciar_configuracoes",
    userPermissions,
  );

  const canViewDashboard = hasPermission("ver_dashboard", userPermissions);
  const canViewCustomers = hasPermission("ver_cliente", userPermissions);
  const canViewQueue = hasPermission("ver_fila", userPermissions);
  const canViewServices = hasPermission("ver_servicos", userPermissions);
  const canViewCategories = hasPermission("ver_categorias", userPermissions);
  const canViewTeam = hasPermission("ver_equipe", userPermissions);
  const canViewAgenda = hasPermission("ver_agenda", userPermissions);
  const canCreateEmployee = hasPermission("criar_funcionario", userPermissions);
  const canEditEmployee = hasPermission("editar_funcionario", userPermissions);
  const canDeleteEmployee = hasPermission(
    "excluir_funcionario",
    userPermissions,
  );

  const canViewFinance = userRole === "owner" || userRole === "super_admin";

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

  function handlePhoneChange(value) {
    updateField("phone", formatPhone(value));
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

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const permissionResponse = await loadUserPermissions();

      const currentPermissions = permissionResponse.permissions || [];
      const currentRole = permissionResponse.role || "";

      setUserPermissions(currentPermissions);
      setUserRole(currentRole);

      const canAccessTeam =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("ver_equipe");

      if (!canAccessTeam) {
        window.location.href = getFirstAllowedPath(
          currentPermissions,
          currentRole,
        );
        return;
      }

      const employeesResponse = await apiRequest("/api/team");

      setEmployees(employeesResponse.employees || []);

      const canAccessPermissions =
        currentRole === "owner" ||
        currentRole === "super_admin" ||
        currentPermissions.includes("criar_funcionario") ||
        currentPermissions.includes("editar_funcionario");

      if (canAccessPermissions) {
        const permissionsResponse = await apiRequest(
          "/api/team/permissions/list",
        );

        setPermissionOptions(permissionsResponse.permissions || []);
      } else {
        setPermissionOptions([]);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateEmployeeModal() {
    if (!canCreateEmployee) {
      setError("Você não possui permissão para criar funcionários.");
      return;
    }

    setEditingEmployee(null);
    setStep(1);
    setError("");
    setShowPassword(false);

    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      permissions: [],
    });

    setEmployeeModalOpen(true);
  }

  async function openEditEmployeeModal(employee) {
    if (!canEditEmployee) {
      setError("Você não possui permissão para editar funcionários.");
      return;
    }

    try {
      setEditingEmployee(employee);
      setStep(1);
      setError("");
      setShowPassword(false);

      let employeePermissions = [];

      if (canEditEmployee) {
        const permissionsResponse = await apiRequest(
          `/api/team/${employee.id}/permissions`,
        );

        employeePermissions = permissionsResponse.permissions || [];
      }

      setForm({
        name: employee.name || "",
        email: employee.email || "",
        phone: formatPhone(employee.phone || ""),
        password: "",
        permissions: employeePermissions,
      });

      setEmployeeModalOpen(true);
    } catch (error) {
      setError(error.message);
    }
  }

  function closeEmployeeModal() {
    setEmployeeModalOpen(false);
    setEditingEmployee(null);
    setStep(1);
    setError("");
  }

  function validateEmployeeData() {
    const missingFields = [];

    if (!form.name.trim()) {
      missingFields.push("nome");
    }

    if (!form.email.trim()) {
      missingFields.push("e-mail");
    }

    if (!form.phone.trim()) {
      missingFields.push("telefone");
    }

    if (!editingEmployee && !form.password.trim()) {
      missingFields.push("senha");
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

  function handleStepChange(nextStep) {
    if (nextStep === 1) {
      setError("");
      setStep(1);
      return;
    }

    const validationMessage = validateEmployeeData();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setStep(2);
  }

  function getParentPermission(permissionCode) {
    const parentPermissions = {
      criar_atendimento: "ver_fila",
      editar_atendimento: "ver_fila",
      alterar_status: "ver_fila",
      cancelar_atendimento: "ver_fila",

      criar_servico: "ver_servicos",
      editar_servico: "ver_servicos",
      excluir_servico: "ver_servicos",

      ver_categorias: "ver_servicos",
      criar_categoria: "ver_categorias",
      editar_categoria: "ver_categorias",
      excluir_categoria: "ver_categorias",

      criar_funcionario: "ver_equipe",
      editar_funcionario: "ver_equipe",
      excluir_funcionario: "ver_equipe",
    };

    return parentPermissions[permissionCode] || null;
  }

  function hasChildPermission(parentPermissionCode, selectedPermissions) {
    const childPermissions = {
      ver_fila: [
        "criar_atendimento",
        "editar_atendimento",
        "alterar_status",
        "cancelar_atendimento",
      ],

      ver_cliente: ["editar_cliente"],

      ver_agenda: ["editar_agenda"],

      ver_servicos: [
        "criar_servico",
        "editar_servico",
        "excluir_servico",
        "ver_categorias",
        "criar_categoria",
        "editar_categoria",
        "excluir_categoria",
      ],

      ver_categorias: [
        "criar_categoria",
        "editar_categoria",
        "excluir_categoria",
      ],

      ver_equipe: [
        "criar_funcionario",
        "editar_funcionario",
        "excluir_funcionario",
      ],
    };

    return (childPermissions[parentPermissionCode] || []).some(
      (permissionCode) => selectedPermissions.includes(permissionCode),
    );
  }

  function getPermissionDependencies(permissionCode) {
    const dependencies = {
      criar_atendimento: ["ver_fila"],
      editar_atendimento: ["ver_fila"],
      alterar_status: ["ver_fila"],
      cancelar_atendimento: ["ver_fila"],

      editar_agenda: ["ver_agenda"],

      editar_cliente: ["ver_cliente"],

      criar_servico: ["ver_servicos"],
      editar_servico: ["ver_servicos"],
      excluir_servico: ["ver_servicos"],

      ver_categorias: ["ver_servicos"],
      criar_categoria: ["ver_categorias", "ver_servicos"],
      editar_categoria: ["ver_categorias", "ver_servicos"],
      excluir_categoria: ["ver_categorias", "ver_servicos"],

      criar_funcionario: ["ver_equipe"],
      editar_funcionario: ["ver_equipe"],
      excluir_funcionario: ["ver_equipe"],
    };

    return dependencies[permissionCode] || [];
  }

  function togglePermission(permissionCode) {
    setForm((currentForm) => {
      const permissionsSet = new Set(currentForm.permissions);

      if (permissionsSet.has(permissionCode)) {
        permissionsSet.delete(permissionCode);

        if (permissionCode === "ver_agenda") {
          permissionsSet.delete("editar_agenda");
        }

        if (permissionCode === "ver_cliente") {
          permissionsSet.delete("editar_cliente");
        }
      } else {
        permissionsSet.add(permissionCode);

        const dependencies = getPermissionDependencies(permissionCode);

        dependencies.forEach((dependency) => {
          permissionsSet.add(dependency);
        });
      }

      return {
        ...currentForm,
        permissions: Array.from(permissionsSet),
      };
    });
  }

  function isPermissionLocked(permissionCode) {
    return hasChildPermission(permissionCode, form.permissions);
  }

  function getPermissionOrder(permissionCode) {
    const order = {
      ver_dashboard: 1,

      ver_fila: 1,
      criar_atendimento: 2,
      editar_atendimento: 3,
      alterar_status: 4,
      cancelar_atendimento: 5,

      ver_cliente: 1,
      editar_cliente: 2,

      ver_agenda: 1,
      editar_agenda: 2,

      ver_servicos: 1,
      criar_servico: 2,
      editar_servico: 3,
      excluir_servico: 4,

      ver_categorias: 5,
      criar_categoria: 6,
      editar_categoria: 7,
      excluir_categoria: 8,

      ver_equipe: 1,
      criar_funcionario: 2,
      editar_funcionario: 3,
      excluir_funcionario: 4,
    };

    return order[permissionCode] || 99;
  }

  function groupPermissions() {
    return permissionOptions.reduce((groups, permission) => {
      if (!groups[permission.group_name]) {
        groups[permission.group_name] = [];
      }

      groups[permission.group_name].push(permission);

      Object.keys(groups).forEach((groupName) => {
        groups[groupName].sort(
          (a, b) => getPermissionOrder(a.code) - getPermissionOrder(b.code),
        );
      });

      return groups;
    }, {});
  }

  async function saveEmployee(event) {
    event.preventDefault();

    if (!editingEmployee && !canCreateEmployee) {
      setError("Você não possui permissão para criar funcionários.");
      return;
    }

    if (editingEmployee && !canEditEmployee) {
      setError("Você não possui permissão para editar funcionários.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: onlyNumbers(form.phone),
        password: form.password.trim(),
        permissions: form.permissions,
      };

      if (editingEmployee) {
        await apiRequest(`/api/team/${editingEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            password: payload.password,
          }),
        });

        await apiRequest(`/api/team/${editingEmployee.id}/permissions`, {
          method: "PUT",
          body: JSON.stringify({
            permissions: payload.permissions,
          }),
        });
      } else {
        await apiRequest("/api/team", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await loadData();
      closeEmployeeModal();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    if (!canDeleteEmployee) {
      setError("Você não possui permissão para excluir funcionários.");
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir "${employee.name}" da equipe?`,
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setError("");

      await apiRequest(`/api/team/${employee.id}/delete`, {
        method: "PATCH",
      });

      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const permissionGroups = groupPermissions();
  const canOpenPermissions = validateEmployeeData() === "";

  if (loading) {
    return (
      <main className="team-page">
        <section className="team-loading">
          <div className="loading-circle"></div>
          <p>Carregando equipe...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="team-page">
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
                  <MenuIcon name="dashboard" />
                  <span>Dashboard</span>
                </button>
              )}

              {canViewQueue && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/atendimentos")}
                >
                  <MenuIcon name="attendance" />
                  <span>Atendimentos</span>
                </button>
              )}

              {canViewFinance && (
                <button type="button">
                  <MenuIcon name="finance" />
                  <span>Financeiro</span>
                </button>
              )}

              {canViewCustomers && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/clientes")}
                >
                  <MenuIcon name="customers" />
                  <span>Clientes</span>
                </button>
              )}

              {canViewTeam && (
                <button className="active" type="button">
                  <MenuIcon name="team" />
                  <span>Equipe</span>
                </button>
              )}

              {canViewAgenda && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setAgendaMenuOpen(!agendaMenuOpen)}
                  >
                    <MenuIcon name="agenda" />
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
                        onClick={() =>
                          (window.location.href = "/agenda?tab=hours")
                        }
                      >
                        <MenuIcon name="schedule" />
                        <span>Horários de funcionamento</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/agenda?tab=blocks")
                        }
                      >
                        <MenuIcon name="blocks" />
                        <span>Bloqueios de agenda</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {canViewServices && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setServicesMenuOpen(!servicesMenuOpen)}
                  >
                    <MenuIcon name="services" />
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
                        <MenuIcon name="services" />
                        <span>Lista de serviços</span>
                      </button>

                      {canViewCategories && (
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href = "/categorias-servicos")
                          }
                        >
                          <MenuIcon name="categories" />
                          <span>Categorias</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {canManageSettings && (
                <div className="menu-group">
                  <button
                    type="button"
                    className="menu-parent-button"
                    onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                  >
                    <MenuIcon name="settings" />
                    <span>Configurações</span>

                    <svg
                      className={
                        settingsMenuOpen
                          ? "submenu-arrow open"
                          : "submenu-arrow"
                      }
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </button>

                  {settingsMenuOpen && (
                    <div className="submenu-links">
                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/configuracoes?tab=initial")
                        }
                      >
                        <MenuIcon name="info" />
                        <span>Informações iniciais</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/configuracoes?tab=location")
                        }
                      >
                        <MenuIcon name="location" />
                        <span>Localização</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
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

      {employeeModalOpen && (
        <div className="team-modal-overlay" onClick={closeEmployeeModal}>
          <section
            className="team-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <strong>
                  {editingEmployee ? "Editar funcionário" : "Novo funcionário"}
                </strong>
                <p>
                  {step === 1
                    ? "Informe os dados de acesso."
                    : "Escolha o que esse funcionário pode acessar."}
                </p>
              </div>

              <button type="button" onClick={closeEmployeeModal}>
                ×
              </button>
            </div>

            <div className="steps-indicator">
              <button
                type="button"
                className={step === 1 ? "active" : ""}
                onClick={() => handleStepChange(1)}
              >
                Dados
              </button>

              <button
                type="button"
                className={step === 2 ? "active" : ""}
                onClick={() => handleStepChange(2)}
                disabled={!canOpenPermissions}
              >
                Permissões
              </button>
            </div>

            {error && <div className="team-error">{error}</div>}

            <form
              className="team-form"
              onSubmit={saveEmployee}
              autoComplete="off"
            >
              {step === 1 && (
                <>
                  <div className="form-group">
                    <label>Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: João Silva"
                      value={form.name}
                      autoComplete="off"
                      name="employee_name"
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>E-mail</label>
                    <input
                      type="email"
                      placeholder="nome@email.com"
                      value={form.email}
                      autoComplete="off"
                      name="employee_email"
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      type="text"
                      placeholder="(51) 99999-9999"
                      value={form.phone}
                      autoComplete="off"
                      name="employee_phone"
                      onChange={(event) =>
                        handlePhoneChange(event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      {editingEmployee ? "Nova senha opcional" : "Senha"}
                    </label>

                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          editingEmployee
                            ? "Deixe em branco para manter"
                            : "Digite uma senha"
                        }
                        value={form.password}
                        autoComplete="new-password"
                        name="employee_new_password"
                        onChange={(event) =>
                          updateField("password", event.target.value)
                        }
                      />

                      <button
                        type="button"
                        className="password-eye-button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Ocultar senha" : "Mostrar senha"
                        }
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                            <path
                              d="M4 4l16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    className="save-team-button"
                    type="button"
                    disabled={!canOpenPermissions}
                    onClick={() => handleStepChange(2)}
                  >
                    Avançar
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="permissions-list">
                    {Object.entries(permissionGroups).map(
                      ([groupName, groupPermissions]) => (
                        <div className="permission-group" key={groupName}>
                          <h3>{groupName}</h3>

                          <div className="permission-options">
                            {groupPermissions.map((permission) => (
                              <label
                                className="permission-option"
                                key={permission.code}
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.includes(
                                    permission.code,
                                  )}
                                  disabled={isPermissionLocked(permission.code)}
                                  onChange={() =>
                                    togglePermission(permission.code)
                                  }
                                />

                                <span>{permission.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="back-step-button"
                      onClick={() => handleStepChange(1)}
                    >
                      Voltar
                    </button>

                    <button
                      className="save-team-button"
                      type="submit"
                      disabled={saving}
                    >
                      {saving
                        ? "Salvando..."
                        : editingEmployee
                          ? "Salvar alterações"
                          : "Criar funcionário"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </section>
        </div>
      )}

      <section className="team-container">
        <header className="team-header">
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
            <h1>Equipe</h1>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={loadData}
            aria-label="Atualizar equipe"
          >
            ↻
          </button>
        </header>

        {error && !employeeModalOpen && (
          <div className="team-error">{error}</div>
        )}

        <section className="team-list-section">
          <div className="panel-header">
            <div>
              <small>Funcionários cadastrados</small>
              <h2>{employees.length} funcionários</h2>
            </div>

            {canCreateEmployee && (
              <button
                className="add-team-icon-button"
                type="button"
                onClick={openCreateEmployeeModal}
                aria-label="Adicionar funcionário"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            )}
          </div>

          {employees.length === 0 ? (
            <div className="empty-team">
              <strong>Nenhum funcionário cadastrado</strong>
              <p>Adicione funcionários e configure suas permissões.</p>
            </div>
          ) : (
            <div className="team-list">
              {employees.map((employee) => (
                <article className="team-card" key={employee.id}>
                  <div className="team-card-top">
                    <div className="employee-avatar">
                      {employee.name?.slice(0, 1).toUpperCase() || "F"}
                    </div>

                    <div className="employee-info">
                      <h3>{employee.name}</h3>
                      <p>{employee.email}</p>
                      <span>{formatPhone(employee.phone || "")}</span>
                    </div>
                  </div>

                  {(canEditEmployee || canDeleteEmployee) && (
                    <div className="team-card-actions">
                      {canEditEmployee && (
                        <button
                          type="button"
                          className="icon-action edit-icon"
                          onClick={() => openEditEmployeeModal(employee)}
                          aria-label="Editar funcionário"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4.75 16.95 16.67 5.03a2.3 2.3 0 0 1 3.25 3.25L8 20.2a1.2 1.2 0 0 1-.55.31l-3.15.78a.75.75 0 0 1-.9-.9l.78-3.15c.05-.21.16-.4.31-.55Zm13-10.86L6.05 17.79l-.39 1.56 1.56-.39 11.7-11.7a.8.8 0 0 0-1.13-1.13Z" />
                          </svg>
                        </button>
                      )}

                      {canDeleteEmployee && (
                        <button
                          type="button"
                          className="icon-action delete-icon"
                          onClick={() => deleteEmployee(employee)}
                          aria-label="Excluir funcionário"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 4.75A2.75 2.75 0 0 1 11.75 2h.5A2.75 2.75 0 0 1 15 4.75h3.25a.75.75 0 0 1 0 1.5H17.5l-.68 12.2A2.75 2.75 0 0 1 14.07 21H9.93a2.75 2.75 0 0 1-2.75-2.55L6.5 6.25h-.75a.75.75 0 0 1 0-1.5H9Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Equipe;
