-- ============================================================
-- ProtocoloBrasil — Schema Supabase
-- Execute no SQL Editor do dashboard do Supabase
-- ============================================================

-- 1. Tabela principal de consultas
CREATE TABLE IF NOT EXISTS consultas (
  id               BIGSERIAL PRIMARY KEY,
  crm              TEXT        NOT NULL,
  uf               CHAR(2)     NOT NULL,
  especialidade    TEXT,
  query            TEXT        NOT NULL,
  tipo             CHAR(1)     DEFAULT 'p',   -- 'k'=PCDT, 'p'=Protocolo, 'r'=Raro, 'i'=Internacional
  fonte_internacional BOOLEAN  DEFAULT FALSE,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para queries de analytics
CREATE INDEX IF NOT EXISTS idx_consultas_uf        ON consultas (uf);
CREATE INDEX IF NOT EXISTS idx_consultas_esp       ON consultas (especialidade);
CREATE INDEX IF NOT EXISTS idx_consultas_tipo      ON consultas (tipo);
CREATE INDEX IF NOT EXISTS idx_consultas_criado_em ON consultas (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_consultas_crm       ON consultas (crm);

-- 3. Tabela de sessões (histórico por médico)
CREATE TABLE IF NOT EXISTS sessoes (
  id          BIGSERIAL PRIMARY KEY,
  crm         TEXT        NOT NULL,
  uf          CHAR(2)     NOT NULL,
  titulo      TEXT,
  tipo        CHAR(1)     DEFAULT 'p',
  msgs        JSONB,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_crm ON sessoes (crm);

-- 4. Row Level Security — dados de consulta são públicos para leitura agregada
--    mas só inserção autenticada (via service key no backend)
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes   ENABLE ROW LEVEL SECURITY;

-- Permite INSERT via service key (backend)
CREATE POLICY "backend_insert_consultas"
  ON consultas FOR INSERT
  WITH CHECK (true);

-- Permite SELECT agregado (analytics) via service key
CREATE POLICY "backend_select_consultas"
  ON consultas FOR SELECT
  USING (true);

CREATE POLICY "backend_insert_sessoes"
  ON sessoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "backend_select_sessoes"
  ON sessoes FOR SELECT
  USING (true);

-- 5. View útil para analytics rápido
CREATE OR REPLACE VIEW analytics_resumo AS
SELECT
  COUNT(*)                                                    AS total_consultas,
  COUNT(DISTINCT crm)                                         AS medicos_unicos,
  COUNT(DISTINCT uf)                                          AS estados_ativos,
  ROUND(COUNT(*) FILTER (WHERE tipo IN ('k','r')) * 100.0 / NULLIF(COUNT(*),0), 1) AS pct_pcdt,
  ROUND(COUNT(*) FILTER (WHERE fonte_internacional) * 100.0 / NULLIF(COUNT(*),0), 1) AS pct_internacional,
  MIN(criado_em)                                              AS primeira_consulta,
  MAX(criado_em)                                              AS ultima_consulta
FROM consultas;

-- ============================================================
-- PRONTO! Copie a SUPABASE_URL e SUPABASE_SERVICE_KEY
-- do dashboard: Settings → API
-- ============================================================
