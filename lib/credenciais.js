// Credenciais do coordenador.
//
// Ficam no banco (tabela `configuracoes`, chave/valor) — NÃO no navegador.
// Assim a troca vale em qualquer aparelho, e não só no navegador onde foi feita.
//
// Chaves usadas: coordenador_usuario e coordenador_senha (hash scrypt com salt).
// Recuperação: se as variáveis COORDENADOR_USUARIO / COORDENADOR_SENHA existirem
// no ambiente, elas sempre valem (útil se a senha for esquecida).
import crypto from 'crypto'

const CHAVE_USUARIO = 'coordenador_usuario'
const CHAVE_SENHA = 'coordenador_senha'

// Padrão do sistema: vale só enquanto nenhuma credencial foi salva no banco.
export const USUARIO_PADRAO = 'viniciucoodernador'
export const SENHA_PADRAO = '123456'

const KEYLEN = 64
const TAMANHO_MINIMO_SENHA = 6
const TAMANHO_MINIMO_USUARIO = 3

export function gerarHash(senha) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(senha), salt, KEYLEN).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function conferirSenha(senha, armazenado) {
  if (!armazenado || typeof armazenado !== 'string') return false
  const partes = armazenado.split('$')
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false
  const [, salt, hash] = partes
  try {
    const calculado = crypto.scryptSync(String(senha), salt, KEYLEN)
    const esperado = Buffer.from(hash, 'hex')
    if (esperado.length !== calculado.length) return false
    return crypto.timingSafeEqual(calculado, esperado)
  } catch {
    return false
  }
}

const normalizar = (v) => String(v == null ? '' : v).trim()

export async function lerCredenciais(supabase) {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('chave, valor')
    .in('chave', [CHAVE_USUARIO, CHAVE_SENHA])
  if (error) throw error
  const mapa = Object.fromEntries((data || []).map((r) => [r.chave, r.valor]))
  return { usuario: mapa[CHAVE_USUARIO] || null, senhaHash: mapa[CHAVE_SENHA] || null }
}

export async function salvarCredenciais(supabase, usuario, senha) {
  const agora = new Date().toISOString()
  const { error } = await supabase.from('configuracoes').upsert([
    { chave: CHAVE_USUARIO, valor: normalizar(usuario), updated_at: agora },
    { chave: CHAVE_SENHA, valor: gerarHash(senha), updated_at: agora },
  ])
  if (error) throw error
}

// Credencial de recuperação vinda do ambiente (sempre aceita, se existir).
function recuperacaoPorAmbiente(usuario, senha) {
  const envSenha = process.env.COORDENADOR_SENHA
  if (!envSenha) return false
  const envUsuario = process.env.COORDENADOR_USUARIO || USUARIO_PADRAO
  return normalizar(usuario).toLowerCase() === normalizar(envUsuario).toLowerCase() && String(senha) === envSenha
}

export async function credenciaisValidas(supabase, usuario, senha) {
  const u = normalizar(usuario)
  const s = String(senha == null ? '' : senha)
  if (!u || !s) return false

  if (recuperacaoPorAmbiente(u, s)) return true

  const { usuario: usuarioSalvo, senhaHash } = await lerCredenciais(supabase)
  if (senhaHash) {
    return u.toLowerCase() === normalizar(usuarioSalvo).toLowerCase() && conferirSenha(s, senhaHash)
  }

  // Nada salvo ainda: vale o padrão do sistema.
  return u.toLowerCase() === USUARIO_PADRAO.toLowerCase() && s === SENHA_PADRAO
}

// Validação do formulário de troca de credenciais.
export function validarNovaCredencial(usuario, senha) {
  const u = normalizar(usuario)
  if (u.length < TAMANHO_MINIMO_USUARIO) {
    return `O usuário precisa ter pelo menos ${TAMANHO_MINIMO_USUARIO} caracteres.`
  }
  if (/\s/.test(u)) return 'O usuário não pode ter espaços.'
  if (String(senha).length < TAMANHO_MINIMO_SENHA) {
    return `A nova senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
  }
  return null
}
