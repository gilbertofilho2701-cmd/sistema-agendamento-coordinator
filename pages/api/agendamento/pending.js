// Limpeza de agendamentos (usado pelo botão "Limpar" do painel).
//
// DELETE /api/agendamento/pending -> apaga os pendentes
// DELETE /api/agendamento/all     -> apaga todos
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
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (req.query.all === 'true' || req.query.escopo === 'all') {
      const { error } = await supabaseAdmin.from('agendamentos').delete().gte('id', 0)
      if (error) throw error
      return res.status(200).json({ deleted: true, escopo: 'all' })
    }

    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .delete()
      .eq('status', 'pending')
      .select('id')
    if (error) throw error
    return res.status(200).json({ deleted: true, escopo: 'pending', count: data?.length || 0 })
  } catch (error) {
    console.error('Delete agendamentos error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
