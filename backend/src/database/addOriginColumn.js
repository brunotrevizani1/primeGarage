const db = require("./connection");

async function addOriginColumn() {
  try {
    await db.query(
      "ALTER TABLE service_orders ADD COLUMN origin VARCHAR(30) NULL AFTER scheduled_period",
    );
    console.log("Coluna origin adicionada com sucesso!");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("Coluna origin já existe, ignorando.");
    } else {
      console.error("Erro ao adicionar coluna:", error);
      process.exit(1);
    }
  } finally {
    process.exit();
  }
}

addOriginColumn();
