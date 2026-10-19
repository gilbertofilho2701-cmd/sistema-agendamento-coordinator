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
- Sino de notificações com opção de marcar como limpar histórico
- Bloco de notas para anotações pessoais
- Histórico de atividades e notificações
- Configuração do número de WhatsApp

## Automação

### Keep do Banco de Dados
- GitHub Action que faz ping no banco Supabase a cada 6 dias
- Evita a hibernação do plano free (que dorme após 7 dias sem atividade)
- Pode ser rodado manualmente (workflow_dispatch)

### Notificações Automáticas
- **E-mail (aluno):** Nodemailer com Gmail SMTP
  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
- **WhatsApp (coordenador):** Meta Cloud API
  - WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TO_COORDENADOR, WHATSAPP_VERIFY_TOKEN
  - Webhook configurado para receber respostas do coordenador
  - Botões interativos: Confirmar, Recusar, Remarcar

### Login do Coordenador
- **Usuário:** `coordenadorvinicicu@gmail.com` (pode ser trocado dentro do painel)
- **Senha:** definida pelo próprio coordenador na tela de login, no link *"Definir / alterar senha do coordenador"*
  - pede **senha atual + nova senha + repetir a nova** (mínimo 6 caracteres)
  - também dá para trocar dentro do painel, em **Configurações (⚙️)**
- A senha fica no banco (tabela `configuracoes`, chaves `coordenador_usuario` / `coordenador_senha`),
  guardada como hash scrypt com salt — **nunca em texto** e nunca no navegador.
  Vale em qualquer aparelho; o navegador guarda apenas a marcação da sessão (`painel_auth`).
- Enquanto nenhuma senha estiver definida no banco, vale a senha padrão `123456`
  (o campo "Senha Atual" aceita ela). Depois da primeira definição, ela deixa de funcionar.
- Botão **Sair** no topo do painel.
- **Recuperação** (senha esquecida): definir `COORDENADOR_USUARIO` / `COORDENADOR_SENHA`
  (ou os nomes antigos `COORDENADOR_USER` / `COORDENADOR_PASS`) nas variáveis de ambiente do Vercel —
  elas sempre valem no login e também são aceitas no campo "Senha Atual" da troca, então servem
  para entrar e definir uma senha nova. Alternativa: apagar as linhas `coordenador_*` da tabela
  `configuracoes` (o sistema volta a aceitar a senha padrão `123456`).

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

## Rotas de API

| Rota | Métodos | Para que serve |
| --- | --- | --- |
| `/api/slots` | GET, POST, PUT, DELETE | horários disponíveis (DELETE apaga também os agendamentos ligados) |
| `/api/agendamento` | GET, POST, PATCH | criar, listar e aprovar/recusar agendamentos |
| `/api/agendamento/all` | GET | todos os agendamentos |
| `/api/agendamento/pending` | GET | só os pendentes |
| `/api/agendamento/transfer` | PUT | remarcar atendimento |
| `/api/historico` | GET | histórico do aluno (por matrícula) |
| `/api/notificacao` | GET, PATCH, DELETE | sino do aluno e do coordenador |
| `/api/anotacoes` | GET, POST, PUT, DELETE | bloco de notas do coordenador |
| `/api/atividades` | GET | histórico de atividades |
| `/api/config` | GET, POST | número de WhatsApp do coordenador |
| `/api/login` | POST | login do coordenador (confere usuário e senha no servidor) |
| `/api/credenciais` | GET, PUT | consultar / trocar usuário e senha do coordenador |
| `/api/whatsapp/webhook` | GET, POST | webhook do WhatsApp Business |
| `/api/keep-alive` | GET | mantém o Supabase acordado |

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
│   ├── credenciais.js    # Usuário/senha do coordenador (hash scrypt, no banco)
│   └── notificar.js      # Notificações
├── supabase/
│   └── migrations/       # Migrações do banco
├── styles/               # CSS global
└── .private/             # Credenciais (ignorada pelo git)
```

## Status do Projeto

### Funcionando em produção
- Página do aluno: identificação, motivo da reunião, escolha de horário, histórico e notificações
- Painel do coordenador: login no servidor, horários, solicitações, aprovar/recusar/remarcar,
  bloco de notas, sino, atividades, número de WhatsApp e troca de senha
- Notificação por **e-mail para o aluno** (testado: a API responde `aviso_aluno.email.ok: true`)
- Keep-alive do Supabase por GitHub Action (`.github/workflows/keep_supabase_awake.yml`)
- Deploy automático no Vercel a cada push na `main`

### Pendente
1. **WhatsApp Business do coordenador** — depende de token, phone id e template aprovado pela Meta
   (passo a passo em `WHATSAPP_SETUP.md`). Hoje a API responde `whatsapp.pulado: true`.
2. **Autenticação nas rotas de dados** — `/api/slots`, `/api/agendamento`, `/api/anotacoes` e
   `/api/config` respondem para qualquer pessoa que tenha a URL. O login do painel hoje é
   apenas uma porta visual: quem souber a URL consegue ler e apagar dados pela API.
3. **Limpar os horários de teste** — hoje existem 4 horários de exemplo ("Sala de Teste") em
   2026-10-18 e 2026-10-19. Apagar antes de abrir para os alunos de verdade.
4. **Testar no celular do coordenador** — o login e a troca de senha foram testados no
   navegador do computador; falta o teste no aparelho dele.

## Licença

Uso interno — Coordenação Acadêmica.
