// Transferência de um agendamento para outro horário.
// PUT /api/agendamento/transfer { bookingId, newHorarioId, oldHorarioId }
//
// O aluno é avisado por e-mail (e por WhatsApp, se ele tiver informado o número).
import { createClient } from '@supabase/supabase-js'
import {
  notificarAluno,
  registrarAtividade,
  textoTransferencia,
  assuntoTransferido,
} from '../../../lib/notificar'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const fmtData = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const { bookingId, newHorarioId, oldHorarioId } = req.body || req.query
    if (!bookingId || !newHorarioId) {
      return res.status(400).json({ error: 'bookingId e newHorarioId são obrigatórios' })
    }

    const { data: newSlot, error: slotError } = await supabaseAdmin
      .from('horarios_disponiveis')
      .select('*')
      .eq('id', newHorarioId)
      .single()
    if (slotError) throw slotError
    if (!newSlot.disponivel) {
      return res.status(400).json({ error: 'Horário não está disponível' })
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('agendamentos')
      .select('*')
      .eq('id', bookingId)
      .single()
    if (bookingError) throw bookingError

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('agendamentos')
      .update({ horario_id: newHorarioId })
      .eq('id', bookingId)
      .select('*, horarios_disponiveis(*)')
    if (updateError) throw updateError

    const antigo = oldHorarioId || booking.horario_id
    if (antigo && String(antigo) !== String(newHorarioId)) {
      await supabaseAdmin.from('horarios_disponiveis').update({ disponivel: true }).eq('id', antigo)
    }
    await supabaseAdmin.from('horarios_disponiveis').update({ disponivel: false }).eq('id', newHorarioId)

    const atualizado = updateData?.[0] || {}

    // Avisa o aluno por e-mail
    const aviso = await notificarAluno(supabaseAdmin, {
      aluno_id: atualizado.aluno_id,
      tipo: 'transferencia',
      mensagem: textoTransferencia(atualizado),
      email: atualizado.email,
      telefone: atualizado.telefone,
      assunto: assuntoTransferido,
      linhas: [
        { rotulo: 'Aluno', valor: atualizado.nome || '-' },
        { rotulo: 'Nova data', valor: fmtData(atualizado?.horarios_disponiveis?.data) },
        { rotulo: 'Novo horário', valor: String(atualizado?.horarios_disponiveis?.hora_inicio || '').slice(0, 5) },
      ],
    })

    await registrarAtividade(supabaseAdmin, {
      autor: 'coordenador',
      acao: 'transferiu',
      detalhe: `${atualizado.nome || 'Aluno'} para ${fmtData(atualizado?.horarios_disponiveis?.data)} às ${String(atualizado?.horarios_disponiveis?.hora_inicio || '').slice(0, 5)}`,
      agendamento_id: atualizado.id,
    })

    return res.status(200).json({ success: true, data: atualizado, aviso_aluno: aviso })
  } catch (error) {
    console.error('Transfer error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
