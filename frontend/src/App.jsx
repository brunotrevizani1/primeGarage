import Login from "./pages/login/login";
import Dashboard from "./pages/dashboard/dashboard";
import Atendimentos from "./pages/atendimentos/atendimentos";
import NovoAtendimento from "./pages/novo-atendimento/novoAtendimento";
import EditarAtendimento from "./pages/editar-atendimento/editarAtendimento";
import Servicos from "./pages/servicos/servicos";
import CategoriasServicos from "./pages/categorias-servicos/categoriasServicos";
import Equipe from "./pages/equipe/equipe";

function App() {
  const path = window.location.pathname;
  const token = localStorage.getItem("primegarage_token");

  if (path === "/dashboard") {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <Dashboard />;
  }

  if (path === "/atendimentos") {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <Atendimentos />;
  }

  if (path === "/novo-atendimento") {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <NovoAtendimento />;
  }

  if (path === "/categorias-servicos") {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <CategoriasServicos />;
  }

  if (path === "/equipe") {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <Equipe />;
  }

  if (path.startsWith("/editar-atendimento/")) {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <EditarAtendimento />;
  }

  if (path === "/servicos") {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <Servicos />;
  }

  return <Login />;
}

export default App;
