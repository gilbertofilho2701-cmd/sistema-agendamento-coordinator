# Deploy na Nuvem

## Status Atual

**Plataforma:** Vercel
**URL de produção:** https://coordinator-app-seven.vercel.app
**Comando de start:** `next start` (o mesmo código serve local e produção)

## Variáveis de Ambiente Necessárias

### Obrigatórias
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### E-mail (Gmail SMTP) — ver WHATSAPP_SETUP.md
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

### WhatsApp Business — ver WHATSAPP_SETUP.md
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_ID`
- `WHATSAPP_TO_COORDENADOR`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_TEMPLATE_ALUNO` / `WHATSAPP_TEMPLATE_COORDENADOR` / `WHATSAPP_TEMPLATE_LANG`

## Observações

- O sistema roda `next start` (o mesmo código serve local e produção).
  Existia um `server.js` separado que reimplementava as rotas e divergia do
  publicado — foi removido, pois causava funcionalidades que só falhavam no ar.
- `.env.local` está no `.gitignore` (não envia para GitHub)
- Migrações SQL ficam em `supabase/migrations/`

## Funcionalidades Implementadas

### Sistema de Agendamento
- Aluno agenda horário com nome, matrícula, curso, turma e e-mail
- Coordenador aprova, recusa ou remarca pelo painel ou WhatsApp
- Notificações: aluno por e-mail, coordenador por WhatsApp Business
- Histórico de atividades e notificações no painel

### Bloco de Notas
- Anotações salvas no banco (tabela `anotacoes`)
- Criar, editar, apagar e fixar no topo
- Aparece em qualquer navegador/aparelho

### Remarcação de Atendimentos
- Botão "Remarcar" disponível para pendentes e aprovados
- Modal com checkbox para liberar ou não o horário antigo
- Aluno recebe e-mail de notificação

### Login do Coordenador
- Funciona em celular (fallback sessionStorage)
- Mensagem de erro visível se houver falha de conexão
- Credenciais podem ser alteradas no painel

## Credenciais e Links

As credenciais do coordenador e links do sistema estão no repositório privado:
`https://github.com/gilmadara2872/coordinator-app-credentials`
