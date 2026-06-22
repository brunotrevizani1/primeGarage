const db = require("./connection");

async function addColumn(sql) {
  try {
    await db.query(sql);
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("Coluna já existe, ignorando.");
    } else {
      throw error;
    }
  }
}

async function addScheduleColumnsToOrders() {
  try {
    await addColumn(
      "ALTER TABLE service_orders ADD COLUMN scheduled_time VARCHAR(5) NULL AFTER scheduled_date",
    );

    await addColumn(
      "ALTER TABLE service_orders ADD COLUMN scheduled_period ENUM('morning', 'afternoon', 'night') NULL AFTER scheduled_time",
    );

    console.log("Colunas de agendamento adicionadas com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao adicionar colunas:", error);
    process.exit(1);
  }
}

addScheduleColumnsToOrders();
