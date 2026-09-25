export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'

export default function Chat() {
  useEffect(() => {
    document.body.className = 'page-chat'
  }, [])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [nome, setNome] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('chat_messages')
    if (saved) setMessages(JSON.parse(saved))
    const savedNome = localStorage.getItem('chat_nome')
    if (savedNome) setNome(savedNome)
  }, [])

  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem('chat_nome', nome)
  }, [nome])

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  useEffect(() => {
    loadBookings()
    const interval = setInterval(loadBookings, 5000)
    return () => clearInterval(interval)
  }, [])

  const sendMsg = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const nomeVal = nome.trim() || 'Anônimo'
    setMessages([...messages, {nome: nomeVal, mensagem: text.trim(), id: Date.now()}])
    setText('')
  }

  const [bookings, setBookings] = useState([])

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/agendamento')
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const clearSolicitacoes = async () => {
    if (!confirm('Limpar TODAS as solicitações pendentes?')) return
    try {
      await fetch('/api/agendamento/pending', { method: 'DELETE' })
      await loadBookings()
    } catch (e) {
      console.error(e)
    }
  }

  const clearChat = () => {
    if (confirm('Limpar histórico do chat?')) {
      setMessages([])
      localStorage.removeItem('chat_messages')
    }
  }

  return (
    <div className="page-chat min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="glass-panel mx-4 mt-4 rounded-2xl px-6 py-4 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl">💬</div>
            <div>
              <h1 className="font-bold text-lg text-white">Chat</h1>
              <p className="text-xs text-gray-400">Conversas rápidas</p>
            </div>
          </div>
          <button onClick={clearChat} className="text-sm font-bold px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
            🗑️ Limpar Chat
          </button>
        </header>

        {/* Nome input */}
        <div className="mx-4 mt-4 animate-slideUp">
          <div className="glass-panel rounded-xl p-4">
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full bg-black/20 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Solicitações */}
        <div className="mx-4 mt-4 animate-slideUp" style={{animationDelay:'0.15s'}}>
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-yellow-400">📋 Solicitações ({bookings.filter(b => b.status === 'pending').length})</h3>
              <button onClick={clearSolicitacoes} className="text-sm font-bold px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                🗑️ Limpar Tudo
              </button>
            </div>
            {bookings.filter(b => b.status === 'pending').length === 0 ? (
              <p className="text-gray-600 text-xs">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {bookings.filter(b => b.status === 'pending').map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                    <span className="text-xs text-white">{b.motivo || 'Sem descrição'}</span>
                    <span className="text-xs text-yellow-400">⏳ Pendente</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 mx-4 mt-4 mb-20 overflow-y-auto animate-slideUp" style={{animationDelay:'0.1s'}}>
          <div className="glass-panel rounded-2xl p-4 space-y-4 min-h-[55vh]">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-gray-500 text-sm">Nenhuma mensagem ainda.</p>
                <p className="text-gray-600 text-xs mt-1">Comece uma conversa acima!</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.nome === nome ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    m.nome === nome
                      ? 'bg-blue-500/20 border border-blue-500/20 ml-8'
                      : 'bg-white/5 border border-gray-800 mr-8'
                  }`}>
                    <p className={`text-xs mb-1 ${m.nome === nome ? 'text-blue-400' : 'text-gray-400'}`}>
                      {m.nome}
                    </p>
                    <p className="text-sm text-white leading-relaxed">{m.mensagem}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 animate-slideUp" style={{animationDelay:'0.2s'}}>
          <div className="max-w-lg mx-auto glass-panel rounded-2xl p-3">
            <form onSubmit={sendMsg} className="flex gap-3 items-center">
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-black/20 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
              />
              <button
                type="submit"
                className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
