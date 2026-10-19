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

**Login:** as rotas marcadas com 🔒 exigem a sessão do coordenador (token devolvido pelo
`POST /api/login`, enviado no cabeçalho `Authorization: Bearer <token>`). Sem o token elas
respondem `401`. As rotas sem marca são abertas de propósito: a página do aluno não tem login.

| Rota | Métodos | Para que serve |
| --- | --- | --- |
| `/api/slots` | GET (aberto) | ver horários livres — usado pela página do aluno |
| `/api/slots` 🔒 | POST, PUT, DELETE | criar, editar e apagar horários |
| `/api/agendamento` | POST (aberto) | o aluno pede o agendamento |
| `/api/agendamento` 🔒 | GET, PATCH | listar e aprovar/recusar |
| `/api/agendamento/all` 🔒 | DELETE | apaga todos os agendamentos ("Limpar tudo") |
| `/api/agendamento/pending` 🔒 | DELETE | apaga os pendentes |
| `/api/agendamento/transfer` 🔒 | PUT | remarcar atendimento |
| `/api/historico` | GET | histórico do aluno (por matrícula) |
| `/api/notificacao` | GET `?aluno_id=` | sino do aluno |
| `/api/notificacao` 🔒 | GET `?destinatario=coordenador`, POST, PATCH, DELETE | sino do coordenador, marcar lida, limpar |
| `/api/anotacoes` 🔒 | GET, POST, PUT, DELETE | bloco de notas do coordenador |
| `/api/atividades` 🔒 | GET | histórico de atividades |
| `/api/config` 🔒 | GET, POST | número de WhatsApp do coordenador |
| `/api/login` | POST | login do coordenador (confere usuário e senha no servidor e devolve o token) |
| `/api/credenciais` | GET (aberto) | diz o usuário e se já existe senha definida |
| `/api/credenciais` | PUT | troca a senha (exige a senha atual) |
| `/api/versao` | GET | versão publicada, para o navegador avisar quando a aba está desatualizada |
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
   (passo a passo em `WHATSAPP_SETUP.md`). Hoje a API responde `whatsapp.pulado: true`. O campo
   para trocar o número já existe no painel, em Configurações.
2. **Teste no celular do coordenador** — o login e a troca de senha foram validados no
   computador e em navegadores de celular simulados (Chrome, Samsung Internet e Firefox);
   falta o teste no aparelho dele, com o número real de WhatsApp.
3. **Safari do iPhone** — não foi possível testar nesta máquina (faltam bibliotecas do sistema
   para rodar o WebKit). Se algum aluno usar iPhone, vale conferir.

### Já resolvido
- **Autenticação das rotas de dados** (19/10/2026): criar, editar e apagar dados agora exige a
  sessão do coordenador (token assinado, 12 horas). As rotas do aluno continuam abertas de
  propósito, porque a página dele não tem login.
- **Horários de teste**: os 4 horários "Sala de Teste" de 18 e 19/10/2026 foram apagados; o
  banco ficou limpo (0 horários, 0 agendamentos, 0 anotações).
- **Troca de senha**: passou a valer em qualquer aparelho (antes ficava só no navegador onde
  foi feita), pedindo senha atual + nova senha + repetição.

## Licença

Uso interno — Coordenação Acadêmica.
