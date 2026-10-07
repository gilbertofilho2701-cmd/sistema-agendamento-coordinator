// Histórico de atendimentos do aluno (por matrícula).
// GET /api/historico?matricula=XXXX
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const matricula = req.query.matricula
  if (!matricula) {
    return res.status(400).json({ error: 'matrícula é obrigatória' })
  }
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .select('*, horarios_disponiveis(*)')
      .eq('matricula', matricula)
      .order('created_at', { ascending: false })
    if (error) throw error
    return res.status(200).json(data || [])
  } catch (error) {
    console.error('API historico error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
