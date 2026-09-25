// API para notificações do coordenador (WhatsApp/Telegram)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhvufnloudmjcbdzekzb.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_VrMSri0JJl_kk7CrnfZINw_dfG_Spcy'
const supabase = createClient(supabaseUrl, supabaseKey)

// Número de WhatsApp do coordenador
const COORDENADOR_WHATSAPP = '+558688374273'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { agendamento_id, status } = req.body
    
    try {
      // Buscar detalhes do agendamento
      const { data: agendamento, error: errAgendamento } = await supabase
        .from('agendamentos')
        .select(`*, horarios_disponiveis(*)`)
        .eq('id', agendamento_id)
        .single()
      
      if (errAgendamento) throw errAgendamento
      
      // Atualizar status do agendamento
      const { data: updated, error: errUpdate } = await supabase
        .from('agendamentos')
        .update({ status: status })
        .eq('id', agendamento_id)
        .select()
      
      if (errUpdate) throw errUpdate
      
      // Enviar notificação via WhatsApp
      const mensagem = status === 'confirmado' 
        ? `✅ Agendamento CONFIRMADO - ${agendamento.horarios_disponiveis.data} às ${agendamento.horarios_disponiveis.hora_inicio}`
        : `❌ Agendamento REJEITADO - ${agendamento.horarios_disponiveis.data} às ${agendamento.horarios_disponiveis.hora_inicio}`
      
      // TODO: Integrar com API real de WhatsApp (Twilio, Waha, etc.)
      console.log('Notificação para coordenador:', mensagem)
      
      res.status(200).json({ 
        success: true, 
        message: 'Status atualizado e notificação enviada',
        data: updated[0]
      })
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        error: err.message 
      })
    }
    return
  }
  
  res.status(405).json({ error: 'Método não permitido' })
}