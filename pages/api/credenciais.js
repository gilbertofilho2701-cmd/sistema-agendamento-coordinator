// Credenciais do coordenador (troca de usuário e senha).
//
// GET  /api/credenciais                        -> { usuario, configurado }
// PUT  /api/credenciais { senhaAtual, novoUsuario, novaSenha }
//      senhaAtual é sempre exigida (no primeiro acesso é a senha padrão do sistema)
//                                              -> { success: true, usuario }
//
// A senha nunca é devolvida pela API. Fica guardada só como hash scrypt no banco,
// e a conferência da "senha atual" é feita no servidor — por isso a troca passa a
// valer em qualquer aparelho, não apenas no navegador onde foi feita.
import { createClient } from '@supabase/supabase-js'
import {
  credenciaisValidas,
  lerCredenciais,
  salvarCredenciais,
  validarNovaCredencial,
  USUARIO_PADRAO,
} from '../../lib/credenciais'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (!['GET', 'PUT', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (req.method === 'GET') {
      const { usuario, senhaHash } = await lerCredenciais(supabase)
      return res.status(200).json({
        usuario: usuario || USUARIO_PADRAO,
        configurado: Boolean(senhaHash),
      })
    }

    // PUT e POST fazem a mesma coisa (POST só por compatibilidade)
    const { senhaAtual, novoUsuario, novaSenha } = req.body || {}
    if (!novaSenha) {
      return res.status(400).json({ error: 'Informe a nova senha' })
    }

    // Usuário atual: o que está salvo no banco, ou o padrão se nada foi salvo.
    const { usuario: usuarioSalvo, senhaHash } = await lerCredenciais(supabase)
    const usuarioAtual = usuarioSalvo || USUARIO_PADRAO

    // A senha atual é sempre exigida. No primeiro acesso (nada salvo ainda) ela é a
    // senha usada para entrar hoje — a padrão do sistema. Depois, é a senha do coordenador.
    if (!senhaAtual) {
      return res.status(400).json({ error: 'Informe a senha atual' })
    }
    const senhaAtualOk = await credenciaisValidas(supabase, usuarioAtual, senhaAtual)
    if (!senhaAtualOk) {
      await new Promise((r) => setTimeout(r, 400))
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }

    // Campo vazio = manter o usuário atual (trocar só a senha).
    const usuarioFinal = String(novoUsuario || '').trim() || usuarioAtual
    const problema = validarNovaCredencial(usuarioFinal, novaSenha)
    if (problema) {
      return res.status(400).json({ error: problema })
    }

    await salvarCredenciais(supabase, usuarioFinal, novaSenha)
    return res.status(200).json({ success: true, usuario: usuarioFinal })
  } catch (error) {
    console.error('API credenciais error:', error.message)
    return res.status(500).json({ error: error.message || 'Internal error' })
  }
}
