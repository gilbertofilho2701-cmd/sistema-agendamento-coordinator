-- Migração: bloco de notas do coordenador
-- Substitui o "chat" decorativo que existia no painel (não salvava em lugar nenhum).

create table if not exists public.anotacoes (
  id         bigserial primary key,
  texto      text not null,
  autor      text default 'coordenador',
  fixada     boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_anotacoes_created on public.anotacoes (created_at desc);

-- RLS ligado e sem políticas: acesso somente pelo servidor (service key).
alter table public.anotacoes enable row level security;
