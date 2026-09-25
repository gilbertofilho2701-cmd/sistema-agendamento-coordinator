export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'

function formatDateShort(isoDate) {
  const d = new Date(isoDate + 'T12:00:00')
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return dias[d.getDay()] + ', ' + d.getDate() + ' ' + meses[d.getMonth()]
}

async function loadAvailableDates() {
  try {
    const res = await fetch('/api/slots')
    if (!res.ok) throw new Error('Erro ao carregar datas')
    const slots = await res.json()
    const uniqueDates = [...new Set(slots.map(s => s.data))].sort()
    return uniqueDates
  } catch (e) {
    console.error('Erro ao carregar datas:', e)
    return []
  }
}

export default function Home() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState('')
  const [availableDates, setAvailableDates] = useState([])
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [nome, setNome] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [assuntoInput, setAssuntoInput] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const nomeInputRef = useRef(null)

  useEffect(() => {
    if (nomeInputRef.current) nomeInputRef.current.focus()
  }, [])

  useEffect(() => {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('aluno_id') : null
    const savedNome = typeof window !== 'undefined' ? localStorage.getItem('aluno_nome') : null
    if (savedId && savedNome) {
      setUser({ id: savedId, nome: savedNome })
      setNome(savedNome)
    }
  }, [])

  const days = availableDates

  const handleNomeChange = useCallback((e) => {
    setNome(e.target.value)
  }, [])

  const confirmName = () => {
    if (nome.trim()) {
      const id = crypto.randomUUID()
      localStorage.setItem('aluno_id', id)
      localStorage.setItem('aluno_nome', nome)
      setUser({ id, nome })
    } else {
      localStorage.removeItem('aluno_id')
      localStorage.removeItem('aluno_nome')
      setUser(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const res = await fetch('/api/slots')
        if (!res.ok) throw new Error('Erro')
        const slots = await res.json()
        const dates = [...new Set(slots.map(s => s.data))].sort()
        if (!cancelled) {
          setAvailableDates(dates)
          if (dates.length > 0 && !date) setDate(dates[0])
        }
      } catch (e) {
        console.error('Erro ao carregar datas:', e)
      }
      loadSlots()
      loadBookings()
    }
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const loadSlots = async () => {
    setErrMsg('')
    try {
      setLoading(true)
      const res = await fetch(`/api/slots${date ? '?date=' + date : ''}`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar:', error)
      setErrMsg('Erro ao carregar horários')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/agendamento')
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleSlotClick = (slot) => {
    if (!user || !slot.disponivel) return
    if (!assuntoInput.trim()) {
      setErrMsg('Escreva um motivo antes de solicitar')
      return
    }
    setSelectedSlot(slot)
    setShowConfirmModal(true)
  }

  const confirmBooking = async () => {
    if (!selectedSlot || !assuntoInput.trim()) return
    try {
      const res = await fetch('/api/agendamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: crypto.randomUUID(),
          horario_id: selectedSlot.id,
          motivo: user.nome + ': ' + assuntoInput.trim(),
          status: 'pending'
        })
      })
      if (!res.ok) throw new Error('Erro ao solicitar')
      setShowConfirmModal(false)
      setSelectedSlot(null)
      setAssuntoInput('')
      setErrMsg('')
      setSlots(slots.filter(s => s.id !== selectedSlot.id))
      loadBookings()
    } catch (error) {
      console.error('Erro:', error)
      setErrMsg('Erro ao agendar. Tente novamente.')
    }
  }

  const selectedDate = days.find(d => d === date)
  const dateObj = selectedDate ? new Date(selectedDate + 'T12:00:00') : null
  const userBookings = bookings.filter(b => b.aluno_id === user?.id)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="gradient-orb w-96 h-96 bg-blue-500 top-[-10%] left-[-10%]" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '384px', height: '384px', borderRadius: '50%', filter: 'blur(80px)', opacity: '0.08', background: '#3b82f6' }} />
        <div className="gradient-orb w-80 h-80 bg-blue-600 bottom-[-5%] right-[-5%]" style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '320px', height: '320px', borderRadius: '50%', filter: 'blur(80px)', opacity: '0.06', background: '#2563eb' }} />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-20">
        <div className="card glass mb-6 p-5 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              {user?.nome?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Aluno</p>
              <p className="font-semibold text-white text-lg">{user?.nome || 'Não identificado'}</p>
            </div>
          </div>
          {!user ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input ref={nomeInputRef} type="text" value={nome} onChange={handleNomeChange} onBlur={confirmName} onKeyDown={(e) => { if (e.key === 'Enter') confirmName() }} placeholder="Seu nome completo" className="input-field w-full sm:w-48 text-sm py-2" />
              <button onClick={() => { setNome(''); setUser(null); localStorage.removeItem('aluno_id'); localStorage.removeItem('aluno_nome') }} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 font-medium">Sair</button>
            </div>
          ) : (
            <button onClick={() => { setNome(''); setUser(null); localStorage.removeItem('aluno_id'); localStorage.removeItem('aluno_nome') }} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 font-medium">Sair</button>
          )}
          <textarea
            value={assuntoInput}
            onChange={(e) => setAssuntoInput(e.target.value)}
            placeholder="Motivo da reunião (obrigatório)"
            className="input-field w-full sm:w-64 text-sm py-2 mt-2"
            rows={2}
          />
        </div>

        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-responsive-2xl font-bold text-white">Horários</h1>
              <p className="text-gray-400 text-sm mt-1">Escolha um horário livre para agendar</p>
              {date && (() => { const d = new Date(date + 'T12:00:00'); const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return <p className="text-blue-400 text-xs mt-0.5">{monthNames[d.getMonth()]} / {d.getFullYear()}</p> })()}
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin -mx-1 px-1">
            {days.map((d, i) => {
              const isActive = date === d
              const dObj = new Date(d + 'T12:00:00')
              const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dObj.getDay()]
              const dayNum = dObj.getDate()
              return (
                <button key={d} onClick={() => setDate(d)} className={`flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold transition-all min-w-[100px] ${isActive ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white'}`} style={{ animationDelay: `${0.15 + i * 0.05}s`, animationFillMode: 'both', animation: `slideUp 0.3s ease-out ${0.15 + i * 0.05}s both` }}>
                  <span className="block text-xs opacity-60 mb-0.5">{dayName}</span>
                  <span className="block text-base">{String(dayNum).padStart(2, '0')}/{String(dObj.getMonth() + 1).padStart(2, '0')}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="card glass p-6 animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <h2 className="text-lg font-bold text-white mb-4">Horários Disponíveis</h2>
          {loading ? (
            <div className="text-center py-8"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div></div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum horário disponível para esta data</p>
              <p className="text-gray-600 text-sm mt-2">Verifique outras datas ou aguarde o coordenador</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot, i) => {
                const isAvailable = slot.disponivel && !bookings.some(b => b.horario_id === slot.id && b.status === "pending")
                return (
                  <button key={slot.id} onClick={() => handleSlotClick(slot)} disabled={!isAvailable || showConfirmModal} className={`p-5 rounded-xl text-left transition-all border ${isAvailable ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30 cursor-pointer' : 'bg-red-500/10 border-red-500/20 cursor-not-allowed opacity-60'}`} style={{ animationDelay: `${0.2 + i * 0.05}s`, animationFillMode: 'both', animation: `fadeIn 0.3s ease-out ${0.2 + i * 0.05}s both` }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white text-lg">{slot.hora_inicio?.slice(0,5)} - {slot.hora_fim?.slice(0,5)}</p>
                        <p className="text-gray-400 text-sm mt-1">{formatDateShort(slot.data)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isAvailable ? 'Livre' : 'Ocupado'}
                      </span>
                    </div>
                    {slot.motivo && <p className="text-[10px] text-blue-400 truncate mt-0.5">{slot.motivo}</p>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {errMsg && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center animate-slide-down">{errMsg}</div>}

        {showConfirmModal && selectedSlot && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card glass p-8 max-w-md w-full animate-slideUp border border-blue-500/20">
              <h3 className="text-xl font-bold text-white mb-6 text-center">Confirmar Agendamento</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400 text-sm">Horário</span>
                  <span className="text-white font-semibold">{selectedSlot.hora_inicio?.slice(0,5)} - {selectedSlot.hora_fim?.slice(0,5)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400 text-sm">Data</span>
                  <span className="text-white font-semibold">{selectedSlot.data}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400 text-sm">Aluno</span>
                  <span className="text-blue-400 font-semibold">{user?.nome}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-400 text-sm">Motivo</span>
                  <span className="text-white font-semibold">{assuntoInput.trim()}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowConfirmModal(false); setSelectedSlot(null); setErrMsg('') }} className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition-all font-medium">Cancelar</button>
                <button onClick={confirmBooking} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-bold">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <a href="/chat" className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 hover:scale-110 transition-transform">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </a>
    </div>
  )
}
