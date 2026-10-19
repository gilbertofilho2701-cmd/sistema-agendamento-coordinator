// Login do coordenador.
//
// POST /api/login { usuario, senha } -> { ok: true, usuario, token } | 401
//
// O token (assinado com HMAC) é o que o painel manda depois nas rotas do coordenador.
//
// A senha é conferida no servidor (hash scrypt guardado no banco), então a troca
// de credenciais vale em qualquer aparelho.
import { createClient } from '@supabase/supabase-js'
import { credenciaisValidas } from '../../lib/credenciais'
import { criarToken } from '../../lib/sessao'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }

  const { usuario, senha } = req.body || {}
  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Informe usuário e senha' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const ok = await credenciaisValidas(supabase, usuario, senha)
    if (!ok) {
      // Pequena espera para desencorajar tentativa em massa
      await new Promise((r) => setTimeout(r, 400))
      return res.status(401).json({ error: 'Usuário ou senha incorretos' })
    }
    const usuarioLimpo = String(usuario).trim()
    const token = await criarToken(usuarioLimpo)
    return res.status(200).json({ ok: true, usuario: usuarioLimpo, token })
  } catch (error) {
    console.error('API login error:', error.message)
    return res.status(500).json({ error: error.message || 'Internal error' })
  }
}
