import { supabaseAdmin } from '../../lib/notificar'

export default async function handler(req, res) {
  try {
    const supabase = supabaseAdmin()
    
    // SELECT simples para manter o banco ativo
    const { data, error } = await supabase
      .from('agendamentos')
      .select('id')
      .limit(1)
    
    if (error) {
      return res.status(500).json({ ok: false, error: error.message })
    }
    
    return res.status(200).json({ 
      ok: true, 
      message: 'Banco ativo',
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}
