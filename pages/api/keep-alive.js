import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Variáveis de ambiente não configuradas' })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
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
