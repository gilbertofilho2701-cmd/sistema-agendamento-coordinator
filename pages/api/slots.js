import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dhvufnloudmjcbdzekzb.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Service key not configured' })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    if (req.method === 'GET') {
      const date = req.query.date
      let query = supabaseAdmin
        .from('horarios_disponiveis')
        .select('*')
        .order('data', { ascending: true })
        .order('hora_inicio', { ascending: true })
      
      if (date) {
        query = query.eq('data', date)
      }
      
      const { data, error } = await query
      if (error) throw error
      return res.status(200).json(data || [])
    }

    if (req.method === 'POST') {
      const body = req.body || req.query
      const { data: inserted, error } = await supabaseAdmin
        .from('horarios_disponiveis')
        .insert([body])
        .select()
      if (error) throw error
      return res.status(201).json(inserted?.[0] || {})
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || req.query
      const { data, error } = await supabaseAdmin
        .from('horarios_disponiveis')
        .update(updates)
        .eq('id', id)
        .select()
      if (error) throw error
      return res.status(200).json(data?.[0] || {})
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || req.query
      const { error } = await supabaseAdmin
        .from('horarios_disponiveis')
        .delete()
        .eq('id', id)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API slots error:', error.message)
    return res.status(500).json({ error: error.message || 'Internal error' })
  }
}
