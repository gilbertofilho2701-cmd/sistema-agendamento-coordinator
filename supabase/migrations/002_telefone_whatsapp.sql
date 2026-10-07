-- Migração: telefone para WhatsApp + normalização de status
-- Aplicada em 2026-10-07 no projeto naoqyfuvfqwdckbjemvw

-- 1. Telefone do aluno (necessário para o envio por WhatsApp)
alter table public.agendamentos  add column if not exists telefone text;
alter table public.notificacoes  add column if not exists telefone text;

-- 2. Normalizar status antigos: a rota antiga gravava 'pendente', o painel filtra 'pending'
update public.agendamentos set status = 'pending' where status is null or status = '' or status = 'pendente';
update public.agendamentos set status = 'confirmed' where status = 'aprovado';
update public.agendamentos set status = 'rejected'  where status = 'rejeitado';

-- 3. Índices de apoio
create index if not exists idx_agendamentos_telefone on public.agendamentos (telefone);
create index if not exists idx_notificacoes_aluno    on public.notificacoes (aluno_id);

-- Observação: RLS permanece LIGADO e sem políticas (acesso somente via service key
-- nas rotas /api/*). Não criar políticas públicas: exporia os dados dos alunos
-- para quem tiver a chave anon, que vai no código do navegador.
