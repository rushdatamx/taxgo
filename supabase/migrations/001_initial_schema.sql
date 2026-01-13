-- TaxGo - Initial Database Schema
-- Para ejecutar en Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  rfc VARCHAR(13),
  nombre_fiscal VARCHAR(255),
  regimen VARCHAR(50) DEFAULT 'RESICO',
  fecha_alta_resico DATE,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banks table
CREATE TABLE IF NOT EXISTS banks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  parser_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default banks
INSERT INTO banks (name) VALUES
  ('Santander'),
  ('BBVA'),
  ('Banorte'),
  ('Citibanamex'),
  ('HSBC'),
  ('Scotiabank')
ON CONFLICT (name) DO NOTHING;

-- Bank statements table
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_id UUID REFERENCES banks(id) NOT NULL,
  period VARCHAR(7) NOT NULL, -- YYYY-MM format
  file_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  statement_id UUID REFERENCES bank_statements(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  category VARCHAR(100),
  matched_invoice_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table (from miadmin)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  uuid_fiscal VARCHAR(36) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('emitida', 'recibida')),
  fecha DATE NOT NULL,
  rfc_emisor VARCHAR(13) NOT NULL,
  rfc_receptor VARCHAR(13) NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  iva DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  concepto TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  period VARCHAR(7) NOT NULL, -- YYYY-MM format
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, uuid_fiscal)
);

-- Add foreign key reference after invoices table is created
ALTER TABLE bank_transactions
  ADD CONSTRAINT fk_matched_invoice
  FOREIGN KEY (matched_invoice_id)
  REFERENCES invoices(id)
  ON DELETE SET NULL;

-- Reconciliations table
CREATE TABLE IF NOT EXISTS reconciliations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period VARCHAR(7) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completo', 'con_diferencias')),
  total_ingresos_banco DECIMAL(15, 2) DEFAULT 0,
  total_ingresos_facturas DECIMAL(15, 2) DEFAULT 0,
  diferencia_ingresos DECIMAL(15, 2) DEFAULT 0,
  total_egresos_banco DECIMAL(15, 2) DEFAULT 0,
  total_egresos_facturas DECIMAL(15, 2) DEFAULT 0,
  diferencia_egresos DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

-- Tax calculations table
CREATE TABLE IF NOT EXISTS tax_calculations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period VARCHAR(7) NOT NULL,
  base_isr DECIMAL(15, 2) DEFAULT 0,
  isr_calculado DECIMAL(15, 2) DEFAULT 0,
  iva_trasladado DECIMAL(15, 2) DEFAULT 0,
  iva_acreditable DECIMAL(15, 2) DEFAULT 0,
  iva_a_pagar DECIMAL(15, 2) DEFAULT 0,
  fecha_limite_pago DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado', 'vencido')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_period ON bank_statements(user_id, period);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement ON bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_period ON invoices(user_id, period);
CREATE INDEX IF NOT EXISTS idx_reconciliations_user_period ON reconciliations(user_id, period);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_user_period ON tax_calculations(user_id, period);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bank statements policies
CREATE POLICY "Users can view own statements" ON bank_statements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own statements" ON bank_statements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own statements" ON bank_statements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own statements" ON bank_statements FOR DELETE USING (auth.uid() = user_id);

-- Bank transactions policies (via statement ownership)
CREATE POLICY "Users can view own transactions" ON bank_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bank_statements WHERE bank_statements.id = bank_transactions.statement_id AND bank_statements.user_id = auth.uid()
  ));

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Reconciliations policies
CREATE POLICY "Users can view own reconciliations" ON reconciliations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reconciliations" ON reconciliations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reconciliations" ON reconciliations FOR UPDATE USING (auth.uid() = user_id);

-- Tax calculations policies
CREATE POLICY "Users can view own tax calculations" ON tax_calculations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tax calculations" ON tax_calculations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tax calculations" ON tax_calculations FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Banks are public (read-only for everyone)
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banks are viewable by everyone" ON banks FOR SELECT USING (true);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reconciliations_updated_at BEFORE UPDATE ON reconciliations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_calculations_updated_at BEFORE UPDATE ON tax_calculations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
