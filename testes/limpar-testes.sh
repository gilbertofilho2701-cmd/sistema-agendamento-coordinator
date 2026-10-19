#!/bin/bash
# Faxina dos dados de teste.
#
# Apaga o que testes automáticos deixaram para trás: horários marcados como
# TESTE-AUTOMATICO e agendamentos com nome começando por "Teste".
# Rode sempre que quiser conferir se o banco está limpo antes de abrir para os alunos.
#
# Uso:  bash testes/limpar-testes.sh
#       bash testes/limpar-testes.sh --conferir   (só mostra o que existe, não apaga)

cd "$(dirname "$0")/.." || exit 1

URL=$(grep -m1 '^SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
KEY=$(grep -m1 '^SUPABASE_SERVICE_KEY=' .env.local | cut -d= -f2- | tr -d '"')
if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "não achei SUPABASE_URL / SUPABASE_SERVICE_KEY no .env.local"
  exit 1
fi

SO_CONFERIR=""
[ "$1" = "--conferir" ] && SO_CONFERIR="sim"

conta() { # tabela filtro
  curl -s -m 30 "$URL/rest/v1/$1?select=id&$2" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    | python3 -c "import json,sys
try: print(len(json.load(sys.stdin)))
except Exception: print(0)"
}

echo "=== dados de teste no banco ==="
horarios=$(conta horarios_disponiveis "local=eq.TESTE-AUTOMATICO")
agendamentos=$(conta agendamentos "nome=like.*Teste*")
echo "  horários marcados TESTE-AUTOMATICO: $horarios"
echo "  agendamentos com nome de teste:     $agendamentos"

# horários de teste também deixam agendamento ligado; apaga os dois
total_ag=$(conta agendamentos "select=id")
total_hor=$(conta horarios_disponiveis "select=id")
echo "  total no banco -> horários: $total_hor | agendamentos: $total_ag"

if [ -n "$SO_CONFERIR" ]; then
  echo
  echo "modo conferir: nada foi apagado"
  exit 0
fi

if [ "$horarios" = "0" ] && [ "$agendamentos" = "0" ]; then
  echo
  echo "nada para limpar"
  exit 0
fi

echo
echo "=== apagando ==="
# apaga primeiro os agendamentos dos horários de teste, depois os horários
ids=$(curl -s -m 30 "$URL/rest/v1/horarios_disponiveis?select=id&local=eq.TESTE-AUTOMATICO" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -c "
import json,sys
print(','.join(str(h['id']) for h in json.load(sys.stdin)))")
if [ -n "$ids" ]; then
  n=$(curl -s -m 30 -X DELETE "$URL/rest/v1/agendamentos?horario_id=in.($ids)" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: return=representation" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))" 2>/dev/null)
  echo "  agendamentos dos horários de teste: ${n:-0}"
fi
n=$(curl -s -m 30 -X DELETE "$URL/rest/v1/agendamentos?nome=like.*Teste*" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: return=representation" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "  agendamentos com nome de teste:     ${n:-0}"
n=$(curl -s -m 30 -X DELETE "$URL/rest/v1/horarios_disponiveis?local=eq.TESTE-AUTOMATICO" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: return=representation" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "  horários de teste:                  ${n:-0}"

echo
echo "=== depois da faxina ==="
echo "  horários marcados TESTE-AUTOMATICO: $(conta horarios_disponiveis "local=eq.TESTE-AUTOMATICO")"
echo "  agendamentos com nome de teste:     $(conta agendamentos "nome=like.*Teste*")"
echo "  total no banco -> horários: $(conta horarios_disponiveis "select=id") | agendamentos: $(conta agendamentos "select=id")"
