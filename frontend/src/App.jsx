import Login from "./pages/login/login";
import Dashboard from "./pages/dashboard/dashboard";
import Atendimentos from "./pages/atendimentos/atendimentos";
import NovoAtendimento from "./pages/novo-atendimento/novoAtendimento";
import EditarAtendimento from "./pages/editar-atendimento/editarAtendimento";

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

  if (path.startsWith("/editar-atendimento/")) {
    if (!token) {
      window.location.href = "/";
      return null;
    }

    return <EditarAtendimento />;
  }

  return <Login />;
}

export default App;
