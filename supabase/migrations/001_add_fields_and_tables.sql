-- Adicionar colunas na tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS curso TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS turma TEXT;

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGSERIAL PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para notificações
CREATE INDEX IF NOT EXISTS idx_notificacoes_aluno_id ON notificacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON notificacoes(created_at DESC);

-- Criar índice para histórico por matrícula
CREATE INDEX IF NOT EXISTS idx_agendamentos_matricula ON agendamentos(matricula);
