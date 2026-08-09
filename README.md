# PrimeGarage

Sistema de gestão para lava-jatos / garagens: agendamento de horários, controle de atendimentos, financeiro (contas a pagar/receber, bancos), clientes, veículos, equipe, serviços e relatórios — com painel administrativo, controle de permissões por usuário e um portal público para o cliente acompanhar seu atendimento.

## Stack

**Backend**
- Node.js + Express 5
- PostgreSQL (via [Supabase](https://supabase.com/)) — driver `pg`
- Autenticação via JWT (`jsonwebtoken`) + cookies (`cookie-parser`)
- Senhas com `bcrypt`
- Rate limiting (`express-rate-limit`)

**Frontend**
- React 19 + Vite
- CSS puro (sem framework de UI)

## Estrutura do projeto

```
primeGarage/
├── backend/
│   ├── src/
│   │   ├── controllers/     # regras de negócio de cada recurso
│   │   ├── routes/          # definição das rotas da API
│   │   ├── middlewares/     # autenticação e checagem de permissões
│   │   ├── database/        # conexão, schema, seed, scripts utilitários
│   │   └── server.js        # entrada da aplicação Express
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/            # telas (agenda, atendimentos, financeiro, clientes,
    │   │                      #  equipe, serviços, relatórios, admin, área do cliente...)
    │   ├── components/
    │   └── services/         # integração com a API
    └── .env.example
```

## Principais funcionalidades

- **Autenticação e permissões**: login por JWT, senha mestra para acesso a contas de dono/funcionário e controle granular de permissões por usuário.
- **Agenda**: criação e gestão de horários/agendamentos.
- **Atendimentos**: abertura, edição e acompanhamento de ordens de serviço.
- **Financeiro**: contas a pagar, contas a receber e controle de bancos/caixa.
- **Cadastros**: clientes, veículos, equipe, serviços e categorias de serviços.
- **Relatórios**: consolidação de dados operacionais e financeiros.
- **Configurações**: dados do negócio, integrações (Instagram/WhatsApp) e preferências gerais.
- **Área do cliente**: portal público para o cliente acompanhar o andamento do atendimento.

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Um projeto PostgreSQL (recomendado: [Supabase](https://supabase.com/))

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Preencha o `.env`:

```
PORT=3000
DATABASE_URL=          # connection string do Supabase (Project Settings > Database > Connection string > URI)
JWT_SECRET=             # segredo usado para assinar os tokens JWT
MASTER_PASSWORD=        # senha mestra: loga em qualquer conta de dono/funcionário (não vale para super_admin)
FRONTEND_URL=http://localhost:5173
```

Inicialize o banco e rode a API:

```bash
npm run db:init     # cria as tabelas a partir do schema.sql
npm run db:seed      # (opcional) popula dados iniciais
npm run dev           # inicia o servidor com nodemon em http://localhost:3000
```

Outros scripts úteis:

```bash
npm run grant-permission   # concede permissões a um usuário
npm run reset-orders       # reseta atendimentos/ordens de serviço
npm start                  # inicia o servidor em modo produção
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Preencha o `.env`:

```
VITE_API_URL=http://localhost:3000
```

Rode o frontend:

```bash
npm run dev       # inicia o Vite em http://localhost:5173
npm run build      # gera build de produção em dist/
npm run preview    # serve o build de produção localmente
npm run lint        # roda o ESLint
```

## Licença

Projeto privado/interno. Sem licença de distribuição definida.
