-- Migração: e-mail do aluno, bot de confirmação por WhatsApp, logs do sistema
-- Aplicada em 2026-10-07 no projeto naoqyfuvfqwdckbjemvw

-- 1. Dados do aluno no agendamento
alter table public.agendamentos add column if not exists email            text;
alter table public.agendamentos add column if not exists codigo           text;  -- código curto p/ citar no WhatsApp
alter table public.agendamentos add column if not exists confirmado_em    timestamptz;
alter table public.agendamentos add column if not exists confirmado_via   text;  -- 'painel' | 'whatsapp'

-- 2. Notificações passam a ter destinatário (aluno ou coordenador) e canal
alter table public.notificacoes add column if not exists destinatario text default 'aluno';
alter table public.notificacoes add column if not exists canal        text;  -- 'painel' | 'email' | 'whatsapp'

-- 3. Histórico de conversa do WhatsApp (o que o bot mandou e o que o coordenador respondeu)
create table if not exists public.mensagens_whatsapp (
  id          bigserial primary key,
  direcao     text not null,          -- 'enviada' | 'recebida'
  telefone    text,
  conteudo    text,
  tipo        text,                   -- 'text' | 'button' | 'interactive'
  payload     text,
  created_at  timestamptz default now()
);

-- 4. Registro de atividades (quem fez o quê, para o painel e para auditoria)
create table if not exists public.atividades (
  id          bigserial primary key,
  autor       text not null,          -- 'aluno' | 'coordenador' | 'sistema'
  acao        text not null,          -- 'agendou' | 'confirmou' | 'recusou' | 'transferiu' | ...
  detalhe     text,
  agendamento_id bigint,
  created_at  timestamptz default now()
);

-- 5. Última solicitação pendente enviada ao coordenador (para o "1" / "2" funcionar sem citar código)
create table if not exists public.bot_estado (
  telefone      text primary key,
  ultimo_agendamento_id bigint,
  updated_at    timestamptz default now()
);

-- 6. Índices
create index if not exists idx_agendamentos_codigo   on public.agendamentos (codigo);
create index if not exists idx_agendamentos_email    on public.agendamentos (email);
create index if not exists idx_atividades_created    on public.atividades (created_at desc);
create index if not exists idx_notificacoes_dest     on public.notificacoes (destinatario, created_at desc);
create index if not exists idx_msgs_whatsapp_created on public.mensagens_whatsapp (created_at desc);

-- RLS ligado e sem políticas: acesso apenas pelo servidor (service key).
alter table public.mensagens_whatsapp enable row level security;
alter table public.atividades         enable row level security;
alter table public.bot_estado         enable row level security;
