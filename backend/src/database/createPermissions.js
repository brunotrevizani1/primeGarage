const db = require("./connection");

async function createPermissions() {
  try {
    const permissions = [
      ["ver_dashboard", "Ver dashboard", "Permite acessar o painel inicial"],
      ["ver_fila", "Ver fila", "Permite visualizar a fila de veículos"],
      [
        "criar_atendimento",
        "Criar atendimento",
        "Permite cadastrar um novo atendimento",
      ],
      [
        "editar_atendimento",
        "Editar atendimento",
        "Permite editar dados de um atendimento",
      ],
      ["alterar_status", "Alterar status", "Permite mudar o status do veículo"],
      [
        "finalizar_atendimento",
        "Finalizar atendimento",
        "Permite finalizar um atendimento",
      ],
      [
        "cancelar_atendimento",
        "Cancelar atendimento",
        "Permite cancelar um atendimento",
      ],
      [
        "ver_clientes",
        "Ver clientes",
        "Permite visualizar clientes cadastrados",
      ],
      [
        "gerenciar_servicos",
        "Gerenciar serviços",
        "Permite criar e editar serviços",
      ],
      ["ver_financeiro", "Ver financeiro", "Permite acessar o financeiro"],
      [
        "gerenciar_funcionarios",
        "Gerenciar funcionários",
        "Permite criar e editar funcionários",
      ],
      [
        "enviar_whatsapp",
        "Enviar WhatsApp",
        "Permite enviar mensagens pelo WhatsApp",
      ],
      [
        "editar_configuracoes",
        "Editar configurações",
        "Permite alterar dados do lavajato",
      ],
      [
        "ver_relatorios",
        "Ver relatórios",
        "Permite acessar relatórios do sistema",
      ],
    ];

    for (const permission of permissions) {
      await db.query(
        `
        INSERT INTO permissions (code, name, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description)
        `,
        permission,
      );
    }

    console.log("Permissões criadas com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar permissões:", error);
    process.exit(1);
  }
}

createPermissions();
