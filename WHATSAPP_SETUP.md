# Avisos do sistema — e-mail do aluno e WhatsApp do coordenador

## Como funciona

| Evento | Aluno recebe | Coordenador recebe |
|---|---|---|
| Aluno pede um horário | e-mail "recebemos sua solicitação" + sino no site | WhatsApp com botões + sino no painel |
| Coordenador confirma | e-mail de confirmação + sino | — |
| Coordenador recusa | e-mail avisando + sino | — |
| Coordenador remarca | e-mail com a nova data + sino | — |

- **Aluno → e-mail.** Grátis, sem burocracia. O aluno informa o e-mail no formulário
  (é obrigatório; o sistema não deixa agendar sem um e-mail válido).
- **Coordenador → WhatsApp.** Ele recebe a solicitação no celular e decide ali mesmo.
- **Sino no site.** Os dois têm uma lista de notificações dentro do sistema
  (aluno no botão 🔔 da página dele; coordenador no 🔔 do painel, junto com o
  histórico de atividades).

## O coordenador confirma sem entrar no sistema

Ele recebe isto no WhatsApp:

```
📅 Nova solicitação de atendimento

👤 Ana Costa
🎓 Matrícula: 2024777  |  ADM / A1
🕒 20/12/2026 às 09:00
📝 quero falar sobre TCC
✉️ ana@exemplo.com
🔖 Código: 683D

[ ✅ Confirmar ]   [ ❌ Recusar ]
```

E pode responder de várias formas:

| Ação dele | O que acontece |
|---|---|
| Toca em **✅ Confirmar** | Confirma; o aluno recebe o e-mail na hora |
| Toca em **❌ Recusar** | Recusa e devolve o horário para a lista |
| Digita **1** ou **2** | Vale para a última solicitação enviada |
| Digita **CONFIRMAR 683D** | Vale para uma solicitação específica (pelo código) |
| Digita **LISTA** | Recebe a lista das pendentes com os códigos |
| Digita **AJUDA** | Recebe as instruções |

Tudo que ele decide pelo WhatsApp fica marcado no sistema como
"✅ decidido pelo WhatsApp" e entra no histórico de atividades.

---

## Configurar o e-mail do aluno (grátis)

Funciona com o Gmail da coordenação. **Não use a senha normal do Gmail** — o
Google exige uma "senha de app":

1. Ative a verificação em duas etapas em https://myaccount.google.com/security
2. Acesse https://myaccount.google.com/apppasswords
3. Crie uma senha de app (nome: `Agendamento`) — o Google mostra 16 letras
4. No Vercel → **Settings → Environment Variables** (marque **Production**):

```
SMTP_HOST  = smtp.gmail.com
SMTP_PORT  = 465
SMTP_USER  = coordenacao@gmail.com
SMTP_PASS  = as16letrasdosenhadeapp
EMAIL_FROM = Coordenação Acadêmica <coordenacao@gmail.com>
```

Depois **Deployments → Redeploy**.

> A senha de app dá acesso ao envio de e-mails da conta. Se preferir não usar o
> Gmail pessoal, crie uma conta nova só para a coordenação.

---

## Configurar o WhatsApp do coordenador

### 1. Criar o app na Meta (grátis)

1. https://developers.facebook.com/apps → **Create App** → tipo **Business**
2. No painel, adicione o produto **WhatsApp** → **Set up**
3. A Meta cria um **número de teste** grátis que envia para até 5 números cadastrados

### 2. Pegar os valores

Em **WhatsApp → API Setup**:

| Copiar | Vira a variável |
|---|---|
| **Phone number ID** | `WHATSAPP_PHONE_ID` |
| **Temporary access token** (dura 24h, só para testar) | `WHATSAPP_TOKEN` |
| Adicione o número do coordenador na lista **To** | `WHATSAPP_TO_COORDENADOR` |
| Invente um texto secreto | `WHATSAPP_VERIFY_TOKEN` |

> No modo de teste, o número do coordenador **precisa** estar na lista "To".

### 3. Colar no Vercel

```
WHATSAPP_TOKEN          = <token da Meta>
WHATSAPP_PHONE_ID       = <phone number id>
WHATSAPP_TO_COORDENADOR = 5588999999999
WHATSAPP_VERIFY_TOKEN   = coord-2026-xk92
```

### 4. Cadastrar o webhook (indispensável para o bot)

Sem este passo o coordenador recebe a mensagem, mas os botões não funcionam.

Em **WhatsApp → Configuration → Webhook → Edit**:

- **Callback URL:** `https://coordinator-app-seven.vercel.app/api/whatsapp/webhook`
- **Verify token:** o mesmo texto do `WHATSAPP_VERIFY_TOKEN`
- Clique **Verify and save** e assine o campo **messages**

### 5. Informar o número no painel

Painel → **⚙️ Configurações → WhatsApp do coordenador** → número com DDD → Salvar.

---

## A janela de 24 horas (limitação da Meta)

A Meta só permite **texto livre e botões** dentro de 24h após a última mensagem
que a pessoa mandou para o seu número. Como o coordenador responde ao bot, essa
janela normalmente se renova sozinha. Se ficar muito tempo sem interação, a
mensagem pode ser recusada — nesse caso crie **modelos aprovados**:

1. **WhatsApp → Message Templates → Create template**
2. Categoria **Utility**, idioma **Português (BR)**
3. Corpo sugerido: `Nova solicitação de atendimento: {{1}}`
4. Após aprovar, cadastre no Vercel:

```
WHATSAPP_TEMPLATE_COORDENADOR = nova_solicitacao
WHATSAPP_TEMPLATE_ALUNO       = atualizacao_agendamento
WHATSAPP_TEMPLATE_LANG        = pt_BR
```

## Custo

- Conversas iniciadas pelo negócio: ~R$ 0,04 a R$ 0,08 por conversa de 24h.
  Para uma coordenação acadêmica, poucos reais por mês.
- Modo de teste da Meta: grátis.
- E-mail pelo Gmail: grátis.

## Alternativa sem custo e sem verificação de negócio

Se a burocracia da Meta travar, existe a opção de um servidor não oficial
(Evolution API / WPPConnect) com o WhatsApp comum do coordenador: sem custo por
mensagem e sem verificação de negócio, mas com risco de bloqueio do número.
Nesse caso só é preciso trocar as funções de envio em `lib/whatsapp.js` —
o bot e o resto do sistema continuam iguais.
