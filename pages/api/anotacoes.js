// Bloco de notas do coordenador.
//
// GET    /api/anotacoes          -> lista (fixadas primeiro, depois as mais recentes)
// POST   /api/anotacoes { texto } -> cria uma anotação
// PATCH  /api/anotacoes { id, texto?, fixada? } -> edita ou fixa/desfixa
// DELETE /api/anotacoes?id=N     -> apaga
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados' })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('anotacoes')
        .select('*')
        .order('fixada', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return res.status(200).json(data || [])
    }

    if (req.method === 'POST') {
      const texto = String((req.body || {}).texto || '').trim()
      if (!texto) return res.status(400).json({ error: 'Escreva algo antes de salvar' })
      if (texto.length > 2000) return res.status(400).json({ error: 'Anotação muito longa (máx. 2000 caracteres)' })

      const { data, error } = await supabase
        .from('anotacoes')
        .insert([{ texto, autor: (req.body || {}).autor || 'coordenador' }])
        .select()
      if (error) throw error
      return res.status(201).json(data?.[0] || {})
    }

    if (req.method === 'PATCH') {
      const { id, texto, fixada } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id é obrigatório' })

      const campos = { updated_at: new Date().toISOString() }
      if (typeof texto === 'string') {
        const t = texto.trim()
        if (!t) return res.status(400).json({ error: 'A anotação não pode ficar vazia' })
        campos.texto = t
      }
      if (typeof fixada === 'boolean') campos.fixada = fixada

      const { data, error } = await supabase.from('anotacoes').update(campos).eq('id', id).select()
      if (error) throw error
      return res.status(200).json(data?.[0] || {})
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || (req.body || {}).id
      if (!id) return res.status(400).json({ error: 'id é obrigatório' })
      const { error } = await supabase.from('anotacoes').delete().eq('id', id)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API anotacoes error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
