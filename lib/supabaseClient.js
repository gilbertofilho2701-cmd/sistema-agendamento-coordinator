import { createClient } from '@supabase/supabase-js'

// Credenciais e chaves
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhvufnloudmjcbdzekzb.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_VrMSri0JJl_kk7CrnfZINw_dfG_Spcy'

// Service role key para bypass RLS (servidor-side apenas)
const serviceKey = process.env.SUPABASE_SERVICE_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// Credenciais fixas do coordenador
export const COORDENADOR_USER = 'viniciucoodernador'
export const COORDENADOR_PASS = '123456'

export function isCoordenador(usuario, senha) {
  return usuario === COORDENADOR_USER && senha === COORDENADOR_PASS
}

// Funções para agendamento
export async function getAvailableSlots(date) {
  try {
    // Tenta 사용하므로 API com service key (bypass RLS)
    const res = await fetch('/api/slots')
    if (res.ok) {
      const data = await res.json()
      return data.filter(s => s.data === date && s.disponivel)
    }
  } catch (e) {
    // Fallback para anon key (pode falhar com RLS)
    console.warn('Fallback para anon key:', e.message)
  }
  
  // Fallback: usar Supabase anon key
  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .select('*')
    .eq('data', date)
    .eq('disponivel', true)
    .order('hora_inicio', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function createBooking(booking) {
  const { data, error } = await supabase
    .from('agendamentos')
    .insert([booking])
    .select()
  
  if (error) throw error
  return data[0]
}

export async function getBookings() {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(`*, horarios_disponiveis(*)`)
  
  if (error) throw error
  return data || []
}

export async function getAllSlots() {
  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .select('*')
    .order('data', { ascending: true })
    .order('hora_inicio', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function addSlot(slot) {
  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .insert([slot])
    .select()
  
  if (error) throw error
  return data[0]
}

export async function updateSlot(id, updates) {
  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export async function deleteSlot(id) {
  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  return data
}