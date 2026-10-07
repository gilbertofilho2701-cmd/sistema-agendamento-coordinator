// Configurações do sistema (número de WhatsApp do coordenador).
//
// GET   /api/config            -> { whatsapp_coordenador, whatsapp_configurado }
// POST  /api/config { whatsapp_coordenador: "+5588999999999" }
//
// O valor do banco tem prioridade; se não existir, usa WHATSAPP_TO_COORDENADOR do ambiente.
import { createClient } from '@supabase/supabase-js'
import { normalizarTelefone, whatsappConfigurado } from '../../lib/whatsapp'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .eq('chave', 'whatsapp_coordenador')
        .maybeSingle()
      if (error) throw error
      return res.status(200).json({
        whatsapp_coordenador: data?.valor || process.env.WHATSAPP_TO_COORDENADOR || '',
        whatsapp_configurado: whatsappConfigurado(),
      })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const bruto = (req.body || {}).whatsapp_coordenador
      const numero = bruto ? normalizarTelefone(bruto) : null
      if (bruto && !numero) {
        return res.status(400).json({ error: 'Número inválido. Use DDD + número, ex: (88) 99999-9999' })
      }
      const { error } = await supabase
        .from('configuracoes')
        .upsert({ chave: 'whatsapp_coordenador', valor: numero, updated_at: new Date().toISOString() })
      if (error) throw error
      return res.status(200).json({ success: true, whatsapp_coordenador: numero })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
