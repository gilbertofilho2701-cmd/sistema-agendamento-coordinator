// Agendamentos.
//
// GET   /api/agendamento                -> lista tudo (painel do coordenador e do aluno)
// POST  /api/agendamento                -> cria a solicitação, avisa o coordenador no WhatsApp
//                                          e manda um e-mail de "recebemos sua solicitação" ao aluno
// PATCH /api/agendamento { id, status } -> confirma/recusa e avisa o aluno por e-mail
import { createClient } from '@supabase/supabase-js'
import {
  notificarCoordenador,
  notificarAluno,
  registrarAtividade,
  gerarCodigo,
  textoAprovacao,
  textoRejeicao,
  textoRecebido,
  assuntoAprovado,
  assuntoRecusado,
  assuntoRecebido,
  emailValido,
} from '../../lib/notificar'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const fmtData = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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
      const b = req.body || req.query
      if (!b.email || !emailValido(b.email)) {
        return res.status(400).json({ error: 'Informe um e-mail válido — é por ele que você recebe a confirmação.' })
      }

      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .insert([{
          aluno_id: b.aluno_id,
          horario_id: b.horario_id,
          motivo: b.motivo,
          status: b.status || 'pending',
          nome: b.nome,
          matricula: b.matricula,
          curso: b.curso,
          turma: b.turma,
          email: String(b.email).trim(),
          telefone: b.telefone || null,
          codigo: gerarCodigo(),
        }])
        .select('*, horarios_disponiveis(*)')
      if (error) throw error

      const criado = data?.[0] || {}

      // O horário sai da lista de disponíveis
      if (criado.horario_id) {
        await supabaseAdmin.from('horarios_disponiveis').update({ disponivel: false }).eq('id', criado.horario_id)
      }

      await registrarAtividade(supabaseAdmin, {
        autor: 'aluno',
        acao: 'agendou',
        detalhe: `${criado.nome || 'Aluno'} solicitou ${fmtData(criado?.horarios_disponiveis?.data)} às ${String(criado?.horarios_disponiveis?.hora_inicio || '').slice(0, 5)}`,
        agendamento_id: criado.id,
      })

      // Avisa o coordenador no WhatsApp (com botões) — não bloqueia a resposta
      const avisoCoordenador = await notificarCoordenador(supabaseAdmin, criado)

      // Confirma ao aluno que a solicitação chegou (por e-mail)
      const avisoAluno = await notificarAluno(supabaseAdmin, {
        aluno_id: criado.aluno_id,
        tipo: 'recebido',
        mensagem: textoRecebido(criado),
        email: criado.email,
        assunto: assuntoRecebido,
        linhas: [
          { rotulo: 'Aluno', valor: criado.nome || '-' },
          { rotulo: 'Matrícula', valor: criado.matricula || '-' },
          { rotulo: 'Data', valor: fmtData(criado?.horarios_disponiveis?.data) },
          { rotulo: 'Horário', valor: String(criado?.horarios_disponiveis?.hora_inicio || '').slice(0, 5) },
          { rotulo: 'Situação', valor: 'Aguardando confirmação da coordenação' },
        ],
      })

      return res.status(201).json({ ...criado, aviso_coordenador: avisoCoordenador, aviso_aluno: avisoAluno })
    } catch (error) {
      console.error('API agendamento POST error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, status } = req.body || req.query
      if (!id) return res.status(400).json({ error: 'id é obrigatório' })
      if (!['confirmed', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'status inválido' })
      }

      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .update({ status, confirmado_em: new Date().toISOString(), confirmado_via: 'painel' })
        .eq('id', id)
        .select('*, horarios_disponiveis(*)')
      if (error) throw error

      const atualizado = data?.[0] || {}
      if (status === 'rejected' && atualizado.horario_id) {
        await supabaseAdmin.from('horarios_disponiveis').update({ disponivel: true }).eq('id', atualizado.horario_id)
      }

      let aviso = null
      if (status !== 'pending') {
        const aprovado = status === 'confirmed'
        aviso = await notificarAluno(supabaseAdmin, {
          aluno_id: atualizado.aluno_id,
          tipo: aprovado ? 'aprovacao' : 'rejeicao',
          mensagem: aprovado ? textoAprovacao(atualizado) : textoRejeicao(atualizado),
          email: atualizado.email,
          telefone: atualizado.telefone,
          assunto: aprovado ? assuntoAprovado : assuntoRecusado,
          linhas: [
            { rotulo: 'Aluno', valor: atualizado.nome || '-' },
            { rotulo: 'Matrícula', valor: atualizado.matricula || '-' },
            { rotulo: 'Data', valor: fmtData(atualizado?.horarios_disponiveis?.data) },
            { rotulo: 'Horário', valor: String(atualizado?.horarios_disponiveis?.hora_inicio || '').slice(0, 5) },
            { rotulo: 'Situação', valor: aprovado ? 'Confirmado' : 'Não confirmado' },
          ],
        })

        await registrarAtividade(supabaseAdmin, {
          autor: 'coordenador',
          acao: aprovado ? 'confirmou' : 'recusou',
          detalhe: `${atualizado.nome || 'Aluno'} — ${fmtData(atualizado?.horarios_disponiveis?.data)} às ${String(atualizado?.horarios_disponiveis?.hora_inicio || '').slice(0, 5)} (pelo painel)`,
          agendamento_id: atualizado.id,
        })
      }

      return res.status(200).json({ ...atualizado, aviso_aluno: aviso })
    } catch (error) {
      console.error('API agendamento PATCH error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
