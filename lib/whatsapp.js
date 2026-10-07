// Envio de mensagens pela API oficial do WhatsApp Business (Meta Cloud API).
//
// Variáveis de ambiente necessárias (configure no Vercel):
//   WHATSAPP_TOKEN        Token de acesso (permanente ou temporário do número de teste)
//   WHATSAPP_PHONE_ID     ID do número (Phone number ID) no app da Meta
//   WHATSAPP_VERIFY_TOKEN Token que você inventa, usado na verificação do webhook
//   WHATSAPP_TO_COORDENADOR  Número do coordenador (ex: +5588999999999)
//   WHATSAPP_API_VERSION  (opcional) default v21.0
//
// Modelos (opcionais): a Meta só deixa enviar texto livre dentro de 24h depois da
// última mensagem do destinatário. Fora dessa janela é obrigatório usar um modelo
// aprovado. Se WHATSAPP_TEMPLATE_* estiver definido, o envio usa modelo.

const GRAPH = 'https://graph.facebook.com'

export function apiVersion() {
  return process.env.WHATSAPP_API_VERSION || 'v21.0'
}

export function whatsappConfigurado() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
}

// Converte "(88) 99999-9999", "88999999999", "5588999999999" etc. em "5588999999999"
export function normalizarTelefone(raw) {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (!d) return null
  d = d.replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (d.length < 12 || d.length > 15) return null
  return d
}

async function chamar(payload) {
  const url = `${GRAPH}/${apiVersion()}/${process.env.WHATSAPP_PHONE_ID}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, erro: body?.error?.message || `HTTP ${res.status}`, codigo: body?.error?.code }
  }
  return { ok: true, id: body?.messages?.[0]?.id }
}

// Texto simples
export async function enviarWhatsApp({ to, mensagem, template, parametros }) {
  if (!whatsappConfigurado()) {
    return { ok: false, pulado: true, motivo: 'WhatsApp não configurado (WHATSAPP_TOKEN/WHATSAPP_PHONE_ID ausentes)' }
  }
  const telefone = normalizarTelefone(to)
  if (!telefone) return { ok: false, pulado: true, motivo: 'Telefone ausente ou inválido: ' + String(to) }

  const payload = { messaging_product: 'whatsapp', to: telefone }
  if (template) {
    payload.type = 'template'
    payload.template = {
      name: template,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'pt_BR' },
      components: parametros?.length
        ? [{ type: 'body', parameters: parametros.map((p) => ({ type: 'text', text: String(p) })) }]
        : undefined,
    }
  } else {
    payload.type = 'text'
    payload.text = { preview_url: false, body: mensagem }
  }
  try {
    const r = await chamar(payload)
    return { ...r, telefone }
  } catch (e) {
    return { ok: false, erro: e.message, telefone }
  }
}

// Mensagem com botões (o coordenador toca para decidir, sem digitar nada)
// botoes: [{ id: 'confirmar_12', titulo: '✅ Confirmar' }, ...] — até 3
export async function enviarWhatsAppBotoes({ to, texto, botoes, cabecalho, rodape }) {
  if (!whatsappConfigurado()) {
    return { ok: false, pulado: true, motivo: 'WhatsApp não configurado' }
  }
  const telefone = normalizarTelefone(to)
  if (!telefone) return { ok: false, pulado: true, motivo: 'Telefone inválido: ' + String(to) }

  const payload = {
    messaging_product: 'whatsapp',
    to: telefone,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(cabecalho ? { header: { type: 'text', text: String(cabecalho).slice(0, 60) } } : {}),
      body: { text: String(texto).slice(0, 1024) },
      ...(rodape ? { footer: { text: String(rodape).slice(0, 60) } } : {}),
      action: {
        buttons: (botoes || []).slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: String(b.id).slice(0, 256), title: String(b.titulo).slice(0, 20) },
        })),
      },
    },
  }
  try {
    const r = await chamar(payload)
    return { ...r, telefone }
  } catch (e) {
    return { ok: false, erro: e.message, telefone }
  }
}

// Marca a mensagem recebida como lida (dá o "visto" para o coordenador)
export async function marcarComoLida(messageId) {
  if (!whatsappConfigurado() || !messageId) return { ok: false, pulado: true }
  try {
    return await chamar({ messaging_product: 'whatsapp', status: 'read', message_id: messageId })
  } catch (e) {
    return { ok: false, erro: e.message }
  }
}

// Diagnóstico da conta (útil para conferir se o token/número estão válidos)
export async function checarConta() {
  if (!whatsappConfigurado()) return { ok: false, motivo: 'não configurado' }
  try {
    const res = await fetch(`${GRAPH}/${apiVersion()}/${process.env.WHATSAPP_PHONE_ID}`, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    })
    const body = await res.json().catch(() => ({}))
    return {
      ok: res.ok,
      numero_do_app: body?.display_phone_number,
      nome: body?.verified_name,
      qualidade: body?.quality_rating,
      erro: body?.error?.message,
    }
  } catch (e) {
    return { ok: false, erro: e.message }
  }
}
