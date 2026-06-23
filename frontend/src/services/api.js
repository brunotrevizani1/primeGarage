const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Erro na requisição (status ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data?.mensagem || "Erro na requisição.");
  }

  return data;
}
