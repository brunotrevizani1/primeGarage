const bcrypt = require("bcrypt");
const { pool } = require("./connection");

const permissions = [
  { code: "ver_dashboard", name: "Ver dashboard", group: "Dashboard" },

  { code: "ver_fila", name: "Ver atendimentos", group: "Atendimentos" },
  { code: "criar_atendimento", name: "Criar atendimento", group: "Atendimentos" },
  { code: "editar_atendimento", name: "Editar atendimento", group: "Atendimentos" },
  { code: "alterar_status", name: "Alterar status", group: "Atendimentos" },
  { code: "cancelar_atendimento", name: "Cancelar atendimento", group: "Atendimentos" },

  { code: "ver_servicos", name: "Ver serviços", group: "Serviços" },
  { code: "criar_servico", name: "Criar serviço", group: "Serviços" },
  { code: "editar_servico", name: "Editar serviço", group: "Serviços" },
  { code: "excluir_servico", name: "Excluir serviço", group: "Serviços" },
  { code: "ver_categorias", name: "Ver categorias", group: "Serviços" },
  { code: "criar_categoria", name: "Criar categoria", group: "Serviços" },
  { code: "editar_categoria", name: "Editar categoria", group: "Serviços" },
  { code: "excluir_categoria", name: "Excluir categoria", group: "Serviços" },

  { code: "ver_equipe", name: "Ver equipe", group: "Equipe" },
  { code: "criar_funcionario", name: "Criar funcionário", group: "Equipe" },
  { code: "editar_funcionario", name: "Editar funcionário", group: "Equipe" },
  { code: "excluir_funcionario", name: "Excluir funcionário", group: "Equipe" },

  { code: "ver_agenda", name: "Ver agenda", group: "Agenda" },
  { code: "editar_agenda", name: "Editar agenda", group: "Agenda" },

  { code: "ver_cliente", name: "Ver clientes", group: "Clientes" },
  { code: "editar_cliente", name: "Editar clientes", group: "Clientes" },

  { code: "ver_financeiro", name: "Ver financeiro", group: "Financeiro" },

  { code: "gerenciar_configuracoes", name: "Gerenciar configurações", group: "Configurações" },
];

async function seed() {
  try {
    for (const permission of permissions) {
      await pool.query(
        `
        INSERT INTO permissions (code, name, group_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          group_name = EXCLUDED.group_name
        `,
        [permission.code, permission.name, permission.group],
      );
    }

    console.log("Permissões seedadas com sucesso!");

    const name = "Admin PrimeGarage";
    const email = "admin@primegarage.com";
    const cpf = "000.000.000-00";
    const password = "123456";
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
      INSERT INTO users (business_id, cpf, name, email, password, role, status)
      VALUES (NULL, $1, $2, $3, $4, 'super_admin', 'active')
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = EXCLUDED.status
      `,
      [cpf, name, email, hashedPassword],
    );

    console.log("Super admin criado com sucesso!");
    console.log("Email:", email);
    console.log("Senha:", password);

    process.exit(0);
  } catch (error) {
    console.error("Erro ao rodar seed:", error);
    process.exit(1);
  }
}

seed();
