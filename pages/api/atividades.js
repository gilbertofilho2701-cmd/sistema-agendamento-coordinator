// Registro de atividades do sistema — quem fez o quê e quando.
// GET /api/atividades?limit=50
//
// Serve para o painel mostrar "Fulano confirmou pelo WhatsApp", "aluno agendou" etc.
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
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const limite = Math.min(Number(req.query.limit) || 50, 200)
    const { data, error } = await supabase
      .from('atividades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)
    if (error) throw error
    return res.status(200).json(data || [])
  } catch (error) {
    console.error('API atividades error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
