import { useEffect, useState } from "react";
import Login from "./pages/login/login";
import Dashboard from "./pages/dashboard/dashboard";
import Atendimentos from "./pages/atendimentos/atendimentos";
import NovoAtendimento from "./pages/novo-atendimento/novoAtendimento";
import EditarAtendimento from "./pages/editar-atendimento/editarAtendimento";
import Servicos from "./pages/servicos/servicos";
import CategoriasServicos from "./pages/categorias-servicos/categoriasServicos";
import Equipe from "./pages/equipe/equipe";
import { apiRequest } from "./services/api";
import Agenda from "./pages/agenda/agenda";

function App() {
  const path = window.location.pathname;
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        await apiRequest("/api/auth/me");
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  if (checkingAuth) {
    return null;
  }

  const isProtectedRoute = path !== "/";

  if (isProtectedRoute && !isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  if (path === "/dashboard") return <Dashboard />;
  if (path === "/atendimentos") return <Atendimentos />;
  if (path === "/novo-atendimento") return <NovoAtendimento />;
  if (path === "/categorias-servicos") return <CategoriasServicos />;
  if (path === "/equipe") return <Equipe />;
  if (path.startsWith("/editar-atendimento/")) return <EditarAtendimento />;
  if (path === "/servicos") return <Servicos />;
  if (path === "/agenda") return <Agenda />;

  return <Login />;
}

export default App;
