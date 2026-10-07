// Cérebro do bot de WhatsApp do coordenador.
//
// O coordenador recebe a solicitação com botões e pode:
//   • tocar em "✅ Confirmar" / "❌ Recusar"
//   • responder 1 (confirmar) ou 2 (recusar) — vale para a última solicitação enviada
//   • responder CONFIRMAR A7K2 / RECUSAR A7K2 (pelo código, para solicitações antigas)
//   • responder AJUDA para ver as opções
//
// Toda decisão tomada aqui é registrada no sistema e o aluno é avisado por e-mail,
// exatamente como se o coordenador tivesse clicado no painel.

import {
  textoAprovacao,
  textoRejeicao,
  assuntoAprovado,
  assuntoRecusado,
  registrarAtividade,
  notificarAluno,
} from './notificar'
import { enviarWhatsApp, normalizarTelefone } from './whatsapp'

const fmtData = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}
const horarioTexto = (b) => `${fmtData(b?.horarios_disponiveis?.data)} às ${String(b?.horarios_disponiveis?.hora_inicio || '').slice(0, 5)}`

const AJUDA =
  `*Como responder*\n\n` +
  `1️⃣ Confirmar a última solicitação\n` +
  `2️⃣ Recusar a última solicitação\n\n` +
  `Ou com o código (para solicitações antigas):\n` +
  `• *CONFIRMAR A7K2*\n` +
  `• *RECUSAR A7K2*\n\n` +
  `Digite *LISTA* para ver as solicitações pendentes.`

// Extrai a decisão e o alvo da mensagem recebida
export function interpretarResposta({ texto, buttonId }) {
  if (buttonId) {
    const m = /^(confirmar|recusar)_(\d+)$/.exec(buttonId)
    if (m) return { acao: m[1] === 'confirmar' ? 'confirmar' : 'recusar', id: Number(m[2]) }
    return { acao: 'desconhecida', bruto: buttonId }
  }
  const t = String(texto || '').trim().toUpperCase()
  if (!t) return { acao: 'desconhecida' }

  if (t === '1' || t === 'SIM' || t === 'CONFIRMAR' || t === 'OK' || t === '✅') return { acao: 'confirmar', ultimo: true }
  if (t === '2' || t === 'NAO' || t === 'NÃO' || t === 'RECUSAR' || t === '❌') return { acao: 'recusar', ultimo: true }
  if (t === 'AJUDA' || t === 'HELP' || t === '?') return { acao: 'ajuda' }
  if (t === 'LISTA' || t === 'PENDENTES') return { acao: 'lista' }

  const comCodigo = /^(CONFIRMAR|RECUSAR)\s+([A-Z0-9]{3,8})$/.exec(t)
  if (comCodigo) return { acao: comCodigo[1] === 'CONFIRMAR' ? 'confirmar' : 'recusar', codigo: comCodigo[2] }

  return { acao: 'desconhecida', bruto: texto }
}

// Aplica a decisão no banco e avisa o aluno
async function decidir(supabase, { agendamento, novoStatus, via }) {
  const { data, error } = await supabase
    .from('agendamentos')
    .update({
      status: novoStatus,
      confirmado_em: new Date().toISOString(),
      confirmado_via: via,
    })
    .eq('id', agendamento.id)
    .select('*, horarios_disponiveis(*)')
  if (error) throw error

  const atualizado = data?.[0] || agendamento

  // Recusado devolve o horário para a lista
  if (novoStatus === 'rejected' && atualizado.horario_id) {
    await supabase.from('horarios_disponiveis').update({ disponivel: true }).eq('id', atualizado.horario_id)
  }

  const aprovado = novoStatus === 'confirmed'
  await notificarAluno(supabase, {
    aluno_id: atualizado.aluno_id,
    tipo: aprovado ? 'aprovacao' : 'rejeicao',
    mensagem: aprovado ? textoAprovacao(atualizado) : textoRejeicao(atualizado),
    email: atualizado.email,
    telefone: atualizado.telefone,
    assunto: aprovado ? assuntoAprovado : assuntoRecusado,
    linhas: [
      { rotulo: 'Aluno', valor: atualizado.nome || '-' },
      { rotulo: 'Matrícula', valor: atualizado.matricula || '-' },
      { rotulo: 'Data', valor: fmtData(atualizado?.horarios_disponiveis?.data) },
      { rotulo: 'Horário', valor: String(atualizado?.horarios_disponiveis?.hora_inicio || '').slice(0, 5) },
      { rotulo: 'Situação', valor: aprovado ? 'Confirmado' : 'Não confirmado' },
    ],
  })

  await registrarAtividade(supabase, {
    autor: 'coordenador',
    acao: aprovado ? 'confirmou' : 'recusou',
    detalhe: `${atualizado.nome || 'Aluno'} — ${horarioTexto(atualizado)} (pelo WhatsApp)`,
    agendamento_id: atualizado.id,
  })

  return atualizado
}

