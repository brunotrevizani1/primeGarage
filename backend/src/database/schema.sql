-- Schema consolidado (Postgres/Supabase) do PrimeGarage.
-- Substitui os scripts incrementais antigos (MySQL/Railway) por um único arquivo,
-- já refletindo o resultado final de todas as migrações anteriores.
-- Rode este arquivo inteiro no SQL Editor do Supabase (ou via psql) em um banco novo.

CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  customer_page_name VARCHAR(150),
  customer_page_phrase VARCHAR(255),
  customer_page_logo_url VARCHAR(255),
  address_street VARCHAR(150),
  address_number VARCHAR(20),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  business_id INT NULL REFERENCES businesses(id),
  cpf VARCHAR(14) UNIQUE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'owner', 'employee')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  commission_enabled BOOLEAN NOT NULL DEFAULT false,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  group_name VARCHAR(80) NOT NULL DEFAULT 'Geral',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  permission_id INT NOT NULL REFERENCES permissions(id),
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  plate VARCHAR(20) NOT NULL,
  model VARCHAR(100),
  color VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  category_id INT NULL REFERENCES service_categories(id),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  image_url VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  vehicle_id INT NOT NULL REFERENCES vehicles(id),
  service_id INT NOT NULL REFERENCES services(id),
  responsible_user_id INT NULL REFERENCES users(id),
  scheduled_date DATE,
  scheduled_time VARCHAR(5),
  scheduled_period VARCHAR(20) CHECK (scheduled_period IN ('morning', 'afternoon', 'night')),
  origin VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'na_fila' CHECK (status IN
    ('agendado', 'na_fila', 'em_lavagem', 'em_acabamento', 'pronto', 'entregue', 'cancelado')),
  price DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN ('dinheiro', 'pix', 'cartao', 'fiado', 'cortesia')),
  notes TEXT,
  entry_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  start_time TIMESTAMP,
  finished_time TIMESTAMP,
  delivered_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  name VARCHAR(100) NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  bank_id INT NULL REFERENCES banks(id),
  auto_baixa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_method_installments (
  id SERIAL PRIMARY KEY,
  payment_method_id INT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  installment_count INT NOT NULL,
  fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (payment_method_id, installment_count)
);

CREATE TABLE IF NOT EXISTS payables (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  bank_id INT NULL REFERENCES banks(id),
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  service_order_id INT NOT NULL REFERENCES service_orders(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN ('dinheiro', 'pix', 'cartao', 'fiado', 'cortesia')),
  payment_method_id INT NULL REFERENCES payment_methods(id),
  bank_id INT NULL REFERENCES banks(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'cancelado')),
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  parent_payment_id INT NULL REFERENCES payments(id),
  installment_number INT,
  total_installments INT,
  due_date DATE,
  notes VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_working_hours (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  weekday SMALLINT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT false,
  open_time TIME,
  close_time TIME,
  has_lunch_break BOOLEAN NOT NULL DEFAULT false,
  lunch_start TIME,
  lunch_end TIME,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, weekday)
);

CREATE TABLE IF NOT EXISTS business_schedule_blocks (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  block_date DATE NOT NULL,
  is_full_day BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_schedule_settings (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL UNIQUE REFERENCES businesses(id),
  schedule_type VARCHAR(20) NOT NULL DEFAULT 'time_slots' CHECK (schedule_type IN ('time_slots', 'periods', 'daily')),
  slot_interval_minutes INT NOT NULL DEFAULT 60,
  vehicles_per_slot INT NOT NULL DEFAULT 1,
  daily_limit INT NOT NULL DEFAULT 20,
  morning_limit INT NOT NULL DEFAULT 8,
  afternoon_limit INT NOT NULL DEFAULT 10,
  night_limit INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Postgres não tem "ON UPDATE CURRENT_TIMESTAMP" (usado no MySQL original).
-- Um trigger reproduz o mesmo comportamento nas tabelas que dependiam disso.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_working_hours_updated_at ON business_working_hours;
CREATE TRIGGER trg_business_working_hours_updated_at
  BEFORE UPDATE ON business_working_hours
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_business_schedule_settings_updated_at ON business_schedule_settings;
CREATE TRIGGER trg_business_schedule_settings_updated_at
  BEFORE UPDATE ON business_schedule_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
