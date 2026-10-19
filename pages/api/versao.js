// Versão publicada do sistema.
//
// GET /api/versao -> { versao: "2026-10-19.2" }
//
// O navegador compara essa versão com a que veio no código da página que ele está
// rodando. Se forem diferentes, a aba está desatualizada e o usuário é avisado para
// recarregar. Rota pública de propósito: quem está na tela de login precisa dela.
import { VERSAO } from '../../lib/versao'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  return res.status(200).json({ versao: VERSAO })
}
