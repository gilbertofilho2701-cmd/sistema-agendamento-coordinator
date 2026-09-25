import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, getAvailableSlots, getAllSlots, createBooking, getBookings, addSlot, updateSlot, deleteSlot } from '../lib/supabaseClient'

export default function Coordenador() {
  const [page, setPage] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [formData, setFormData] = useState({ data: '', hora_inicio: '', hora_fim: '', disponivel: true, local: '' })
  const [success, setSuccess] = useState('')
  const [transferModal, setTransferModal] = useState(null)  // bookingId being transferred
  const [transferSlots, setTransferSlots] = useState([])
  const [selectedTransferSlot, setSelectedTransferSlot] = useState(null)

  useEffect(() => {
    const auth = typeof window !== 'undefined' ? localStorage.getItem('painel_auth') : null
    const emailUser = typeof window !== 'undefined' ? localStorage.getItem('painel_email') : null
    if (auth === 'true' && emailUser) {
      setPage('dashboard')
      loadData()
    } else {
      setPage('login')
    }
  }, [])

  const loadData = async () => {
    try {
      const slotsRes = await fetch('/api/slots')
      const slotsData = await slotsRes.json()
      setSlots(Array.isArray(slotsData) ? slotsData : [])
    } catch (e) {
      console.error('Erro slots:', e)
    }
    try {
      const bookingsRes = await fetch('/api/agendamento')
      const bookingsData = await bookingsRes.json()
      setBookings(Array.isArray(bookingsData) ? bookingsData : [])
    } catch (e) {
      console.error('Erro bookings:', e)
    }
  }

  const loadTransferSlots = async (bookingId) => {
    try {
      const res = await fetch('/api/slots')
      const data = await res.json()
      // Filter available slots (disponivel: true) and exclude the booking's current slot
      const available = Array.isArray(data) ? data.filter(s => s.disponivel) : []
      setTransferSlots(available)
      setTransferModal(bookingId)
      setSelectedTransferSlot(null)
    } catch (e) {
      console.error(e)
    }
  }

  // Chat state
  const [chatMsgs, setChatMsgs] = useState([])
  const [chatText, setChatText] = useState('')
  const [chatNome, setChatNome] = useState('')
  const chatBottomRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('coord_chat_messages')
    if (saved) setChatMsgs(JSON.parse(saved))
    const savedNome = localStorage.getItem('coord_chat_nome')
    if (savedNome) setChatNome(savedNome)
  }, [])

  useEffect(() => {
    localStorage.setItem('coord_chat_messages', JSON.stringify(chatMsgs))
  }, [chatMsgs])
  useEffect(() => {
    localStorage.setItem('coord_chat_nome', chatNome)
  }, [chatNome])

  const sendCoordMsg = (e) => {
    e.preventDefault()
    if (!chatText.trim()) return
    const nomeVal = chatNome.trim() || 'Coordenador'
    setChatMsgs([...chatMsgs, {nome: nomeVal, mensagem: chatText.trim(), id: Date.now()}])
    setChatText('')
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (!email || !senha) {
      setError('Preencha todos os campos')
      return
    }
    setLoading(true)
    setError('')

    const user = email === 'viniciucoodernador@exemplo.com' || email === 'coordenador@exemplo.com'
    const pass = senha === '123456'

    if (user && pass) {
      localStorage.setItem('painel_auth', 'true')
      localStorage.setItem('painel_email', email)
      setPage('dashboard')
      loadData()
    } else {
      setError('E-mail ou senha incorretos')
    }
    setLoading(false)
  }

  const handleAddSlot = async () => {
    if (!formData.data || !formData.hora_inicio || !formData.hora_fim) {
      alert('Preencha todos os campos')
      return
    }
    try {
      const response = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, disponivel: formData.disponivel === true })
      })
      if (!response.ok) throw new Error('Erro ao salvar')
      const result = await response.json()
      setSuccess('Horário adicionado com sucesso!')
      setFormData({ data: '', hora_inicio: '', hora_fim: '', disponivel: true, local: '' })
      setShowAddModal(false)
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar. Tente novamente.')
    }
  }

  const handleEdit = (slot) => {
    setEditingSlot(slot)
    setFormData({
      data: slot.data,
      hora_inicio: slot.hora_inicio,
      hora_fim: slot.hora_fim,
      disponivel: slot.disponivel,
      local: slot.local || ''
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir este horário?')) return
    try {
      const response = await fetch('/api/slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!response.ok) throw new Error('Erro ao excluir')
      loadData()
    } catch (error) {
      console.error('Erro:', error)
    }
  }





  const slotsCount = slots.filter(s => s.disponivel).length
  const totalAgendamentos = bookings.length
  const pendingBookings = bookings.filter(b => b.status === 'pending')

  const getBookingName = (b) => {
    if (b.nome) return b.nome
    if (b.motivo) return b.motivo.split(": ")[0]
    return 'Aluno'
  }

  const handleApprove = async (id) => {
    try {
      const res = await fetch('/api/agendamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'confirmed' })
      })
      if (!res.ok) throw new Error('Erro ao aprovar')
      await loadData()
    } catch (error) {
      console.error('Erro ao aprovar:', error)
    }
  }

  const handleReject = async (id) => {
    try {
      const res = await fetch('/api/agendamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' })
      })
      if (!res.ok) throw new Error('Erro ao rejeitar')
      await loadData()
    } catch (error) {
      console.error('Erro ao rejeitar:', error)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Limpar TODAS as solicitações?')) return
    try {
      const res = await fetch('/api/agendamento/all', { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao limpar')
      await loadData()
      alert('✅ Todas as solicitações foram limpas!')
    } catch (error) {
      alert('❌ Erro ao limpar: ' + error.message)
      console.error('Erro ao limpar:', error)
    }
  }

  const handleTransfer = async (bookingId) => {
    if (!selectedTransferSlot) return
    try {
      // Find the old slot ID from the booking
      const booking = bookings.find(b => b.id === bookingId)
      const oldHorarioId = booking?.horario_id
      const res = await fetch('/api/agendamento/transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          newHorarioId: selectedTransferSlot.id,
          oldHorarioId
        })
      })
      if (!res.ok) throw new Error('Erro ao transferir')
      setTransferModal(null)
      setSelectedTransferSlot(null)
      await loadData()
      alert('✅ Horário transferido com sucesso!')
    } catch (error) {
      alert('❌ Erro ao transferir: ' + error.message)
      console.error('Erro ao transferir:', error)
    }
  }

  // LOGIN PAGE
  if (page === 'login') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-500 rounded-full filter blur-[120px] opacity-[0.06]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] bg-blue-600 rounded-full filter blur-[100px] opacity-[0.05]" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8 animate-slide-up">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Área do Coordenador</h1>
            <p className="text-gray-400 text-base">Entre com suas credenciais</p>
          </div>

          <div className="card glass p-6 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2 animate-slide-down">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="coordenador@exemplo.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl text-base font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-gray-600">Acesso restrito a coordenadores</p>
          </div>
        </div>
      </div>
    )
  }

  // DASHBOARD PAGE
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="gradient-orb w-96 h-96 bg-blue-500 top-[-10%] left-[-10%]" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '384px', height: '384px', borderRadius: '50%', filter: 'blur(80px)', opacity: '0.06', background: '#3b82f6' }} />
        <div className="gradient-orb w-80 h-80 bg-blue-600 bottom-[-5%] right-[-5%]" style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '320px', height: '320px', borderRadius: '50%', filter: 'blur(80px)', opacity: '0.04', background: '#2563eb' }} />
      </div>

      {/* Body */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-responsive-2xl font-bold text-white">Painel do Coordenador</h1>
              <p className="text-gray-400 text-sm mt-1">Gerencie horários e agendamentos</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] flex items-center gap-2 w-fit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Novo Horário
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <div className="card p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Horários</p>
            <p className="text-2xl font-bold text-white">{slots.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Disponíveis</p>
            <p className="text-2xl font-bold text-green-400">{slotsCount}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Agendamentos</p>
            <p className="text-2xl font-bold text-blue-400">{totalAgendamentos}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <div className="card p-4 border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                <span>⏳</span> {pendingBookings.length} Pedido{pendingBookings.length > 1 ? 's' : ''} Pendente{pendingBookings.length > 1 ? 's' : ''}
              </h3>
              <button onClick={handleClearAll} className="text-xs font-bold px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">🗑️ Limpar Tudo</button>
            </div>
              <div className="space-y-2">
                {pendingBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                    <div>
                      <p className="text-white text-sm font-medium">{b.nome}</p>
                      <p className="text-gray-500 text-xs">{b.motivo || 'Geral'} · {b.horarios_disponiveis?.data} {b.horarios_disponiveis?.hora_inicio?.slice(0,5)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(b.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">Aprovar</button>
                      <button onClick={() => handleReject(b.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">Rejeitar</button>
                      <button onClick={() => loadTransferSlots(b.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">Transferir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm flex items-center gap-2 animate-slide-down">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Time Slots */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full" /> Horários Disponíveis
          </h2>
          {slots.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-3 opacity-30">📅</div>
              <p className="text-xl font-bold text-gray-400 mb-1">Nenhum horário cadastrado</p>
              <p className="text-gray-500 text-sm">Adicione horários para que alunos possam agendar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot, i) => (
                <div key={slot.id} className="card p-5 group animate-slide-up" style={{ animationDelay: `${0.15 + i * 0.06}s`, animationFillMode: 'both' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center text-lg font-bold text-blue-400 border border-blue-500/20">
                      {slot.hora_inicio?.slice(0, 5)}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${slot.disponivel ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {slot.disponivel ? 'Livre' : 'Ocupado'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <p className="text-gray-400"><span className="text-gray-500">Data:</span> {slot.data}</p>
                    <p className="text-gray-400"><span className="text-gray-500">Horário:</span> {slot.hora_inicio?.slice(0, 5)} - {slot.hora_fim?.slice(0, 5)}</p>
                    {slot.local && <p className="text-gray-400"><span className="text-gray-500">Local:</span> {slot.local}</p>}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleEdit(slot)} className="flex-1 bg-white/5 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-all border border-white/5">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(slot.id)} className="flex-1 bg-red-500/10 text-red-400 py-2.5 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all border border-red-500/10">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full" /> Solicitações
          </h2>
          {bookings.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-gray-500">Nenhum agendamento ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 10).map((booking, i) => (
                <div key={booking.id} className="card p-4 flex items-center justify-between animate-slide-up" style={{ animationDelay: `${0.2 + i * 0.05}s`, animationFillMode: 'both' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                      {(getBookingName(booking) || '?')[0]}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{getBookingName(booking) || 'Aluno'}</p>
                      <p className="text-xs text-gray-500">{booking.motivo || ''} · {booking.horarios_disponiveis?.hora_inicio?.slice(0, 5)} · {booking.horarios_disponiveis?.data || ''}</p>
                    </div>
                  </div>
                  {booking.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-500/15 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-lg">Pendente</span>
                      <button onClick={() => handleApprove(booking.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">Aprovar</button>
                      <button onClick={() => handleReject(booking.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">Rejeitar</button>
                    </div>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${(booking.status === 'confirmed' || booking.status === 'aprovado') ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {booking.status === 'confirmed' || booking.status === 'aprovado' ? '✓ Aprovado' : '✗ Rejeitado'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setTransferModal(null)}>
          <div className="bg-[#12121a] rounded-2xl w-full max-w-md border border-white/10 p-6 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Transferir Horário</h3>
              <button onClick={() => setTransferModal(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Fechar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Escolha o novo horário para este agendamento:</p>
            <div className="space-y-2 mb-6">
              {transferSlots.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum slot disponível.</p>
              ) : (
                transferSlots.map((slot) => (
                  <div key={slot.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${selectedTransferSlot?.id === slot.id ? 'bg-blue-500/20 border-blue-500/50' : 'bg-black/20 border-white/5 hover:border-blue-500/30'}`} onClick={() => setSelectedTransferSlot(slot)}>
                    <div>
                      <p className="text-white text-sm font-medium">{slot.hora_inicio?.slice(0,5)} - {slot.hora_fim?.slice(0,5)}</p>
                      <p className="text-gray-500 text-xs">{slot.data}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${slot.disponivel ? 'bg-green-400' : 'bg-red-400'}`} />
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => handleTransfer(transferModal)}
              disabled={!selectedTransferSlot}
              className={`w-full py-3 rounded-xl font-bold transition-all ${selectedTransferSlot ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            >
              Confirmar Transferência
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
        <div className="card p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-blue-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              💬 Chat
            </h3>
            <button onClick={() => { setChatMsgs([]); localStorage.removeItem('coord_chat_messages') }} className="text-xs font-bold px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">🗑️ Limpar</button>
          </div>
          {/* Messages */}
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3 bg-black/20 rounded-xl p-3">
            {chatMsgs.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-2">Nenhuma mensagem ainda.</p>
            ) : (
              chatMsgs.map((m) => (
                <div key={m.id} className={`flex ${m.nome === 'Coordenador' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.nome === 'Coordenador' ? 'bg-blue-500/20 text-blue-300 ml-auto' : 'bg-gray-700/50 text-white'}`}>
                    <span className="text-[10px] font-bold opacity-60">{m.nome}: </span>
                    {m.mensagem}
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>
          {/* Input */}
          <form onSubmit={sendCoordMsg} className="flex gap-2">
            <input
              type="text"
              value={chatNome}
              onChange={e => setChatNome(e.target.value)}
              placeholder="Seu nome"
              className="w-24 bg-black/20 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 text-xs"
            />
            <input
              type="text"
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendCoordMsg(e)}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-black/20 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 text-xs"
            />
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Enviar</button>
          </form>
        </div>
      </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowAddModal(false); setEditingSlot(null) }}>
          <div className="bg-[#12121a] rounded-2xl w-full max-w-md border border-white/10 p-6 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">{editingSlot ? 'Editar Horário' : 'Novo Horário'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingSlot(null) }} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Fechar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2 animate-slide-down">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Data</label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Início</label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Fim</label>
                  <input
                    type="time"
                    value={formData.hora_fim}
                    onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Local (opcional)</label>
                <input
                  type="text"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  placeholder="Ex: Sala 3, Presencial"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Disponível</label>
                <select
                  value={formData.disponivel ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, disponivel: e.target.value === 'true' })}
                  className="input-field"
                >
                  <option value="true">Sim — Disponível</option>
                  <option value="false">Não — Ocupado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setEditingSlot(null) }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleAddSlot} className="btn-primary flex-1">{editingSlot ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}

</div>
  )
}
