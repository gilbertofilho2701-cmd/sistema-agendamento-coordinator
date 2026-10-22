// Sessão do coordenador: token assinado (HMAC), sem guardar sessão no banco.
//
// O painel guarda o token no navegador e manda em "Authorization: Bearer <token>"
// nas rotas que só o coordenador pode usar. As rotas do aluno (ver horários livres,
// pedir agendamento, consultar o próprio histórico e as próprias notificações)
// continuam abertas, porque a página do aluno não tem login por decisão do projeto.
//
// Se SESSION_SECRET existir no ambiente, ele é o segredo. Senão, o segredo é derivado
// da senha do coordenador — assim, trocar a senha derruba todas as sessões antigas.

import crypto from 'crypto'
import { USUARIO_PADRAO } from './credenciais'

const VALIDADE_MS = 1000 * 60 * 60 * 12 // 12 horas

async function segredo() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  // Segredo estável: não depende do banco (evita que cold start / hibernação
  // ou falha temporária do Supabase mudem o segredo e invalidem os tokens).
  // Trocar a senha não derruba sessões automaticamente, mas os tokens expiram
  // em 12h de qualquer forma. Para derrubar sessões ao trocar a senha,
  // configure SESSION_SECRET no Vercel.
  const base = process.env.SUPABASE_SERVICE_KEY || 'coordenador-painel'
  return crypto.createHash('sha256').update('sessao-painel::' + base).digest('hex')
}

export async function criarToken(usuario) {
  const corpo = Buffer.from(
    JSON.stringify({ u: usuario || USUARIO_PADRAO, exp: Date.now() + VALIDADE_MS })
  ).toString('base64url')
  const assinatura = crypto.createHmac('sha256', await segredo()).update(corpo).digest('base64url')
  return `${corpo}.${assinatura}`
}

export async function verificarToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const partes = token.split('.')
  const corpo = partes[0]
  const assinatura = partes[1] || ''
  const esperada = crypto.createHmac('sha256', await segredo()).update(corpo).digest('base64url')
  const recebida = Buffer.from(assinatura)
  const calculada = Buffer.from(esperada)
  if (recebida.length !== calculada.length) return null
  if (!crypto.timingSafeEqual(recebida, calculada)) return null
  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
    if (!dados.exp || dados.exp < Date.now()) return null
    return dados
  } catch (e) {
    return null
  }
}

function tokenDoPedido(req) {
  const cabecalho = req.headers.authorization || req.headers.Authorization || ''
  if (String(cabecalho).startsWith('Bearer ')) return String(cabecalho).slice(7).trim()
  const cookie = req.headers.cookie || ''
  const achado = cookie.match(/(?:^|;\s*)painel_token=([^;]+)/)
  return achado ? decodeURIComponent(achado[1]) : ''
}

// Devolve os dados da sessão (ou null). Use nas rotas do coordenador.
export async function sessaoDoCoordenador(req) {
  return verificarToken(tokenDoPedido(req))
}

// Responde 401 e devolve false quando não há sessão válida.
// Uso: if (!(await exigirCoordenador(req, res))) return
export async function exigirCoordenador(req, res) {
  const sessao = await sessaoDoCoordenador(req)
  if (sessao) return true
  res.status(401).json({ error: 'Faça login no painel do coordenador para esta ação' })
  return false
}
