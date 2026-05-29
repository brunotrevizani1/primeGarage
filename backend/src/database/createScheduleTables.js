const db = require("./connection");

async function createScheduleTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS business_working_hours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        weekday TINYINT NOT NULL,
        is_open BOOLEAN DEFAULT FALSE,
        open_time TIME NULL,
        close_time TIME NULL,
        has_lunch_break BOOLEAN DEFAULT FALSE,
        lunch_start TIME NULL,
        lunch_end TIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_business_weekday (business_id, weekday),
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS business_schedule_blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        block_date DATE NOT NULL,
        is_full_day BOOLEAN DEFAULT FALSE,
        start_time TIME NULL,
        end_time TIME NULL,
        reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    await db.query(`
      INSERT IGNORE INTO permissions (code, name, group_name)
      VALUES 
      ('ver_agenda', 'Ver agenda', 'Agenda'),
      ('editar_agenda', 'Editar agenda', 'Agenda')
    `);

    console.log("Tabelas de agenda criadas com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar tabelas de agenda:", error);
    process.exit(1);
  }
}

createScheduleTables();
