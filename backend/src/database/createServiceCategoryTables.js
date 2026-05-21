const db = require("./connection");

async function columnExists(tableName, columnName) {
  const [columns] = await db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = ?
    AND COLUMN_NAME = ?
    `,
    [tableName, columnName],
  );

  return columns.length > 0;
}

async function createServiceCategoryTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        UNIQUE KEY unique_category_per_business (business_id, name)
      )
    `);

    const hasCategoryId = await columnExists("services", "category_id");

    if (!hasCategoryId) {
      await db.query(`
        ALTER TABLE services
        ADD COLUMN category_id INT NULL AFTER business_id
      `);

      await db.query(`
        ALTER TABLE services
        ADD CONSTRAINT fk_services_category
        FOREIGN KEY (category_id) REFERENCES service_categories(id)
      `);
    }

    const [businesses] = await db.query(`
      SELECT id
      FROM businesses
    `);

    for (const business of businesses) {
      const defaultCategories = ["Carro", "Moto", "Outros"];

      for (const categoryName of defaultCategories) {
        await db.query(
          `
          INSERT IGNORE INTO service_categories (business_id, name, status)
          VALUES (?, ?, 'active')
          `,
          [business.id, categoryName],
        );
      }
    }

    console.log("Tabelas de categorias de serviços criadas com sucesso!");
    process.exit();
  } catch (error) {
    console.error("Erro ao criar categorias de serviços:", error);
    process.exit(1);
  }
}

createServiceCategoryTables();
