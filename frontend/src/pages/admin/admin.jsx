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

                {business.phone && <p className="admin-business-detail">{business.phone}</p>}
                {business.address && <p className="admin-business-detail">{business.address}</p>}

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
                <label htmlFor="businessPhone">Telefone do lavajato</label>
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
                <input
                  id="ownerPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.ownerPassword}
                  onChange={(e) => updateField("ownerPassword", e.target.value)}
                  placeholder="Senha do dono"
                />
                <button
                  type="button"
                  className="admin-show-password"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Ocultar senha" : "Mostrar senha"}
                </button>
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
    </div>
  );
}

export default Admin;
