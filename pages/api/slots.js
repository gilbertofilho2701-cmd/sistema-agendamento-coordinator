// Horários disponíveis.
//
// GET    /api/slots?date=YYYY-MM-DD -> lista horários (filtro opcional por data)
// POST   /api/slots                 -> cria horário
// PUT    /api/slots                 -> edita horário { id, ...campos }
// DELETE /api/slots { id }          -> apaga o horário e os agendamentos ligados a ele
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (req.method === 'GET') {
      const date = req.query.date
      let query = supabaseAdmin
        .from('horarios_disponiveis')
        .select('*')
        .order('data', { ascending: true })
        .order('hora_inicio', { ascending: true })
      if (date) query = query.eq('data', date)
      const { data, error } = await query
      if (error) throw error
      return res.status(200).json(data || [])
    }

    if (req.method === 'POST') {
      const body = req.body || req.query
      const { data, error } = await supabaseAdmin
        .from('horarios_disponiveis')
        .insert([{ ...body, disponivel: body.disponivel !== false }])
        .select()
      if (error) throw error
      return res.status(201).json(data?.[0] || {})
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || req.query
      if (!id) return res.status(400).json({ error: 'id é obrigatório' })
      const { data, error } = await supabaseAdmin
        .from('horarios_disponiveis')
        .update(updates)
        .eq('id', id)
        .select()
      if (error) throw error
      return res.status(200).json(data?.[0] || {})
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || req.query
      if (!id) return res.status(400).json({ error: 'id é obrigatório' })
      // Apaga primeiro os agendamentos que apontam para o horário (chave estrangeira)
      const { error: errAg } = await supabaseAdmin
        .from('agendamentos')
        .delete()
        .eq('horario_id', id)
      if (errAg) throw errAg
      const { error } = await supabaseAdmin.from('horarios_disponiveis').delete().eq('id', id)
      if (error) throw error
      return res.status(200).json({ success: true, deleted: true })
    }
  } catch (error) {
    console.error('API slots error:', error.message)
    return res.status(500).json({ error: error.message || 'Internal error' })
  }
}
