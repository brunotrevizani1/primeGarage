const fs = require("fs");
const path = require("path");
const { pool } = require("./connection");

async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  try {
    await pool.query(sql);
    console.log("Schema criado/atualizado com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao criar schema:", error);
    process.exit(1);
  }
}

initSchema();
