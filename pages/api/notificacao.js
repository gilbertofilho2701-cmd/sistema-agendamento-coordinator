// Notificações: grava no sino do site E envia por WhatsApp quando configurado.
//
// GET  /api/notificacao?aluno_id=xxx   -> lista notificações do aluno
// POST /api/notificacao                -> cria notificação e envia WhatsApp
//      formatos aceitos:
//        { agendamento_id, status }                  (o servidor monta a mensagem)
//        { aluno_id, tipo, mensagem, telefone? }     (mensagem pronta)
//        { notificar_coordenador: true, mensagem }   (avisa o coordenador)
import { createClient } from '@supabase/supabase-js'
import {
  notificarAluno,
  notificarCoordenador,
  textoAprovacao,
  textoRejeicao,
} from '../../lib/notificar'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (!url || !key) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const supabase = createClient(url, key)

  if (req.method === 'GET') {
    const alunoId = req.query.aluno_id
    if (!alunoId) return res.status(400).json({ error: 'aluno_id é obrigatório' })
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json(data || [])
    } catch (error) {
      console.error('notificacao GET error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    try {
      // 1) Aviso direto ao coordenador (nova solicitação)
      if (body.notificar_coordenador) {
        const r = await notificarCoordenador(body.mensagem, body.parametros)
        return res.status(200).json({ success: true, coordenador: r })
      }

      // 2) Notificação baseada no agendamento (servidor monta o texto e busca o telefone)
      if (body.agendamento_id) {
        const { data: agendamento, error } = await supabase
          .from('agendamentos')
          .select('*, horarios_disponiveis(*)')
          .eq('id', body.agendamento_id)
          .single()
        if (error) throw error

        const status = body.status || agendamento.status
        const tipo = status === 'rejected' ? 'rejeicao' : 'aprovacao'
        const mensagem = tipo === 'rejeicao' ? textoRejeicao(agendamento) : textoAprovacao(agendamento)

        const r = await notificarAluno(supabase, {
          aluno_id: agendamento.aluno_id,
          tipo,
          mensagem,
          telefone: agendamento.telefone,
        })
        return res.status(200).json({ success: true, tipo, mensagem, ...r })
      }

      // 3) Mensagem pronta (compatibilidade com o formato antigo do painel)
      if (body.aluno_id && body.mensagem) {
        const r = await notificarAluno(supabase, {
          aluno_id: body.aluno_id,
          tipo: body.tipo || 'aviso',
          mensagem: body.mensagem,
          telefone: body.telefone,
        })
        return res.status(200).json({ success: true, tipo: body.tipo || 'aviso', mensagem: body.mensagem, ...r })
      }

      return res.status(400).json({ error: 'Informe agendamento_id, ou aluno_id + mensagem' })
    } catch (error) {
      console.error('notificacao POST error:', error.message)
      return res.status(500).json({ success: false, error: error.message })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
