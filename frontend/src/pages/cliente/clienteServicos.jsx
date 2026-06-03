import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./clienteServicos.css";

function ClienteServicos() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const businessId = pathParts[1];

  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get("categoria");

  const [business, setBusiness] = useState(null);
  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDuration(minutes) {
    if (!minutes) {
      return "Duração não informada";
    }

    const totalMinutes = Number(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}min`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${remainingMinutes}min`;
  }

  async function loadServices() {
    try {
      setLoading(true);
      setError("");

      if (!categoryId) {
        setError("Categoria não informada.");
        return;
      }

      const response = await apiRequest(
        `/api/public/services/${businessId}?categoryId=${categoryId}`,
      );

      setBusiness(response.business);
      setCategory(response.category);
      setServices(response.services || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    window.location.href = `/agendar/${businessId}/categorias`;
  }

  function selectService(serviceId) {
    window.location.href = `/agendar/${businessId}/dados?servico=${serviceId}`;
  }

  useEffect(() => {
    loadServices();
  }, []);

  if (loading) {
    return (
      <main className="customer-services-page">
        <section className="customer-services-loading">
          <div className="customer-services-loading-circle"></div>
          <p>Carregando serviços...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="customer-services-page">
        <section className="customer-services-error-card">
          <strong>Não foi possível carregar os serviços</strong>
          <p>{error}</p>

          <button type="button" onClick={goBack}>
            Voltar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-services-page">
      <section className="customer-services-app">
        <section className="customer-services-hero">
          <button
            type="button"
            className="customer-services-back"
            onClick={goBack}
            aria-label="Voltar"
          >
            ‹
          </button>

          <div className="customer-services-logo">
            {business?.logoUrl ? (
              <img src={business.logoUrl} alt={`Logo ${business.name}`} />
            ) : (
              <strong>{business?.name?.slice(0, 1) || "P"}</strong>
            )}
          </div>

          <span className="customer-services-business">
            {business?.name || "Lava-jato"}
          </span>

          <span className="customer-services-category">
            {category?.name || "Categoria"}
          </span>

          <h1>Escolha o serviço</h1>
        </section>

        {services.length === 0 ? (
          <section className="customer-services-empty">
            <strong>Nenhum serviço disponível</strong>
            <p>Essa categoria ainda não possui serviços cadastrados.</p>
          </section>
        ) : (
          <section className="customer-services-list">
            {services.map((service) => (
              <button
                type="button"
                className="customer-service-card"
                key={service.id}
                onClick={() => selectService(service.id)}
              >
                <div className="customer-service-content">
                  <strong>{service.name}</strong>

                  {service.description && <p>{service.description}</p>}

                  <div className="customer-service-meta">
                    <span className="service-price-chip">
                      {formatMoney(service.price)}
                    </span>

                    <span className="service-duration-chip">
                      {formatDuration(service.duration_minutes)}
                    </span>
                  </div>
                </div>

                <div className="customer-service-arrow">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9.47 5.22a.75.75 0 0 1 1.06 0l6.25 6.25a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 1 1-1.06-1.06L15.19 12 9.47 6.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </div>
              </button>
            ))}
          </section>
        )}

        <div className="customer-services-step">Etapa 2 de 5</div>

        <footer className="customer-services-footer">
          Todos os direitos reservados a {business?.name || "Lava-jato"}.
        </footer>
      </section>
    </main>
  );
}

export default ClienteServicos;
