// Cria a notificação no banco (sino do site) e envia por WhatsApp quando possível.
import { createClient } from '@supabase/supabase-js'
import { enviarWhatsApp, normalizarTelefone, whatsappConfigurado } from './whatsapp'

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados')
  return createClient(url, key)
}

const fmtData = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}

export const textoAprovacao = (b) =>
  `✅ Seu agendamento foi APROVADO para ${fmtData(b?.horarios_disponiveis?.data)} às ${String(b?.horarios_disponiveis?.hora_inicio || '').slice(0, 5)}.`

export const textoRejeicao = (b) =>
  `❌ Seu agendamento foi RECUSADO para ${fmtData(b?.horarios_disponiveis?.data)} às ${String(b?.horarios_disponiveis?.hora_inicio || '').slice(0, 5)}. Fale com a coordenação para escolher outro horário.`

export const textoTransferencia = (slot) =>
  `🔄 Seu atendimento foi transferido para ${fmtData(slot?.data)} às ${String(slot?.hora_inicio || '').slice(0, 5)}.`

export const textoSolicitacaoCoordenador = (b) =>
  `📅 Nova solicitação de atendimento\n` +
  `Aluno: ${b?.nome || 'não informado'}\n` +
  `Matrícula: ${b?.matricula || 'não informada'}\n` +
  `Curso/Turma: ${b?.curso || '-'} / ${b?.turma || '-'}\n` +
  `Data: ${fmtData(b?.horarios_disponiveis?.data)} às ${String(b?.horarios_disponiveis?.hora_inicio || '').slice(0, 5)}\n` +
  `Motivo: ${(b?.motivo || '').replace(/^[^:]*:\s*/, '') || 'não informado'}`

// Notifica o aluno: grava no sino e tenta o WhatsApp
export async function notificarAluno(supabase, { aluno_id, tipo, mensagem, telefone }) {
  const resultado = { banco: null, whatsapp: null }

  if (aluno_id) {
    const { data, error } = await supabase
      .from('notificacoes')
      .insert([{ aluno_id, tipo, mensagem, lida: false, created_at: new Date().toISOString() }])
      .select()
    resultado.banco = error ? { erro: error.message } : { ok: true, id: data?.[0]?.id }
  }

  if (telefone) {
    resultado.whatsapp = await enviarWhatsApp({
      to: telefone,
      mensagem,
      template: process.env.WHATSAPP_TEMPLATE_ALUNO || undefined,
      parametros: [mensagem],
    })
  } else {
    resultado.whatsapp = { ok: false, pulado: true, motivo: 'aluno sem telefone cadastrado' }
  }

  return resultado
}

// Avisa o coordenador de uma nova solicitação.
// O número vem do banco (editável no painel); se não houver, usa a variável de ambiente.
export async function notificarCoordenador(mensagem, parametros, supabase) {
  let destino = process.env.WHATSAPP_TO_COORDENADOR
  if (supabase) {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'whatsapp_coordenador')
        .maybeSingle()
      if (data?.valor) destino = data.valor
    } catch (e) {
      console.warn('não foi possível ler whatsapp_coordenador:', e.message)
    }
  }
  if (!destino) {
    return { ok: false, pulado: true, motivo: 'Número do coordenador não configurado' }
  }
  return enviarWhatsApp({
    to: destino,
    mensagem,
    template: process.env.WHATSAPP_TEMPLATE_COORDENADOR || undefined,
    parametros: parametros || [mensagem],
  })
}

export { whatsappConfigurado, normalizarTelefone }
