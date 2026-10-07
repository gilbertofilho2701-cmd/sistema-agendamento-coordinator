# Como ativar o aviso por WhatsApp (API oficial do WhatsApp Business)

O sistema já está preparado. Falta criar a conta na Meta e colar 4 valores no Vercel.
Enquanto isso não for feito, o sistema funciona normalmente — só não manda WhatsApp.

## Resumo do que o sistema faz hoje

| Evento | Aluno recebe | Coordenador recebe |
|---|---|---|
| Aluno pede um horário | — | WhatsApp: nome, matrícula, curso/turma, data, hora e motivo |
| Coordenador aprova | WhatsApp + sino no site | — |
| Coordenador recusa | WhatsApp + sino no site | — |
| Coordenador transfere | WhatsApp + sino no site | — |

O "sino no site" é a página do aluno (a bolinha vermelha em 🔔 Notificações).
O WhatsApp chega no celular mesmo com o site fechado.

---

## Passo 1 — Criar o app na Meta (grátis)

1. Entre em https://developers.facebook.com/apps e faça login com o Facebook.
2. **Create App** → tipo **Business** → dê um nome (ex: `Agendamento Coordenação`).
3. No painel do app, na lista de produtos, clique em **WhatsApp** → **Set up**.
4. A Meta cria automaticamente um **número de teste** que envia para até 5 números
   cadastrados. Serve para testar tudo antes de pagar nada.

## Passo 2 — Pegar os 4 valores

No menu **WhatsApp → API Setup**:

| O que copiar | Onde está | Vira a variável |
|---|---|---|
| **Phone number ID** | abaixo do número de teste | `WHATSAPP_PHONE_ID` |
| **Temporary access token** | botão "Generate" (dura 24h, só para testar) | `WHATSAPP_TOKEN` |
| **To** (número do coordenador) | você adiciona o número dele na lista de destinatários de teste | `WHATSAPP_TO_COORDENADOR` |

E invente um quarto valor, você mesmo, para o webhook:

| `WHATSAPP_VERIFY_TOKEN` | qualquer texto secreto, ex: `coord-2026-xk92` |

> Importante no modo de teste: o número do **coordenador** e o do **aluno**
> precisam estar cadastrados na lista "To" da Meta (até 5 números), senão o
> envio é recusado.

## Passo 3 — Colar no Vercel

No painel do Vercel do projeto → **Settings → Environment Variables**, adicione
(marque **Production**):

```
WHATSAPP_TOKEN            = <token da Meta>
WHATSAPP_PHONE_ID         = <phone number id>
WHATSAPP_TO_COORDENADOR   = +5588999999999
WHATSAPP_VERIFY_TOKEN     = coord-2026-xk92
```

Depois **Deployments → Redeploy** para valer.

Também dá para colar pelo terminal:

```bash
cd /home/gilmadara/coordinator-app
printf '%s' '<TOKEN>'      | vercel env add WHATSAPP_TOKEN production
printf '%s' '<PHONE_ID>'   | vercel env add WHATSAPP_PHONE_ID production
printf '%s' '5588999999999'| vercel env add WHATSAPP_TO_COORDENADOR production
printf '%s' 'coord-2026-xk92' | vercel env add WHATSAPP_VERIFY_TOKEN production
```

## Passo 4 — Cadastrar o webhook (para receber respostas)

Em **WhatsApp → Configuration → Webhook → Edit**:

- **Callback URL:** `https://coordinator-app-seven.vercel.app/api/whatsapp/webhook`
- **Verify token:** o mesmo texto do `WHATSAPP_VERIFY_TOKEN`
- Clique **Verify and save** e assine o campo **messages**.

## Passo 5 — Testar

1. Abra `https://coordinator-app-seven.vercel.app/painel` e entre.
2. **⚙️ Configurações → WhatsApp do coordenador** → digite o número com DDD → Salvar.
3. Em outra aba, agende um horário como aluno (informando o WhatsApp dele).
4. O celular do coordenador deve receber a mensagem com os dados da solicitação.

---

## A janela de 24 horas (limitação da Meta)

A Meta só permite **texto livre** dentro de 24h depois da última mensagem que a
pessoa mandou para o seu número. Fora dessa janela, é obrigatório usar um
**modelo aprovado** (template).

Para uso contínuo (sem depender de alguém ter escrito primeiro), crie os modelos:

1. **WhatsApp → Message Templates → Create template**
2. Categoria **Utility**, idioma **Português (BR)**
3. Corpo sugerido para o aluno:
   `Seu agendamento foi atualizado: {{1}}`
4. Corpo sugerido para o coordenador:
   `Nova solicitação de atendimento: {{1}}`
5. Espere a aprovação (costuma sair em minutos) e cadastre no Vercel:

```
WHATSAPP_TEMPLATE_ALUNO       = atualizacao_agendamento
WHATSAPP_TEMPLATE_COORDENADOR = nova_solicitacao
WHATSAPP_TEMPLATE_LANG        = pt_BR
```

Com os modelos cadastrados, o sistema passa a usá-los automaticamente.

## Custo

- Conversas iniciadas pelo **negócio** (o seu caso) são cobradas por mensagem,
  em reais, a partir de ~R$ 0,04 a R$ 0,08 por conversa de 24h. Para o volume de
  uma coordenação acadêmica, o gasto mensal é de poucos reais.
- O modo de teste (número de teste da Meta) é grátis.
- Para sair do modo de teste e usar o número real da coordenação, é preciso
  **verificar o negócio (Business Verification)** e registrar um número que não
  esteja em uso no WhatsApp comum.

## Alternativa sem custo e sem verificação

Se a burocracia da Meta travar, existe a opção de um servidor não oficial
(Evolution API / WPPConnect) rodando com o WhatsApp comum do coordenador: sem
custo por mensagem e sem verificação de negócio, porém com risco de bloqueio do
número e sem garantia oficial. Nesse caso o sistema só precisa trocar a função
`enviarWhatsApp` em `lib/whatsapp.js` — o resto continua igual.