// Processa uma mensagem recebida no webhook. Sempre responde algo ao coordenador.
export async function processarMensagem(supabase, { telefone, texto, buttonId, messageId }) {
  const remetente = normalizarTelefone(telefone)
  const decisao = interpretarResposta({ texto, buttonId })

  const responder = async (msg) => {
    if (!remetente) return null
    return enviarWhatsApp({ to: remetente, mensagem: msg })
  }

  if (decisao.acao === 'ajuda') {
    await responder(AJUDA)
    return { ok: true, resposta: 'ajuda' }
  }

  // Localiza o agendamento alvo
  let agendamento = null
  if (decisao.id) {
    const { data } = await supabase.from('agendamentos').select('*, horarios_disponiveis(*)').eq('id', decisao.id).maybeSingle()
    agendamento = data
  } else if (decisao.codigo) {
    const { data } = await supabase.from('agendamentos').select('*, horarios_disponiveis(*)').eq('codigo', decisao.codigo).maybeSingle()
    agendamento = data
  } else if (decisao.ultimo && remetente) {
    // 1) tenta a última solicitação enviada a este número
    const { data: estado } = await supabase.from('bot_estado').select('ultimo_agendamento_id').eq('telefone', remetente).maybeSingle()
    if (estado?.ultimo_agendamento_id) {
      const { data } = await supabase.from('agendamentos').select('*, horarios_disponiveis(*)').eq('id', estado.ultimo_agendamento_id).maybeSingle()
      agendamento = data
    }
    // 2) fallback: a solicitação pendente mais recente (cobre reinício de servidor
    //    ou falha no registro do bot_estado)
    if (!agendamento) {
      const { data } = await supabase
        .from('agendamentos')
        .select('*, horarios_disponiveis(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      agendamento = data
    }
  }

  if (decisao.acao === 'lista') {
    const { data } = await supabase
      .from('agendamentos')
      .select('*, horarios_disponiveis(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)
    if (!data?.length) {
      await responder('Não há solicitações pendentes. 👍')
      return { ok: true, resposta: 'lista_vazia' }
    }
    const linhas = data.map((b) => `🔖 *${b.codigo || b.id}* — ${b.nome || 'Aluno'} — ${horarioTexto(b)}`).join('\n')
    await responder(`*Solicitações pendentes*\n\n${linhas}\n\nResponda *CONFIRMAR código* ou *RECUSAR código*.`)
    return { ok: true, resposta: 'lista', total: data.length }
  }

  if (!['confirmar', 'recusar'].includes(decisao.acao)) {
    await responder(`Não entendi 🤔\n\n${AJUDA}`)
    return { ok: true, resposta: 'nao_entendido' }
  }

  if (!agendamento) {
    await responder('Não encontrei essa solicitação. Digite *LISTA* para ver as pendentes.')
    return { ok: true, resposta: 'nao_encontrado' }
  }

  if (agendamento.status !== 'pending') {
    const comoEsta = agendamento.status === 'confirmed' ? 'já estava *confirmada*' : 'já estava *recusada*'
    await responder(`Essa solicitação (${agendamento.codigo || agendamento.id}) ${comoEsta}. Nada foi alterado.`)
    return { ok: true, resposta: 'ja_decidido', status: agendamento.status }
  }

  const novoStatus = decisao.acao === 'confirmar' ? 'confirmed' : 'rejected'
  try {
    const atualizado = await decidir(supabase, { agendamento, novoStatus, via: 'whatsapp' })
    const ok = novoStatus === 'confirmed'
    await responder(
      ok
        ? `✅ Confirmado: ${atualizado.nome || 'aluno'} — ${horarioTexto(atualizado)}.\nO aluno foi avisado por e-mail.`
        : `❌ Recusado: ${atualizado.nome || 'aluno'} — ${horarioTexto(atualizado)}.\nO aluno foi avisado por e-mail.`
    )
    return { ok: true, resposta: novoStatus, agendamento_id: atualizado.id, messageId }
  } catch (e) {
    await responder('Não consegui atualizar agora. Tente pelo painel.')
    return { ok: false, erro: e.message }
  }
}
