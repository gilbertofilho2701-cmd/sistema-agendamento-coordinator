// DELETE /api/agendamento/all -> apaga todos os agendamentos (botão "Limpar tudo" do painel)
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .delete()
      .gte('id', 0)
      .select('id')
    if (error) throw error
    return res.status(200).json({ deleted: true, count: data?.length || 0 })
  } catch (error) {
    console.error('Delete all error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
