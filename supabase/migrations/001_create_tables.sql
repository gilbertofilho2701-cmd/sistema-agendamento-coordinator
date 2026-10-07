-- Criar tabela de horários disponíveis
CREATE TABLE IF NOT EXISTS horarios_disponiveis (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  disponivel BOOLEAN DEFAULT true,
  local TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id BIGSERIAL PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  horario_id BIGINT REFERENCES horarios_disponiveis(id),
  motivo TEXT,
  status TEXT DEFAULT 'pending',
  nome TEXT,
  matricula TEXT,
  curso TEXT,
  turma TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGSERIAL PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_horarios_data ON horarios_disponiveis(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_aluno ON agendamentos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_matricula ON agendamentos(matricula);
CREATE INDEX IF NOT EXISTS idx_notificacoes_aluno ON notificacoes(aluno_id);
