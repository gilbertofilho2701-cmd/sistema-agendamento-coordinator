// Notificações do sistema.
//
// GET  /api/notificacao?aluno_id=xxx        -> notificações do aluno (sino dele)
// GET  /api/notificacao?destinatario=coordenador -> notificações do coordenador (sino dele)
// POST /api/notificacao                     -> reenvia/avisa sob demanda
//        { agendamento_id, status }   -> avisa o aluno da decisão
//        { notificar_coordenador: true, agendamento_id } -> reenvia ao coordenador
//        { aluno_id, tipo, mensagem } -> mensagem pronta (compatibilidade)
// PATCH /api/notificacao { ids: [...] }     -> marca como lidas
import { createClient } from '@supabase/supabase-js'
import {
  notificarAluno,
  notificarCoordenador,
  textoAprovacao,
  textoRejeicao,
  assuntoAprovado,
  assuntoRecusado,
} from '../../lib/notificar'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

const fmtData = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}

export default async function handler(req, res) {
  if (!url || !key) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const supabase = createClient(url, key)

  if (req.method === 'GET') {
    try {
      if (req.query.destinatario === 'coordenador') {
        const { data, error } = await supabase
          .from('notificacoes')
          .select('*')
          .eq('destinatario', 'coordenador')
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) throw error
        return res.status(200).json(data || [])
      }

      const alunoId = req.query.aluno_id
      if (!alunoId) return res.status(400).json({ error: 'aluno_id é obrigatório' })
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
      // Aviso ao coordenador sobre uma solicitação (reenvio manual pelo painel)
      if (body.notificar_coordenador) {
        if (!body.agendamento_id) return res.status(400).json({ error: 'agendamento_id é obrigatório' })
        const { data: agendamento, error } = await supabase
          .from('agendamentos')
          .select('*, horarios_disponiveis(*)')
          .eq('id', body.agendamento_id)
          .single()
        if (error) throw error
        const r = await notificarCoordenador(supabase, agendamento)
        return res.status(200).json({ success: true, ...r })
      }

      // Decisão sobre um agendamento -> avisa o aluno
      if (body.agendamento_id) {
        const { data: agendamento, error } = await supabase
          .from('agendamentos')
          .select('*, horarios_disponiveis(*)')
          .eq('id', body.agendamento_id)
          .single()
        if (error) throw error

        const status = body.status || agendamento.status
        const aprovado = status !== 'rejected'
        const r = await notificarAluno(supabase, {
          aluno_id: agendamento.aluno_id,
          tipo: aprovado ? 'aprovacao' : 'rejeicao',
          mensagem: aprovado ? textoAprovacao(agendamento) : textoRejeicao(agendamento),
          email: agendamento.email,
          telefone: agendamento.telefone,
          assunto: aprovado ? assuntoAprovado : assuntoRecusado,
          linhas: [
            { rotulo: 'Aluno', valor: agendamento.nome || '-' },
            { rotulo: 'Data', valor: fmtData(agendamento?.horarios_disponiveis?.data) },
            { rotulo: 'Horário', valor: String(agendamento?.horarios_disponiveis?.hora_inicio || '').slice(0, 5) },
            { rotulo: 'Situação', valor: aprovado ? 'Confirmado' : 'Não confirmado' },
          ],
        })
        return res.status(200).json({ success: true, tipo: aprovado ? 'aprovacao' : 'rejeicao', ...r })
      }

      // Mensagem pronta (compatibilidade)
      if (body.aluno_id && body.mensagem) {
        const r = await notificarAluno(supabase, {
          aluno_id: body.aluno_id,
          tipo: body.tipo || 'aviso',
          mensagem: body.mensagem,
          email: body.email,
          telefone: body.telefone,
        })
        return res.status(200).json({ success: true, tipo: body.tipo || 'aviso', ...r })
      }

      return res.status(400).json({ error: 'Informe agendamento_id, ou aluno_id + mensagem' })
    } catch (error) {
      console.error('notificacao POST error:', error.message)
      return res.status(500).json({ success: false, error: error.message })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const ids = (req.body || {}).ids
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids é obrigatório' })
      const { error } = await supabase.from('notificacoes').update({ lida: true }).in('id', ids)
      if (error) throw error
      return res.status(200).json({ success: true, marcadas: ids.length })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
