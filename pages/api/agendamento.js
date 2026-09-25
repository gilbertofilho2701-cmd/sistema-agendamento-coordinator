import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dhvufnloudmjcbdzekzb.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Service key not configured' })
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    try {
      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .select('*, horarios_disponiveis(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json(data || [])
    } catch (error) {
      console.error('API agendamento GET error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    if (!SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Service key not configured' })
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    try {
      const booking = req.body || req.query
      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .insert([{ ...booking, status: booking.status || 'pendente' }])
        .select()
      if (error) throw error
      return res.status(201).json(data?.[0] || {})
    } catch (error) {
      console.error('API agendamento POST error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PATCH') {
    if (!SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Service key not configured' })
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    try {
      const { id, status } = req.body || req.query
      const { data, error } = await supabaseAdmin
        .from('agendamentos')
        .update({ status })
        .eq('id', id)
        .select()
      if (error) throw error
      return res.status(200).json(data?.[0] || {})
    } catch (error) {
      console.error('API agendamento PATCH error:', error.message)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
