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
import Configuracoes from "./pages/configuracoes/configuracoes";
import ClienteInicio from "./pages/cliente/clienteInicio";
import ClienteCategorias from "./pages/cliente/clienteCategorias";
import ClienteServicos from "./pages/cliente/clienteServicos";
import ClienteDados from "./pages/cliente/clienteDados";
import ClienteAgenda from "./pages/cliente/clienteAgenda";
import ClienteConfirmacao from "./pages/cliente/clienteConfirmacao";
import Clientes from "./pages/clientes/Clientes";
import AReceber from "./pages/financeiro/aReceber";
import APagar from "./pages/financeiro/aPagar";
import FormasPagamento from "./pages/financeiro/formasPagamento";
import Banco from "./pages/financeiro/banco";
import Relatorios from "./pages/relatorios/Relatorios";

function App() {
  const path = window.location.pathname;
  const pathParts = path.split("/").filter(Boolean);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isPublicCustomerRoute = pathParts[0] === "agendar" && pathParts[1];

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

  // ROTAS PÚBLICAS DO CLIENTE
  if (isPublicCustomerRoute && !pathParts[2]) {
    return <ClienteInicio />;
  }

  if (isPublicCustomerRoute && pathParts[2] === "categorias") {
    return <ClienteCategorias />;
  }

  if (isPublicCustomerRoute && pathParts[2] === "servicos") {
    return <ClienteServicos />;
  }

  if (isPublicCustomerRoute && pathParts[2] === "dados") {
    return <ClienteDados />;
  }

  if (isPublicCustomerRoute && pathParts[2] === "agenda") {
    return <ClienteAgenda />;
  }

  if (isPublicCustomerRoute && pathParts[2] === "confirmacao") {
    return <ClienteConfirmacao />;
  }

  // ROTAS PROTEGIDAS
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
  if (path === "/configuracoes") return <Configuracoes />;
  if (path === "/clientes") return <Clientes />;
  if (path === "/financeiro/a-receber") return <AReceber />;
  if (path === "/financeiro/a-pagar") return <APagar />;
  if (path === "/financeiro/formas-de-pagamento") return <FormasPagamento />;
  if (path === "/financeiro/banco") return <Banco />;
  if (path === "/relatorios") return <Relatorios />;

  return <Login />;
}

export default App;
