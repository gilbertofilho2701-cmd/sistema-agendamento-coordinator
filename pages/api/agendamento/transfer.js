// Transferência de um agendamento para outro horário.
// PUT /api/agendamento/transfer { bookingId, newHorarioId, oldHorarioId }
//
// Observação: o Vercel trata este arquivo como rota /api/agendamento/transfer
// (rota específica tem prioridade sobre o catch-all /api/agendamento).
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

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

    // O novo horário precisa existir e estar livre
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

    // Libera o horário antigo e ocupa o novo
    const antigo = oldHorarioId || booking.horario_id
    if (antigo && String(antigo) !== String(newHorarioId)) {
      await supabaseAdmin.from('horarios_disponiveis').update({ disponivel: true }).eq('id', antigo)
    }
    await supabaseAdmin.from('horarios_disponiveis').update({ disponivel: false }).eq('id', newHorarioId)

    return res.status(200).json({ success: true, data: updateData?.[0] })
  } catch (error) {
    console.error('Transfer error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
