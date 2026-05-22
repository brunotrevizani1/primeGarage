import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./equipe.css";

function Equipe() {
  const [employees, setEmployees] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    permissions: [],
  });

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

  function handleLogout() {
    localStorage.removeItem("primegarage_token");
    localStorage.removeItem("primegarage_user");
    window.location.href = "/";
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const employeesResponse = await apiRequest("/api/team");
      const permissionsResponse = await apiRequest(
        "/api/team/permissions/list",
      );

      setEmployees(employeesResponse.employees || []);
      setPermissions(permissionsResponse.permissions || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateEmployeeModal() {
    setEditingEmployee(null);
    setStep(1);
    setError("");

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
    try {
      setEditingEmployee(employee);
      setStep(1);
      setError("");

      const permissionsResponse = await apiRequest(
        `/api/team/${employee.id}/permissions`,
      );

      setForm({
        name: employee.name || "",
        email: employee.email || "",
        phone: formatPhone(employee.phone || ""),
        password: "",
        permissions: permissionsResponse.permissions || [],
      });

      setEmployeeModalOpen(true);
    } catch (error) {
      setError(error.message);
    }
  }

  async function openPermissionModal(employee) {
    try {
      setSelectedEmployee(employee);
      setError("");

      const permissionsResponse = await apiRequest(
        `/api/team/${employee.id}/permissions`,
      );

      setForm((currentForm) => ({
        ...currentForm,
        permissions: permissionsResponse.permissions || [],
      }));

      setPermissionModalOpen(true);
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

  function closePermissionModal() {
    setPermissionModalOpen(false);
    setSelectedEmployee(null);
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

  function goToPermissionsStep() {
    const validationMessage = validateEmployeeData();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setStep(2);
  }

  function togglePermission(permissionCode) {
    setForm((currentForm) => {
      const hasPermission = currentForm.permissions.includes(permissionCode);

      return {
        ...currentForm,
        permissions: hasPermission
          ? currentForm.permissions.filter((code) => code !== permissionCode)
          : [...currentForm.permissions, permissionCode],
      };
    });
  }

  function groupPermissions() {
    return permissions.reduce((groups, permission) => {
      if (!groups[permission.group_name]) {
        groups[permission.group_name] = [];
      }

      groups[permission.group_name].push(permission);

      return groups;
    }, {});
  }

  async function saveEmployee(event) {
    event.preventDefault();

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

  async function savePermissionsOnly(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await apiRequest(`/api/team/${selectedEmployee.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({
          permissions: form.permissions,
        }),
      });

      await loadData();
      closePermissionModal();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
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
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/atendimentos")}
              >
                Atendimentos
              </button>

              <button className="active" type="button">
                Equipe
              </button>

              <div className="menu-group">
                <button
                  type="button"
                  className="menu-parent-button"
                  onClick={() => setServicesMenuOpen(!servicesMenuOpen)}
                >
                  <span>Serviços</span>

                  <svg
                    className={
                      servicesMenuOpen ? "submenu-arrow open" : "submenu-arrow"
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

                    <button
                      type="button"
                      onClick={() =>
                        (window.location.href = "/categorias-servicos")
                      }
                    >
                      Categorias
                    </button>
                  </div>
                )}
              </div>

              <button type="button">Financeiro</button>
              <button type="button">Configurações</button>
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
              <span className={step === 1 ? "active" : ""}>Dados</span>
              <span className={step === 2 ? "active" : ""}>Permissões</span>
            </div>

            {error && <div className="team-error">{error}</div>}

            <form className="team-form" onSubmit={saveEmployee}>
              {step === 1 && (
                <>
                  <div className="form-group">
                    <label>Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: João Silva"
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>E-mail</label>
                    <input
                      type="email"
                      placeholder="funcionario@email.com"
                      value={form.email}
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
                      onChange={(event) =>
                        handlePhoneChange(event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      {editingEmployee ? "Nova senha opcional" : "Senha"}
                    </label>
                    <input
                      type="password"
                      placeholder={
                        editingEmployee
                          ? "Deixe em branco para manter"
                          : "Digite uma senha"
                      }
                      value={form.password}
                      onChange={(event) =>
                        updateField("password", event.target.value)
                      }
                    />
                  </div>

                  <button
                    className="save-team-button"
                    type="button"
                    onClick={goToPermissionsStep}
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
                      onClick={() => setStep(1)}
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

      {permissionModalOpen && (
        <div className="team-modal-overlay" onClick={closePermissionModal}>
          <section
            className="team-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <strong>Permissões</strong>
                <p>{selectedEmployee?.name}</p>
              </div>

              <button type="button" onClick={closePermissionModal}>
                ×
              </button>
            </div>

            {error && <div className="team-error">{error}</div>}

            <form className="team-form" onSubmit={savePermissionsOnly}>
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
                              onChange={() => togglePermission(permission.code)}
                            />

                            <span>{permission.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <button
                className="save-team-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar permissões"}
              </button>
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
            <small>Administração</small>
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

        {error && !employeeModalOpen && !permissionModalOpen && (
          <div className="team-error">{error}</div>
        )}

        <section className="team-list-section">
          <div className="panel-header">
            <div>
              <small>Funcionários cadastrados</small>
              <h2>{employees.length} funcionários</h2>
            </div>

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

                  <div className="team-card-actions">
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

                    <button
                      type="button"
                      className="icon-action permission-icon"
                      onClick={() => openPermissionModal(employee)}
                      aria-label="Editar permissões"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2.75a.75.75 0 0 1 .42.13l6.5 4.25a.75.75 0 0 1 .33.62v4.45c0 4.2-2.6 7.95-6.51 9.36a2.1 2.1 0 0 1-1.48 0A10.02 10.02 0 0 1 4.75 12.2V7.75a.75.75 0 0 1 .33-.62l6.5-4.25a.75.75 0 0 1 .42-.13Zm0 1.66L6.25 8.17v4.03c0 3.55 2.2 6.72 5.52 7.92.15.05.31.05.46 0a8.52 8.52 0 0 0 5.52-7.92V8.17L12 4.41Zm3.53 5.85a.75.75 0 0 1 0 1.06l-3.85 3.85a.75.75 0 0 1-1.06 0l-2.15-2.15a.75.75 0 0 1 1.06-1.06l1.62 1.62 3.32-3.32a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    </button>

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
                  </div>
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
