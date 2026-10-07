// Webhook do WhatsApp Business (Meta Cloud API).
//
// GET  /api/whatsapp/webhook  -> verificação exigida pela Meta ao cadastrar a URL
// POST /api/whatsapp/webhook  -> recebe mensagens/status enviados pela Meta
//
// A verificação usa WHATSAPP_VERIFY_TOKEN (você inventa o valor e informa na Meta).
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

  if (req.method === 'POST') {
    // A Meta espera 200 rápido, senão reenvia a mesma mensagem
    try {
      const entradas = req.body?.entry || []
      for (const entrada of entradas) {
        for (const mudanca of entrada.changes || []) {
          const valor = mudanca.value || {}
          for (const msg of valor.messages || []) {
            console.log('WhatsApp recebido de', msg.from, ':', msg.text?.body || msg.type)
          }
          for (const st of valor.statuses || []) {
            console.log('WhatsApp status', st.status, 'para', st.recipient_id)
          }
        }
      }
    } catch (e) {
      console.error('webhook whatsapp erro:', e.message)
    }
    return res.status(200).json({ received: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
