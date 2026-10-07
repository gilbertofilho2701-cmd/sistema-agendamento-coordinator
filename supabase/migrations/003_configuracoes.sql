-- Migração: tabela de configurações do sistema
-- Guarda o número de WhatsApp do coordenador (editável pelo painel).

create table if not exists public.configuracoes (
  chave      text primary key,
  valor      text,
  updated_at timestamptz default now()
);

-- RLS ligado e sem políticas: leitura/escrita apenas pelo servidor (service key).
alter table public.configuracoes enable row level security;
