// Envio de e-mail para o aluno.
//
// Usa SMTP (funciona com o Gmail do coordenador, sem custo).
// Variáveis de ambiente:
//   SMTP_HOST      ex: smtp.gmail.com
//   SMTP_PORT      ex: 465
//   SMTP_USER      ex: coordenacao@gmail.com
//   SMTP_PASS      senha de app do Gmail (16 letras, NÃO é a senha normal)
//   EMAIL_FROM     (opcional) remetente exibido; padrão = SMTP_USER
//
// Enquanto as variáveis não existirem, o sistema segue funcionando e apenas
// registra que o e-mail foi pulado.

import nodemailer from 'nodemailer'

let transporte = null

export function emailConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporte() {
  if (!emailConfigurado()) return null
  if (!transporte) {
    const porta = Number(process.env.SMTP_PORT || 465)
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporte
}

export function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

function corpoHtml({ titulo, linhas, destaque }) {
  const itens = linhas
    .map((l) => `<tr><td style="padding:6px 0;color:#555">${l.rotulo}</td><td style="padding:6px 0;font-weight:600">${l.valor}</td></tr>`)
    .join('')
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto">
    <div style="background:#2563eb;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">
      <h2 style="margin:0;font-size:18px">${titulo}</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:20px 22px">
      ${destaque ? `<p style="font-size:16px;margin:0 0 14px">${destaque}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:14px">${itens}</table>
      <p style="margin-top:22px;font-size:12px;color:#888">
        Coordenação acadêmica — mensagem automática, não é preciso responder.
      </p>
    </div>
  </div>`
}

// Envia e-mail para o aluno. Nunca lança: devolve { ok, erro? }
export async function enviarEmail({ to, assunto, titulo, linhas, destaque, textoSimples }) {
  if (!emailValido(to)) {
    return { ok: false, pulado: true, motivo: 'aluno sem e-mail válido' }
  }
  const t = getTransporte()
  if (!t) {
    return { ok: false, pulado: true, motivo: 'e-mail não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS)' }
  }
  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: to.trim(),
      subject: assunto,
      text: textoSimples || undefined,
      html: corpoHtml({ titulo, linhas, destaque }),
    })
    return { ok: true, id: info.messageId }
  } catch (e) {
    return { ok: false, erro: e.message }
  }
}
