# Credenciais e Links do Sistema

> **ATENÇÃO:** Este repositório é PRIVADO. Não compartilhe publicamente.

## Links do Sistema

| Descrição | URL |
|-----------|-----|
| Página do aluno | https://coordinator-app-seven.vercel.app/ |
| Painel do coordenador | https://coordinator-app-seven.vercel.app/painel |
| Webhook WhatsApp | https://coordinator-app-seven.vercel.app/api/whatsapp/webhook |

## Credenciais do Coordenador

| Campo | Valor |
|-------|-------|
| Usuário | `viniciucoodernador` |
| Senha | `123456` |

## Variáveis de Ambiente (Vercel)

### Obrigatórias
```
SUPABASE_URL=naoqyfuvfqwdckbjemvw
SUPABASE_SERVICE_KEY=<service_key>
NEXT_PUBLIC_SUPABASE_URL=https://naoqyfuvfqwdckbjemvw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### E-mail (Gmail SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<seu_gmail>
SMTP_PASS=<senha_de_app>
EMAIL_FROM=Coordenação Acadêmica <seu_gmail>
```

### WhatsApp Business
```
WHATSAPP_TOKEN=<token_da_meta>
WHATSAPP_PHONE_ID=<phone_number_id>
WHATSAPP_TO_COORDENADOR=<numero_com_ddd>
WHATSAPP_VERIFY_TOKEN=<texto_secreto>
```

## Supabase

| Campo | Valor |
|-------|-------|
| Project Ref | `naoqyfuvfqwdckbjemvw` |
| URL | `https://naoqyfuvfqwdckbjemvw.supabase.co` |
| Tabelas | `horarios_disponiveis`, `agendamentos`, `notificacoes`, `configuracoes`, `bot_estado`, `atividades`, `anotacoes` |

## Migrações

As migrações estão em `supabase/migrations/`:
- `001_create_tables.sql` — tabelas iniciais
- `002_telefone_whatsapp.sql` — coluna telefone
- `003_configuracoes.sql` — tabela configuracoes
- `004_email_e_bot.sql` — coluna email, bot_estado, atividades
- `005_anotacoes.sql` — tabela anotacoes (bloco de notas)

## Guia de Configuração

Veja `WHATSAPP_SETUP.md` no repositório público para o passo a passo completo de configuração do WhatsApp Business e e-mail.
