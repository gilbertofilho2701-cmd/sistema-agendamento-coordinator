# Sistema de Agendamento para Coordenação Acadêmica

Sistema web para agendamento de atendimentos entre alunos e coordenação acadêmica, com notificações por e-mail (aluno) e WhatsApp Business (coordenador).

## Funcionalidades

### Para o Aluno
- Agenda horário de atendimento com nome, matrícula, curso, turma e e-mail
- Recebe notificação por e-mail quando o coordenador confirma, recusa ou remarca
- Consulta histórico de agendamentos
- Recebe notificação no sino do site

### Para o Coordenador
- Painel com login para gerenciar horários e agendamentos
- Aprova, recusa ou remarca atendimentos pelo painel ou WhatsApp
- Recebe notificação no WhatsApp com botões interativos (Confirmar/Recusar)
- Bloco de notas para anotações pessoais
- Histórico de atividades e notificações
- Configuração do número de WhatsApp

## Automação

### Keep do Banco de Dados
- GitHub Action que faz ping no banco Supabase a cada 6 dias
- Evita a hibernação do plano free (que dorme após 7 dias sem atividade)
- Pode ser rodado manualmente (workflow_dispatch)

## Tecnologias

- **Frontend:** Next.js + React + Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Banco de dados:** Supabase (PostgreSQL)
- **E-mail:** Nodemailer (Gmail SMTP)
- **WhatsApp:** Meta Cloud API (WhatsApp Business)
- **Deploy:** Vercel

## Configuração Local

### Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Conta no Vercel (para produção)

### Passo a passo

1. Clone o repositório:
```bash
git clone https://github.com/SEU_USUARIO/sistema-agendamento-coordinator.git
cd sistema-agendamento-coordinator
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (`.env.local`):
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

4. Execute as migrações do banco (pasta `supabase/migrations/`)

5. Inicie o servidor:
```bash
npm run dev
```

6. Acesse:
- Aluno: http://localhost:3000
- Coordenador: http://localhost:3000/painel

## Deploy na Vercel

1. Importe o repositório na Vercel
2. Adicione as variáveis de ambiente (veja `DEPLOY.md`)
3. Deploy automático a cada push na main

## Documentação

- **Deploy e variáveis:** `DEPLOY.md`
- **Configuração WhatsApp/e-mail:** `WHATSAPP_SETUP.md`
- **Credenciais locais:** `.private/CREDENCIAIS.md` (não enviada ao GitHub)

## Estrutura do Projeto

```
├── pages/
│   ├── index.js          # Página do aluno
│   ├── painel.js         # Painel do coordenador
│   └── api/              # Rotas da API
├── lib/                  # Funções auxiliares
│   ├── email.js          # Envio de e-mail
│   ├── whatsapp.js       # WhatsApp Business
│   ├── bot.js            # Lógica do bot
│   └── notificar.js      # Notificações
├── supabase/
│   └── migrations/       # Migrações do banco
├── styles/               # CSS global
└── .private/             # Credenciais (ignorada pelo git)
```

## Licença

Uso interno — Coordenação Acadêmica.
