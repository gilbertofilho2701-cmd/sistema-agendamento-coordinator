// Regras de aviso do sistema.
//
//   Aluno        -> e-mail (grátis) + sino no painel do aluno
//   Coordenador  -> WhatsApp com botões (confirma sem entrar no sistema) + aviso no painel
//
// Nada aqui lança exceção: cada envio devolve { ok, pulado?, erro?, motivo? }
// para que uma falha de e-mail/WhatsApp nunca derrube o agendamento.

import { createClient } from '@supabase/supabase-js'
import { enviarWhatsApp, enviarWhatsAppBotoes, normalizarTelefone, whatsappConfigurado } from './whatsapp'
import { enviarEmail, emailValido, emailConfigurado } from './email'

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados')
  return createClient(url, key)
}

const fmtData = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-')
  return `${d}/${m}/${a}`
}
const fmtHora = (h) => String(h || '').slice(0, 5)
const horarioTexto = (b) => `${fmtData(b?.horarios_disponiveis?.data)} às ${fmtHora(b?.horarios_disponiveis?.hora_inicio)}`

// Código curto para citar no WhatsApp (ex: A7K2)
export function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += letras[Math.floor(Math.random() * letras.length)]
  return s
}

// ---------------------------------------------------------------- textos

export const assuntoAprovado = 'Atendimento confirmado'
export const assuntoRecusado = 'Atendimento não confirmado'
export const assuntoTransferido = 'Seu atendimento foi remarcado'
export const assuntoRecebido = 'Recebemos sua solicitação de atendimento'

export const textoAprovacao = (b) => `✅ Seu atendimento foi CONFIRMADO para ${horarioTexto(b)}.`
export const textoRejeicao = (b) => `❌ Seu atendimento de ${horarioTexto(b)} NÃO foi confirmado. Procure a coordenação para escolher outro horário.`
export const textoTransferencia = (b) => `🔄 Seu atendimento foi REMARCADO para ${horarioTexto(b)}.`
export const textoRecebido = (b) =>
  `📨 Recebemos sua solicitação para ${horarioTexto(b)}. Você será avisado por e-mail assim que a coordenação confirmar.`

// Mensagem que o coordenador recebe (com botões)
export const textoSolicitacaoCoordenador = (b) =>
  `📅 Nova solicitação de atendimento\n\n` +
  `👤 ${b?.nome || 'Aluno não informado'}\n` +
  `🎓 Matrícula: ${b?.matricula || '-'}  |  ${b?.curso || '-'} / ${b?.turma || '-'}\n` +
  `🕒 ${horarioTexto(b)}\n` +
  `📝 ${(b?.motivo || '').replace(/^[^:]*:\s*/, '') || 'sem motivo informado'}\n` +
  `✉️ ${b?.email || 'sem e-mail'}\n` +
  `🔖 Código: ${b?.codigo || '-'}`

// ---------------------------------------------------------------- atividades

export async function registrarAtividade(supabase, { autor, acao, detalhe, agendamento_id }) {
  try {
    await supabase.from('atividades').insert([{ autor, acao, detalhe, agendamento_id: agendamento_id || null }])
  } catch (e) {
    console.warn('atividade não registrada:', e.message)
  }
}

// ---------------------------------------------------------------- aluno

// Avisa o aluno: grava no sino, manda e-mail e (se houver telefone) WhatsApp.
export async function notificarAluno(supabase, { aluno_id, tipo, mensagem, email, telefone, assunto, linhas, destaque }) {
  const resultado = { banco: null, email: null, whatsapp: null }

  if (aluno_id) {
    const { data, error } = await supabase
      .from('notificacoes')
      .insert([{ aluno_id, tipo, mensagem, lida: false, destinatario: 'aluno', canal: 'painel', created_at: new Date().toISOString() }])
      .select()
    resultado.banco = error ? { erro: error.message } : { ok: true, id: data?.[0]?.id }
  }

  resultado.email = await enviarEmail({
    to: email,
    assunto: assunto || 'Atualização do seu atendimento',
    titulo: assunto || 'Atualização do seu atendimento',
    destaque: mensagem,
    linhas: linhas || [],
    textoSimples: mensagem,
  })

  // WhatsApp do aluno é opcional: só vai se o aluno tiver informado o número.
  if (telefone) {
    resultado.whatsapp = await enviarWhatsApp({ to: telefone, mensagem })
  } else {
    resultado.whatsapp = { ok: false, pulado: true, motivo: 'aluno não informou telefone' }
  }

  return resultado
}

// ---------------------------------------------------------------- coordenador

// Descobre o número do coordenador: banco primeiro, depois variável de ambiente.
export async function numeroDoCoordenador(supabase) {
  let destino = process.env.WHATSAPP_TO_COORDENADOR
  if (supabase) {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'whatsapp_coordenador')
        .maybeSingle()
      if (data?.valor) destino = data.valor
    } catch (e) {
      console.warn('não foi possível ler whatsapp_coordenador:', e.message)
    }
  }
  return destino ? normalizarTelefone(destino) : null
}

// Avisa o coordenador de uma nova solicitação.
// Manda botões (Confirmar / Recusar) e grava também no sino do painel.
export async function notificarCoordenador(supabase, agendamento) {
  const resultado = { banco: null, whatsapp: null }

  const mensagem = textoSolicitacaoCoordenador(agendamento)
  const id = agendamento?.id

  // Sino do painel do coordenador
  try {
    const { error } = await supabase.from('notificacoes').insert([{
      aluno_id: 'coordenador',
      tipo: 'solicitacao',
      mensagem,
      lida: false,
      destinatario: 'coordenador',
      canal: 'painel',
      created_at: new Date().toISOString(),
    }])
    resultado.banco = error ? { erro: error.message } : { ok: true }
  } catch (e) {
    resultado.banco = { erro: e.message }
  }

  const destino = await numeroDoCoordenador(supabase)
  if (!destino) {
    resultado.whatsapp = { ok: false, pulado: true, motivo: 'Número do coordenador não configurado' }
    return resultado
  }

  // Botões: funciona tanto pelo id (confirmar_12) quanto pelo código digitado.
  let envio = await enviarWhatsAppBotoes({
    to: destino,
    texto: mensagem,
    botoes: [
      { id: `confirmar_${id}`, titulo: '✅ Confirmar' },
      { id: `recusar_${id}`, titulo: '❌ Recusar' },
    ],
    rodape: 'Ou responda 1 = confirmar, 2 = recusar',
  })

  // Se a conta ainda não libera botões, cai para texto simples
  if (!envio.ok && !envio.pulado) {
    const texto = `${mensagem}\n\nResponda:\n1 = ✅ Confirmar\n2 = ❌ Recusar`
    const textoEnvio = await enviarWhatsApp({ to: destino, mensagem: texto })
    envio = { ...textoEnvio, aviso: 'botões indisponíveis, enviado como texto: ' + (envio.erro || '') }
  }

  // Guarda qual foi a última solicitação enviada, para o "1"/"2" sem código
  if (envio.ok) {
    try {
      await supabase.from('bot_estado').upsert({ telefone: destino, ultimo_agendamento_id: id, updated_at: new Date().toISOString() })
    } catch (e) {
      console.warn('bot_estado não atualizado:', e.message)
    }
  }

  resultado.whatsapp = envio
  return resultado
}

export { whatsappConfigurado, emailConfigurado, emailValido, normalizarTelefone }
