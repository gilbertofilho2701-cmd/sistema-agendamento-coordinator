# Instruções para Deploy no Railway e Configuração do Supabase

## 1. Executar SQL no Supabase (OBRIGATÓRIO)

Acesse o painel do Supabase e execute o SQL abaixo no SQL Editor:

```sql
-- Adicionar colunas na tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS curso TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS turma TEXT;

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGSERIAL PRIMARY KEY,
  aluno_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_notificacoes_aluno_id ON notificacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agendamentos_matricula ON agendamentos(matricula);
```

## 2. Fazer Push para o GitHub

Para conectar a Vercel ao repositório, você tem duas opções:

### Opção A: Passar o token da conta do repositório
Se você tiver acesso a essa conta, use o token dela.

### Opção B: Adicionar o usuário como colaborador
1. Acesse: https://github.com/SEU_USUARIO/sistema-agendamento-coordinator/settings/access
2. Clique em "Add people"
3. Adicione o usuário desejado
4. Depois me avise para eu fazer o push

## 3. Configurar o Railway

Depois que o push for feito, siga estes passos:

1. Acesse https://railway.app
2. Crie um novo projeto
3. Conecte ao repositório desejado
4. Configure as variáveis de ambiente:
   - `SUPABASE_URL` = https://SEU_PROJETO.supabase.co
   - `SUPABASE_SERVICE_KEY` = (sua service role key do Supabase)
   - `PORT` = 3000
5. O Railway detectará automaticamente o `railway.toml` e fará o deploy

## 4. Credenciais do Coordenador

- **Email:** viniciucoodernador@exemplo.com (ou coordenador@exemplo.com)
- **Senha:** (definida na variável COORDENADOR_PASS no .env.local)

## 5. O que foi corrigido/adicionado

✅ **Login corrigido** - Senha movida para variável de ambiente COORDENADOR_PASS
✅ **Campos de identificação** - Aluno agora informa: nome, matrícula, curso e turma
✅ **Transferência corrigida** - Verifica se o novo horário está disponível antes de transferir
✅ **Notificações** - Aluno é notificado quando: agendamento é aprovado, rejeitado ou transferido
✅ **Histórico** - Aluno pode ver todos os atendimentos anteriores com data, horário, nome, matrícula e curso
✅ **API de notificações** - Salva notificações no banco de dados
✅ **API de histórico** - Busca histórico por matrícula
