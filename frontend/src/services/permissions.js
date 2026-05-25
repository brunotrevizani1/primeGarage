import { apiRequest } from "./api";

export async function loadUserPermissions() {
  const response = await apiRequest("/api/team/my-permissions");

  localStorage.setItem(
    "primegarage_permissions",
    JSON.stringify(response.permissions || []),
  );

  localStorage.setItem("primegarage_role", response.role || "");

  return {
    role: response.role,
    permissions: response.permissions || [],
  };
}

export function getSavedPermissions() {
  try {
    return JSON.parse(localStorage.getItem("primegarage_permissions")) || [];
  } catch {
    return [];
  }
}

export function getSavedRole() {
  return localStorage.getItem("primegarage_role") || "";
}

export function hasPermission(
  permissionCode,
  permissions = getSavedPermissions(),
) {
  const role = getSavedRole();

  if (role === "owner" || role === "super_admin") {
    return true;
  }

  return permissions.includes(permissionCode);
}
