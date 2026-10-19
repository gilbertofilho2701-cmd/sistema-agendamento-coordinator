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
- `SMTP_PASS`  (precisa ser **senha de app** do Gmail, 16 letras)
- `EMAIL_FROM`

Todas já estão configuradas no Vercel (produção) e o envio foi verificado:
`POST /api/agendamento` responde `aviso_aluno.email.ok: true` com o id da mensagem.
Obs.: `.env.local` (local) não tem `SMTP_PASS`, então o envio não funciona rodando local —
só no ar. Para testar local, gerar uma senha de app e preencher no `.env.local`.

### Credenciais do coordenador (opcional — recuperação de senha)
- `COORDENADOR_USER` / `COORDENADOR_PASS` (nomes antigos, já existem no Vercel)
- `COORDENADOR_USUARIO` / `COORDENADOR_SENHA` (mesma função)

Se existirem, essas credenciais **sempre valem** no login, mesmo depois de o coordenador
trocar a senha no painel — e a senha delas também é aceita no campo "Senha Atual" da troca
de senha. É a saída completa para senha esquecida (entrar e definir uma nova). Sem elas, a recuperação é
apagar as linhas `coordenador_usuario` e `coordenador_senha` da tabela `configuracoes`
(o sistema volta a aceitar a senha padrão `123456`).

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
- Conferido no **servidor** (`POST /api/login`), com a senha guardada como hash scrypt
  na tabela `configuracoes` — não fica em texto e não fica no navegador
- Usuário padrão: `coordenadorvinicicu@gmail.com` (troca dentro do painel)
- Senha definida/trocada pelo coordenador na **tela de login** (link
  "Definir / alterar senha do coordenador") ou em **Configurações (⚙️)** no painel.
  Os dois caminhos pedem **senha atual + nova senha + repetir a nova** (mínimo 6 caracteres)
- A troca vale em qualquer aparelho (antes ficava só no navegador onde foi feita — era um bug)
- Botão **Sair** no topo do painel
- Funciona em celular; mensagem de erro visível se houver falha de conexão

### Sino de Notificações
- Coordenador pode marcar notificações como lidas ou limpar todo o histórico
- Botão "Limpar tudo" disponível no modal de notificações
- Endpoint: `DELETE /api/notificacao?destinatario=coordenador`

## Pendências

1. **WhatsApp Business do coordenador** — depende do coordenador (token, phone id e template
   aprovado pela Meta). Passo a passo em `WHATSAPP_SETUP.md`. Enquanto isso, a API responde
   `whatsapp.pulado: true` e o coordenador só recebe aviso no sino do painel.
2. **Teste no celular do coordenador** — login e troca de senha foram validados no computador
   e em navegadores de celular simulados (Chrome, Samsung Internet, Firefox). Falta o aparelho
   dele, com o número real de WhatsApp.
3. **Safari do iPhone** — não testado (faltam bibliotecas do sistema nesta máquina para rodar
   o WebKit do Playwright).

### Resolvido em 19/10/2026
- **Rotas de dados protegidas**: `/api/slots` (criar/editar/apagar), `/api/agendamento`
  (lista completa e aprovar/recusar), `/api/agendamento/all`, `/api/agendamento/pending`,
  `/api/agendamento/transfer`, `/api/anotacoes`, `/api/atividades`, `/api/config` e o sino do
  coordenador exigem sessão (token `Authorization: Bearer ...`, 12 horas). Sem token: 401.
  As rotas do aluno (ver horários livres, pedir agendamento, histórico e o próprio sino)
  continuam abertas de propósito.
- **Horários de teste** apagados (0 horários, 0 agendamentos, 0 anotações no banco).

## Segurança das rotas

O painel guarda um token assinado (HMAC) no navegador e manda em todas as chamadas:
`Authorization: Bearer <token>`. O token vale 12 horas e é gerado no `POST /api/login`.

- O segredo da assinatura é a variável `SESSION_SECRET`, se existir. Sem ela, o segredo é
  derivado da senha do coordenador — assim, **trocar a senha derruba as sessões antigas**.
- Sem token válido, as rotas do coordenador respondem `401` e o painel volta para a tela de login.
- As rotas do aluno continuam abertas (a página dele não tem login, por decisão do projeto):
  `GET /api/slots`, `POST /api/agendamento`, `GET /api/agendamento?resumo=1`,
  `GET /api/agendamento?aluno_id=xxx`, `GET /api/historico`, `GET /api/notificacao?aluno_id=`.
  Ao mexer nelas, testar a página do aluno — foi assim que apareceu que o `GET /api/agendamento`
  completo não podia ficar aberto nem podia ser fechado sem mais nada (a página precisava de um
  recorte: só os próprios pedidos e um resumo dos pendentes).
- O painel avisa quando a aba está com uma versão antiga da página (`GET /api/versao`) — foi o
  que causou a confusão do coordenador no celular: a aba velha conferia a senha no próprio
  navegador e recusava a senha nova. Ao ver a faixa amarela, tocar em "Atualizar".

## Observações de manutenção

- **Teste que escreve no banco precisa se limpar.** A página do aluno não tem botão de apagar
  agendamento: quem cria um pedido de teste só consegue removê-lo pelo banco. Use
  `testes/e2e-aluno.js` (cria um horário marcado, roda o fluxo e apaga tudo no `finally`, mesmo
  quando falha) e `testes/limpar-testes.sh` para conferir sobras. Um teste antigo que falhou no
  meio deixou um pedido de "Teste Automatico Hermes" pendurado — foi assim que se descobriu isso.
- **Ordem do fluxo do aluno**: identificar -> **escrever o motivo** -> escolher o horário ->
  confirmar. Clicar no horário com o motivo vazio não abre a confirmação (o app pede o motivo
  primeiro), então um teste que inverte a ordem trava esperando o botão "Confirmar".
- **Não rode `npm run build` com o servidor de dev ligado na mesma pasta**: o build apaga a
  pasta `.next` e o dev passa a responder 500 em todas as páginas. Se acontecer, pare o dev,
  apague `.next` e suba de novo.
- Apagar um agendamento direto no banco **não libera o horário**. O `POST /api/agendamento`
  marca `disponivel: false` no horário; para liberar, usar a recusa/remarcação no painel ou
  atualizar `horarios_disponiveis.disponivel = true`.
- A troca de senha grava nas chaves `coordenador_usuario` e `coordenador_senha` da tabela
  `configuracoes`. Apagar essas duas linhas volta o sistema para a senha padrão `123456`.
- O Vercel **bloqueia o deploy** quando o autor do commit não é o e-mail da conta
  (`gilbertofilho2701@gmail.com`). Conferir `git config user.email` antes de commitar.

## Credenciais e Links

As credenciais do coordenador e links do sistema estão na pasta `.private/` dentro deste repositório.
Essa pasta está no `.gitignore` e **não é enviada para o GitHub** — só existe no seu computador local.
