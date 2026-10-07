// Webhook do WhatsApp Business (Meta Cloud API).
//
// GET  /api/whatsapp/webhook  -> verificação exigida pela Meta ao cadastrar a URL
// POST /api/whatsapp/webhook  -> recebe as respostas do coordenador e processa o bot
//
// É por aqui que o coordenador confirma ou recusa um atendimento respondendo no
// WhatsApp, sem precisar abrir o sistema.
import { supabaseAdmin } from '../../../lib/notificar'
import { processarMensagem } from '../../../lib/bot'
import { marcarComoLida } from '../../../lib/whatsapp'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const modo = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const desafio = req.query['hub.challenge']
    if (modo === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(String(desafio))
    }
    return res.status(403).json({ error: 'verify_token inválido' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Importante: no Vercel (serverless) a função é congelada assim que a resposta
  // é enviada. Por isso processamos ANTES de responder — o processamento leva
  // menos de 1 segundo, bem dentro do limite da Meta. Se algo falhar, ainda
  // respondemos 200 para a Meta não ficar reenviando a mesma mensagem.
  try {
    const supabase = supabaseAdmin()
    const entradas = req.body?.entry || []

    for (const entrada of entradas) {
      for (const mudanca of entrada.changes || []) {
        const valor = mudanca.value || {}

        // 1. Guarda o que foi enviado/recebido (histórico da conversa)
        for (const msg of valor.messages || []) {
          const texto = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || ''
          const buttonId = msg.interactive?.button_reply?.id || msg.button?.payload || null

          try {
            await supabase.from('mensagens_whatsapp').insert([{
              direcao: 'recebida',
              telefone: msg.from,
              conteudo: texto,
              tipo: msg.type,
              payload: buttonId,
            }])
          } catch (e) {
            console.warn('histórico:', e.message)
          }

          await marcarComoLida(msg.id)

          // 2. Processa a decisão do coordenador
          const r = await processarMensagem(supabase, {
            telefone: msg.from,
            texto,
            buttonId,
            messageId: msg.id,
          })
          console.log('bot:', JSON.stringify(r))
        }

        for (const st of valor.statuses || []) {
          console.log('whatsapp status:', st.status, '->', st.recipient_id)
        }
      }
    }
  } catch (e) {
    console.error('webhook whatsapp erro:', e.message)
  }

  return res.status(200).json({ received: true })
}
