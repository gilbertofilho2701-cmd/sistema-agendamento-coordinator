// Agendamentos.
//
// GET   /api/agendamento                -> lista tudo (usado pelo painel e pelo aluno)
// POST  /api/agendamento                -> cria solicitação e avisa o coordenador
// PATCH /api/agendamento { id, status } -> aprova/recusa e avisa o aluno
import { createClient } from '@supabase/supabase-js'
import { notificarCoordenador, textoSolicitacaoCoordenador } from '../../lib/notificar'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const cliente = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

export default async function handler(req, res) {
  let supabaseAdmin
  try {
    supabaseAdmin = cliente()
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .select('*, horarios_disponiveis(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json(data || [])
    } catch (error) {
      console.error('API agendamento GET error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const booking = req.body || req.query
      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .insert([{ ...booking, status: booking.status || 'pending' }])
        .select('*, horarios_disponiveis(*)')
      if (error) throw error

      const criado = data?.[0] || {}
      // Marca o horário como ocupado
      if (criado.horario_id) {
        await supabaseAdmin
          .from('horarios_disponiveis')
          .update({ disponivel: false })
          .eq('id', criado.horario_id)
      }

      // Avisa o coordenador por WhatsApp (não bloqueia a resposta se falhar)
      const aviso = await notificarCoordenador(textoSolicitacaoCoordenador(criado), null, supabaseAdmin)

      return res.status(201).json({ ...criado, aviso_coordenador: aviso })
    } catch (error) {
      console.error('API agendamento POST error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, status } = req.body || req.query
      if (!id) return res.status(400).json({ error: 'id é obrigatório' })

      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .update({ status })
        .eq('id', id)
        .select('*, horarios_disponiveis(*)')
      if (error) throw error

      const atualizado = data?.[0] || {}
      // Recusado libera o horário novamente
      if (status === 'rejected' && atualizado.horario_id) {
        await supabaseAdmin
          .from('horarios_disponiveis')
          .update({ disponivel: true })
          .eq('id', atualizado.horario_id)
      }

      return res.status(200).json(atualizado)
    } catch (error) {
      console.error('API agendamento PATCH error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
