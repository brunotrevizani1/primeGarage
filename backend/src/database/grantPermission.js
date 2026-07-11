const db = require("./connection");

async function grantPermission() {
  try {
    const userEmail = "dono@teste.com";
    const permissionCode = "editar_atendimento";

    const [users] = await db.query("SELECT id FROM users WHERE email = ?", [
      userEmail,
    ]);

    if (users.length === 0) {
      console.log("Usuário não encontrado.");
      process.exit();
    }

    const [permissions] = await db.query(
      "SELECT id FROM permissions WHERE code = ?",
      [permissionCode],
    );

    if (permissions.length === 0) {
      console.log("Permissão não encontrada.");
      process.exit();
    }

    const userId = users[0].id;
    const permissionId = permissions[0].id;

    await db.query(
      `
      INSERT INTO user_permissions (user_id, permission_id, allowed)
      VALUES (?, ?, true)
      ON CONFLICT (user_id, permission_id) DO UPDATE SET allowed = true
      `,
      [userId, permissionId],
    );

    console.log("Permissão liberada com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao liberar permissão:", error);
    process.exit(1);
  }
}

grantPermission();
