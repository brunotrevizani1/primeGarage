const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Converte placeholders no estilo MySQL ("?") para o estilo Postgres ($1, $2...).
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Mantém o formato de retorno usado no restante do código (herdado do mysql2):
// SELECT -> [rows, fields]; INSERT/UPDATE/DELETE -> [{ affectedRows, insertId }, undefined].
// insertId só é preenchido quando o INSERT tiver "RETURNING id".
function wrapResult(result) {
  if (result.command === "SELECT") {
    return [result.rows, result.fields];
  }

  return [
    {
      affectedRows: result.rowCount,
      insertId: result.rows && result.rows[0] ? result.rows[0].id : undefined,
      rows: result.rows,
    },
    undefined,
  ];
}

async function query(sql, params = []) {
  const result = await pool.query(toPgSql(sql), params);
  return wrapResult(result);
}

async function getConnection() {
  const client = await pool.connect();

  return {
    query: async (sql, params = []) => {
      const result = await client.query(toPgSql(sql), params);
      return wrapResult(result);
    },
    beginTransaction: () => client.query("BEGIN"),
    commit: () => client.query("COMMIT"),
    rollback: () => client.query("ROLLBACK"),
    release: () => client.release(),
  };
}

module.exports = { query, getConnection, pool };
