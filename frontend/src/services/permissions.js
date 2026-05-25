import { apiRequest } from "./api";

export async function loadUserPermissions() {
  const response = await apiRequest("/api/team/my-permissions");

  return {
    role: response.role,
    permissions: response.permissions || [],
  };
}

export function getSavedPermissions() {
  return [];
}

export function getSavedRole() {
  return "";
}

export function hasPermission(permissionCode, permissions = []) {
  return permissions.includes(permissionCode);
}
