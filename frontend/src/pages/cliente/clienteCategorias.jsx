import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import "./clienteCategorias.css";

function ClienteCategorias() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const businessId = pathParts[1];

  const [business, setBusiness] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(`/api/public/categories/${businessId}`);

      setBusiness(response.business);
      setCategories(response.categories || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    window.location.href = `/agendar/${businessId}`;
  }

  function selectCategory(categoryId) {
    window.location.href = `/agendar/${businessId}/servicos?categoria=${categoryId}`;
  }

  useEffect(() => {
    loadCategories();
  }, []);

  if (loading) {
    return (
      <main className="customer-category-page">
        <section className="customer-category-loading">
          <div className="customer-category-loading-circle"></div>
          <p>Carregando categorias...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="customer-category-page">
        <section className="customer-category-error-card">
          <strong>Não foi possível carregar as categorias</strong>
          <p>{error}</p>

          <button type="button" onClick={goBack}>
            Voltar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-category-page">
      <section className="customer-category-app">
        <button
          type="button"
          className="customer-category-back-floating"
          onClick={goBack}
          aria-label="Voltar"
        >
          ‹
        </button>

        <section className="customer-category-hero">
          <div className="customer-category-logo-large">
            {business?.logoUrl ? (
              <img src={business.logoUrl} alt={`Logo ${business.name}`} />
            ) : (
              <strong>{business?.name?.slice(0, 1) || "P"}</strong>
            )}
          </div>

          <span className="customer-category-business-name">
            {business?.name || "Lava-jato"}
          </span>

          <h1>Escolha a categoria</h1>
        </section>

        {categories.length === 0 ? (
          <section className="customer-category-empty">
            <strong>Nenhuma categoria disponível</strong>
            <p>
              Este lava-jato ainda não cadastrou categorias para agendamento.
            </p>
          </section>
        ) : (
          <section className="customer-category-list">
            {categories.map((category, index) => (
              <button
                type="button"
                className="customer-category-card"
                key={category.id}
                onClick={() => selectCategory(category.id)}
              >
                <div>
                  <span>Categoria {index + 1}</span>
                  <strong>{category.name}</strong>
                </div>

                <div className="customer-category-arrow">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9.47 5.22a.75.75 0 0 1 1.06 0l6.25 6.25a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 1 1-1.06-1.06L15.19 12 9.47 6.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </div>
              </button>
            ))}
          </section>
        )}

        <div className="customer-category-step-text">Etapa 1 de 5</div>

        <footer className="customer-category-footer">
          Todos os direitos reservados a {business?.name || "Lava-jato"}.
        </footer>
      </section>
    </main>
  );
}

export default ClienteCategorias;
