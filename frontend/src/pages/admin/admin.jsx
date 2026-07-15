import { useEffect, useState } from "react";
import AccountMenu from "../../components/AccountMenu";
import { apiRequest } from "../../services/api";
import "./admin.css";

const emptyForm = {
  businessName: "",
  businessPhone: "",
  businessAddress: "",
  ownerName: "",
  ownerCpf: "",
  ownerEmail: "",
  ownerPassword: "",
  permissions: [],
};

const emptyEditForm = {
  id: null,
  businessName: "",
  businessPhone: "",
  businessAddress: "",
  status: "active",
  customerPageName: "",
  customerPagePhrase: "",
  customerPageLogoUrl: "",
  addressStreet: "",
  addressNumber: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  ownerId: null,
  ownerName: "",
  ownerCpf: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerStatus: "active",
  ownerPassword: "",
  permissions: [],
};

function Admin() {
  const [businesses, setBusinesses] = useState([]);
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onlyNumbers(value) {
    return value.replace(/\D/g, "");
  }

  function formatCpf(value) {
    const numbers = onlyNumbers(value).slice(0, 11);

    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    }

    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  }

  function formatPhone(value) {
    const numbers = onlyNumbers(value).slice(0, 11);

    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }

    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }

  function togglePermission(permissionId) {
    setForm((current) => {
      const alreadySelected = current.permissions.includes(permissionId);

      return {
        ...current,
        permissions: alreadySelected
          ? current.permissions.filter((id) => id !== permissionId)
          : [...current.permissions, permissionId],
      };
    });
  }

  function groupPermissions() {
    return permissionOptions.reduce((groups, permission) => {
      const groupName = permission.group_name || "Geral";

      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      groups[groupName].push(permission);

      return groups;
    }, {});
  }

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [businessesResponse, permissionsResponse] = await Promise.all([
        apiRequest("/api/admin/businesses"),
        apiRequest("/api/team/permissions/list"),
      ]);

      setBusinesses(businessesResponse.businesses || []);
      setPermissionOptions(permissionsResponse.permissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateModal() {
    setForm(emptyForm);
    setFormError("");
    setShowPassword(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (
      !form.businessName.trim() ||
      !form.ownerName.trim() ||
      !form.ownerCpf.trim() ||
      !form.ownerEmail.trim() ||
      !form.ownerPassword.trim()
    ) {
      setFormError("Preencha nome do lavajato, nome, CPF, e-mail e senha do dono.");
      return;
    }

    try {
      setSaving(true);

      await apiRequest("/api/admin/businesses", {
        method: "POST",
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          businessPhone: form.businessPhone.trim() || null,
          businessAddress: form.businessAddress.trim() || null,
          ownerName: form.ownerName.trim(),
          ownerCpf: form.ownerCpf.trim(),
          ownerEmail: form.ownerEmail.trim(),
          ownerPassword: form.ownerPassword,
          permissions: form.permissions,
        }),
      });

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function toggleEditPermission(permissionId) {
    setEditForm((current) => {
      const alreadySelected = current.permissions.includes(permissionId);

      return {
        ...current,
        permissions: alreadySelected
          ? current.permissions.filter((id) => id !== permissionId)
          : [...current.permissions, permissionId],
      };
    });
  }

  function openEditModal(business) {
    setEditForm({
      id: business.id,
      businessName: business.name || "",
      businessPhone: business.phone || "",
      businessAddress: business.address || "",
      status: business.status || "active",
      customerPageName: business.customerPageName || "",
      customerPagePhrase: business.customerPagePhrase || "",
      customerPageLogoUrl: business.customerPageLogoUrl || "",
      addressStreet: business.addressStreet || "",
      addressNumber: business.addressNumber || "",
      addressNeighborhood: business.addressNeighborhood || "",
      addressCity: business.addressCity || "",
      addressState: business.addressState || "",
      ownerId: business.owner ? business.owner.id : null,
      ownerName: business.owner ? business.owner.name || "" : "",
      ownerCpf: business.owner ? formatCpf(business.owner.cpf || "") : "",
      ownerEmail: business.owner ? business.owner.email || "" : "",
      ownerPhone: business.owner ? formatPhone(business.owner.phone || "") : "",
      ownerStatus: business.owner ? business.owner.status || "active" : "active",
      ownerPassword: "",
      permissions: business.owner ? business.owner.permissions || [] : [],
    });
    setEditError("");
    setShowEditPassword(false);
    setEditModalOpen(true);
  }

  function closeEditModal() {
    if (editSaving) return;
    setEditModalOpen(false);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setEditError("");

    if (!editForm.businessName.trim()) {
      setEditError("Preencha o nome do lavajato.");
      return;
    }

    if (
      editForm.ownerId &&
      (!editForm.ownerName.trim() || !editForm.ownerCpf.trim() || !editForm.ownerEmail.trim())
    ) {
      setEditError("Preencha nome, CPF e e-mail do dono.");
      return;
    }

    try {
      setEditSaving(true);

      await apiRequest(`/api/admin/businesses/${editForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          businessName: editForm.businessName.trim(),
          businessPhone: editForm.businessPhone.trim() || null,
          businessAddress: editForm.businessAddress.trim() || null,
          status: editForm.status,
          customerPageName: editForm.customerPageName.trim() || null,
          customerPagePhrase: editForm.customerPagePhrase.trim() || null,
          customerPageLogoUrl: editForm.customerPageLogoUrl.trim() || null,
          addressStreet: editForm.addressStreet.trim() || null,
          addressNumber: editForm.addressNumber.trim() || null,
          addressNeighborhood: editForm.addressNeighborhood.trim() || null,
          addressCity: editForm.addressCity.trim() || null,
          addressState: editForm.addressState.trim() || null,
          ownerId: editForm.ownerId,
          ownerName: editForm.ownerId ? editForm.ownerName.trim() : undefined,
          ownerCpf: editForm.ownerId ? editForm.ownerCpf.trim() : undefined,
          ownerEmail: editForm.ownerId ? editForm.ownerEmail.trim() : undefined,
          ownerPhone: editForm.ownerId ? editForm.ownerPhone.trim() || null : undefined,
          ownerStatus: editForm.ownerId ? editForm.ownerStatus : undefined,
          ownerPassword: editForm.ownerId ? editForm.ownerPassword.trim() || undefined : undefined,
          permissions: editForm.ownerId ? editForm.permissions : undefined,
        }),
      });

      setEditModalOpen(false);
      await loadData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  const groupedPermissions = groupPermissions();

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div className="admin-header-text">
            <h1>Painel do administrador</h1>
            <p>Gerencie os lavajatos cadastrados no sistema</p>
          </div>
          <AccountMenu onLogout={handleLogout} />
        </header>

        {error && <div className="admin-error">{error}</div>}

        <button className="admin-new-button" type="button" onClick={openCreateModal}>
          + Novo lavajato
        </button>

        {loading ? (
          <p className="admin-loading">Carregando...</p>
        ) : businesses.length === 0 ? (
          <p className="admin-empty">Nenhum lavajato cadastrado ainda.</p>
        ) : (
          <div className="admin-business-list">
            {businesses.map((business) => (
              <div className="admin-business-card" key={business.id}>
                <div className="admin-business-card-top">
                  <strong>{business.name}</strong>
                  <span className={`admin-badge admin-badge-${business.status}`}>
                    {business.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <div className="admin-business-owner">
                  {business.owner ? (
                    <>
                      <span className="admin-owner-name">{business.owner.name}</span>
                      <span className="admin-owner-email">{business.owner.email}</span>
                    </>
                  ) : (
                    <span className="admin-owner-missing">Sem dono cadastrado</span>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-edit-button"
                  onClick={() => openEditModal(business)}
                >
                  Editar informações
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <strong>Novo lavajato</strong>
                <p>Cadastre o lavajato, o dono e as permissões dele</p>
              </div>
              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
              {formError && <div className="admin-error">{formError}</div>}

              <div className="form-group">
                <label htmlFor="businessName">Nome do lavajato</label>
                <input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => updateField("businessName", e.target.value)}
                  placeholder="Ex: Lava Rápido Silva"
                />
              </div>

              <div className="form-group">
                <label htmlFor="businessPhone">Telefone do dono</label>
                <input
                  id="businessPhone"
                  value={form.businessPhone}
                  onChange={(e) => updateField("businessPhone", formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="businessAddress">Endereço do lavajato</label>
                <input
                  id="businessAddress"
                  value={form.businessAddress}
                  onChange={(e) => updateField("businessAddress", e.target.value)}
                  placeholder="Rua, número, bairro"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ownerName">Nome do dono</label>
                <input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) => updateField("ownerName", e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ownerCpf">CPF do dono</label>
                <input
                  id="ownerCpf"
                  value={form.ownerCpf}
                  onChange={(e) => updateField("ownerCpf", formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ownerEmail">E-mail do dono</label>
                <input
                  id="ownerEmail"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => updateField("ownerEmail", e.target.value)}
                  placeholder="dono@email.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ownerPassword">Senha de acesso</label>
                <div className="password-field-wrapper">
                  <input
                    id="ownerPassword"
                    type={showPassword ? "text" : "password"}
                    value={form.ownerPassword}
                    onChange={(e) => updateField("ownerPassword", e.target.value)}
                    placeholder="Senha do dono"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-icon"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3.28 2.22a.75.75 0 0 1 1.06 0l17.44 17.44a.75.75 0 1 1-1.06 1.06l-3.1-3.1A10.8 10.8 0 0 1 12 19.25C6.9 19.25 3.38 15.7 2.1 12.53a1.43 1.43 0 0 1 0-1.06 11.7 11.7 0 0 1 3.18-4.32l-2-1.99a.75.75 0 0 1 0-1.06Zm3.28 6.2A10.12 10.12 0 0 0 3.55 12C4.7 14.62 7.73 17.75 12 17.75c1.53 0 2.87-.4 4.02-1.02l-2.15-2.15A3.5 3.5 0 0 1 9.42 10.13L6.56 8.42Zm4.18 2.98a2 2 0 0 0 1.86 1.86l-1.86-1.86ZM12 4.75c5.1 0 8.62 3.55 9.9 6.72.14.34.14.72 0 1.06a11.3 11.3 0 0 1-2.02 3.1l-1.07-1.07A9.9 9.9 0 0 0 20.45 12C19.3 9.38 16.27 6.25 12 6.25c-1.02 0-1.97.14-2.84.4L7.96 5.46A10.55 10.55 0 0 1 12 4.75Zm.25 3.01A3.5 3.5 0 0 1 16.24 11.75l-1.6-1.6a2 2 0 0 0-.79-.79l-1.6-1.6Z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5c5.1 0 8.62 3.55 9.9 6.72.07.18.07.38 0 .56C20.62 15.45 17.1 19 12 19s-8.62-3.55-9.9-6.72a.75.75 0 0 1 0-.56C3.38 8.55 6.9 5 12 5Zm0 1.5c-4.24 0-7.25 2.92-8.39 5.5C4.75 14.58 7.76 17.5 12 17.5s7.25-2.92 8.39-5.5C19.25 9.42 16.24 6.5 12 6.5Zm0 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 1.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="permissions-list">
                {Object.entries(groupedPermissions).map(([groupName, groupPermissionsList]) => (
                  <div className="permission-group" key={groupName}>
                    <h3>{groupName}</h3>
                    <div className="permission-options">
                      {groupPermissionsList.map((permission) => (
                        <label className="permission-option" key={permission.id}>
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                          />
                          {permission.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="admin-submit-button" disabled={saving}>
                  {saving ? "Salvando..." : "Criar lavajato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="admin-modal-overlay" onClick={closeEditModal}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <strong>Editar lavajato</strong>
                <p>Atualize as informações gerais do lavajato</p>
              </div>
              <button type="button" onClick={closeEditModal}>
                ×
              </button>
            </div>

            <form className="admin-form" onSubmit={handleEditSubmit}>
              {editError && <div className="admin-error">{editError}</div>}

              <h3 className="admin-section-title">Dados do lavajato</h3>

              <div className="form-group">
                <label htmlFor="editBusinessName">Nome do lavajato</label>
                <input
                  id="editBusinessName"
                  value={editForm.businessName}
                  onChange={(e) => updateEditField("businessName", e.target.value)}
                  placeholder="Ex: Lava Rápido Silva"
                />
              </div>

              {editForm.ownerId && (
                <div className="form-group">
                  <label htmlFor="editOwnerName">Nome do dono</label>
                  <input
                    id="editOwnerName"
                    value={editForm.ownerName}
                    onChange={(e) => updateEditField("ownerName", e.target.value)}
                  />
                </div>
              )}

              {editForm.ownerId && (
                <div className="form-group">
                  <label htmlFor="editOwnerCpf">CPF do dono</label>
                  <input
                    id="editOwnerCpf"
                    value={editForm.ownerCpf}
                    onChange={(e) => updateEditField("ownerCpf", formatCpf(e.target.value))}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="editBusinessPhone">Telefone do dono</label>
                <input
                  id="editBusinessPhone"
                  value={editForm.businessPhone}
                  onChange={(e) => updateEditField("businessPhone", formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {editForm.ownerId && (
                <div className="form-group">
                  <label htmlFor="editOwnerEmail">E-mail do dono</label>
                  <input
                    id="editOwnerEmail"
                    type="email"
                    value={editForm.ownerEmail}
                    onChange={(e) => updateEditField("ownerEmail", e.target.value)}
                  />
                </div>
              )}

              {editForm.ownerId && (
                <div className="form-group">
                  <label htmlFor="editOwnerPassword">Nova senha (opcional)</label>
                  <div className="password-field-wrapper">
                    <input
                      id="editOwnerPassword"
                      type={showEditPassword ? "text" : "password"}
                      value={editForm.ownerPassword}
                      onChange={(e) => updateEditField("ownerPassword", e.target.value)}
                      placeholder="Deixe em branco para manter a atual"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-icon"
                      onClick={() => setShowEditPassword((current) => !current)}
                      aria-label={showEditPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showEditPassword ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3.28 2.22a.75.75 0 0 1 1.06 0l17.44 17.44a.75.75 0 1 1-1.06 1.06l-3.1-3.1A10.8 10.8 0 0 1 12 19.25C6.9 19.25 3.38 15.7 2.1 12.53a1.43 1.43 0 0 1 0-1.06 11.7 11.7 0 0 1 3.18-4.32l-2-1.99a.75.75 0 0 1 0-1.06Zm3.28 6.2A10.12 10.12 0 0 0 3.55 12C4.7 14.62 7.73 17.75 12 17.75c1.53 0 2.87-.4 4.02-1.02l-2.15-2.15A3.5 3.5 0 0 1 9.42 10.13L6.56 8.42Zm4.18 2.98a2 2 0 0 0 1.86 1.86l-1.86-1.86ZM12 4.75c5.1 0 8.62 3.55 9.9 6.72.14.34.14.72 0 1.06a11.3 11.3 0 0 1-2.02 3.1l-1.07-1.07A9.9 9.9 0 0 0 20.45 12C19.3 9.38 16.27 6.25 12 6.25c-1.02 0-1.97.14-2.84.4L7.96 5.46A10.55 10.55 0 0 1 12 4.75Zm.25 3.01A3.5 3.5 0 0 1 16.24 11.75l-1.6-1.6a2 2 0 0 0-.79-.79l-1.6-1.6Z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 5c5.1 0 8.62 3.55 9.9 6.72.07.18.07.38 0 .56C20.62 15.45 17.1 19 12 19s-8.62-3.55-9.9-6.72a.75.75 0 0 1 0-.56C3.38 8.55 6.9 5 12 5Zm0 1.5c-4.24 0-7.25 2.92-8.39 5.5C4.75 14.58 7.76 17.5 12 17.5s7.25-2.92 8.39-5.5C19.25 9.42 16.24 6.5 12 6.5Zm0 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 1.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {editForm.ownerId && (
                <div className="form-group">
                  <label htmlFor="editOwnerStatus">Status do dono</label>
                  <select
                    id="editOwnerStatus"
                    value={editForm.ownerStatus}
                    onChange={(e) => updateEditField("ownerStatus", e.target.value)}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="editBusinessStatus">Status do lavajato</label>
                <select
                  id="editBusinessStatus"
                  value={editForm.status}
                  onChange={(e) => updateEditField("status", e.target.value)}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              {!editForm.ownerId && (
                <p className="admin-owner-missing">Sem dono cadastrado para este lavajato.</p>
              )}

              <h3 className="admin-section-title">Endereço detalhado</h3>

              <div className="form-group">
                <label htmlFor="editAddressStreet">Rua</label>
                <input
                  id="editAddressStreet"
                  value={editForm.addressStreet}
                  onChange={(e) => updateEditField("addressStreet", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editAddressNumber">Número</label>
                <input
                  id="editAddressNumber"
                  value={editForm.addressNumber}
                  onChange={(e) => updateEditField("addressNumber", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editAddressNeighborhood">Bairro</label>
                <input
                  id="editAddressNeighborhood"
                  value={editForm.addressNeighborhood}
                  onChange={(e) => updateEditField("addressNeighborhood", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editAddressCity">Cidade</label>
                <input
                  id="editAddressCity"
                  value={editForm.addressCity}
                  onChange={(e) => updateEditField("addressCity", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editAddressState">Estado (UF)</label>
                <input
                  id="editAddressState"
                  value={editForm.addressState}
                  maxLength={2}
                  onChange={(e) => updateEditField("addressState", e.target.value.toUpperCase())}
                  placeholder="SP"
                />
              </div>

              {editForm.ownerId && (
                <>
                  <h3 className="admin-section-title">Permissões do dono</h3>

                  <div className="permissions-list">
                    {Object.entries(groupedPermissions).map(([groupName, groupPermissionsList]) => (
                      <div className="permission-group" key={groupName}>
                        <h3>{groupName}</h3>
                        <div className="permission-options">
                          {groupPermissionsList.map((permission) => (
                            <label className="permission-option" key={permission.id}>
                              <input
                                type="checkbox"
                                checked={editForm.permissions.includes(permission.id)}
                                onChange={() => toggleEditPermission(permission.id)}
                              />
                              {permission.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeEditModal} disabled={editSaving}>
                  Cancelar
                </button>
                <button type="submit" className="admin-submit-button" disabled={editSaving}>
                  {editSaving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
