const db = require("./connection");

async function createScheduleSettingsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS business_schedule_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL UNIQUE,
        schedule_type ENUM('time_slots', 'periods', 'daily') DEFAULT 'time_slots',
        slot_interval_minutes INT DEFAULT 60,
        vehicles_per_slot INT DEFAULT 1,
        daily_limit INT DEFAULT 20,
        morning_limit INT DEFAULT 8,
        afternoon_limit INT DEFAULT 10,
        night_limit INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    console.log("Tabela de configurações de agenda criada com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar tabela de configurações de agenda:", error);
    process.exit(1);
  }
}

createScheduleSettingsTable();
