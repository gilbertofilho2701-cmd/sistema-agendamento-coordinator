import { useState, useEffect, useCallback } from 'react'
import { VERSAO } from '../lib/versao'

// Toda chamada do painel ao servidor vai com o token da sessão no cabeçalho.
// O token vem do /api/login e vale 12 horas. Sem ele, as rotas do coordenador
// respondem 401 — é o que impede alguém de mexer nos dados só com a URL.
async function apiFetch(url, opcoes = {}) {
  const cabecalhos = { ...(opcoes.headers || {}) }
  let token = ''
  try {
    token = (typeof window !== 'undefined'
      && (localStorage.getItem('painel_token') || sessionStorage.getItem('painel_token'))) || ''
  } catch (e) { /* ignora */ }
  if (token) cabecalhos.Authorization = `Bearer ${token}`

  const resposta = await fetch(url, { ...opcoes, headers: cabecalhos })

  // 401 nas rotas do coordenador = sessão expirou. Cuidados:
  // - no login e na troca de senha, 401 quer dizer outra coisa (senha errada);
  // - se o usuário não está logado, 401 é esperado (a tela de login não tem token) e
  //   recarregar aqui viraria um loop infinito de recarga.
  const ehLoginOuSenha = url.startsWith('/api/login') || url.startsWith('/api/credenciais')
  let sessaoAtiva = false
  try {
    sessaoAtiva = typeof window !== 'undefined'
      && (localStorage.getItem('painel_auth') === 'true' || sessionStorage.getItem('painel_auth') === 'true')
  } catch (e) { /* ignora */ }
  if (resposta.status === 401 && !ehLoginOuSenha && sessaoAtiva && typeof window !== 'undefined') {
    try {
      localStorage.removeItem('painel_auth')
      localStorage.removeItem('painel_token')
      sessionStorage.removeItem('painel_auth')
      sessionStorage.removeItem('painel_token')
    } catch (e) { /* ignora */ }
    window.location.reload()
  }
  return resposta
}

export default function Coordenador() {
  const [page, setPage] = useState('login')
  const [versaoAntiga, setVersaoAntiga] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [erroCarregamento, setErroCarregamento] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [formData, setFormData] = useState({ data: '', hora_inicio: '', hora_fim: '', disponivel: true, local: '' })
  const [success, setSuccess] = useState('')
  const [transferModal, setTransferModal] = useState(null)  // bookingId being transferred
  const [transferBooking, setTransferBooking] = useState(null)
  const [transferErro, setTransferErro] = useState('')
  const [liberarAntigo, setLiberarAntigo] = useState(true)
  const [transferSlots, setTransferSlots] = useState([])
  const [selectedTransferSlot, setSelectedTransferSlot] = useState(null)
  // Settings for changing credentials
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [salvandoCredenciais, setSalvandoCredenciais] = useState(false)
  // Modal "definir / alterar senha" da tela de login
  const [showSenhaModal, setShowSenhaModal] = useState(false)
  const [senhaConfigurada, setSenhaConfigurada] = useState(false)
  const [senhaAtualForm, setSenhaAtualForm] = useState('')
  const [senhaNovaForm, setSenhaNovaForm] = useState('')
  const [senhaConfirmaForm, setSenhaConfirmaForm] = useState('')
  const [senhaFormErro, setSenhaFormErro] = useState('')
  const [senhaFormOk, setSenhaFormOk] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [whatsappNumero, setWhatsappNumero] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [showNotif, setShowNotif] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])
  const [atividades, setAtividades] = useState([])

  const loadNotificacoes = async () => {
    try {
      const res = await apiFetch('/api/notificacao?destinatario=coordenador')
      const data = await res.json()
      setNotificacoes(Array.isArray(data) ? data : [])
    } catch (e) { console.error('notificações:', e) }
  }

  const loadAtividades = async () => {
    try {
      const res = await apiFetch('/api/atividades?limit=30')
      const data = await res.json()
      setAtividades(Array.isArray(data) ? data : [])
    } catch (e) { console.error('atividades:', e) }
  }

  const marcarNotificacoesLidas = async () => {
    const ids = notificacoes.filter(n => !n.lida).map(n => n.id)
    if (!ids.length) return
    try {
      await apiFetch('/api/notificacao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      setNotificacoes(notificacoes.map(n => ({ ...n, lida: true })))
    } catch (e) { console.error(e) }
  }

  const naoLidasCoordenador = notificacoes.filter(n => !n.lida).length

  // Aba antiga = código antigo rodando. Avisa para recarregar, senão o usuário digita
  // a senha certa e não entende por que não entra.
  useEffect(() => {
    let cancelado = false
    fetch('/api/versao')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelado && d && d.versao && d.versao !== VERSAO) setVersaoAntiga(true)
      })
      .catch(() => {})
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    const auth = typeof window !== 'undefined' ? localStorage.getItem('painel_auth') : null
    const emailUser = typeof window !== 'undefined' ? localStorage.getItem('painel_email') : null
    const tokenSalvo = typeof window !== 'undefined'
      ? (localStorage.getItem('painel_token') || sessionStorage.getItem('painel_token'))
      : null
    if (auth === 'true' && emailUser && tokenSalvo) {
      setPage('dashboard')
      loadData()
    } else {
      setPage('login')
    }
  }, [])

  const loadData = async () => {
    try {
      const slotsRes = await apiFetch('/api/slots')
      const slotsData = await slotsRes.json()
      setSlots(Array.isArray(slotsData) ? slotsData : [])
    } catch (e) {
      console.error('Erro slots:', e)
      setErroCarregamento('Não foi possível carregar os horários. Verifique sua conexão.')
    }
    try {
      const bookingsRes = await apiFetch('/api/agendamento')
      const bookingsData = await bookingsRes.json()
      // Normaliza o status para minúsculas (evita 'Pending' vs 'pending')
      const normalizados = (Array.isArray(bookingsData) ? bookingsData : []).map(b => ({
        ...b,
        status: (b.status || 'pending').toLowerCase()
      }))
      setBookings(normalizados)
      setErroCarregamento('')
    } catch (e) {
      console.error('Erro bookings:', e)
      setErroCarregamento('Não foi possível carregar as solicitações. Verifique sua conexão.')
    }
    loadNotificacoes()
  }

  // Atualiza a lista sozinho a cada 20s (novas solicitações aparecem sem dar F5)
  useEffect(() => {
    if (page !== 'dashboard') return
    const intervalo = setInterval(loadData, 20000)
    return () => clearInterval(intervalo)
  }, [page])

  // Carrega o número de WhatsApp salvo ao abrir as configurações
  useEffect(() => {
    if (!showSettingsModal) return
    apiFetch('/api/config')
      .then(r => r.json())
      .then(d => { if (d?.whatsapp_coordenador) setWhatsappNumero(d.whatsapp_coordenador) })
      .catch(() => {})
  }, [showSettingsModal])

  const handleSalvarWhatsapp = async () => {
    setWhatsappStatus(null)
    try {
      const res = await apiFetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_coordenador: whatsappNumero })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      setWhatsappStatus({ ok: true, msg: 'Número salvo: ' + (data.whatsapp_coordenador || '') })
      setWhatsappNumero(data.whatsapp_coordenador || '')
    } catch (e) {
      setWhatsappStatus({ ok: false, msg: 'Erro: ' + e.message })
    }
  }

  const loadTransferSlots = async (bookingId) => {
    try {
      const res = await apiFetch('/api/slots')
      const data = await res.json()
      // Só horários livres (o atual do aluno está ocupado, então não aparece)
      const available = Array.isArray(data) ? data.filter(s => s.disponivel) : []
      setTransferSlots(available)
      setTransferModal(bookingId)
      setSelectedTransferSlot(null)
      setLiberarAntigo(true)
      // Guarda de quem é o atendimento, para mostrar no modal
      const b = bookings.find(x => x.id === bookingId)
      setTransferBooking(b || null)
      setTransferErro('')
    } catch (e) {
      console.error(e)
    }
  }

  // Bloco de notas do coordenador (salvo no banco, aparece em qualquer aparelho)
  const [anotacoes, setAnotacoes] = useState([])
  const [novaAnotacao, setNovaAnotacao] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [editandoTexto, setEditandoTexto] = useState('')
  const [anotacoesErro, setAnotacoesErro] = useState('')

  const carregarAnotacoes = useCallback(async () => {
    try {
      const res = await apiFetch('/api/anotacoes')
      if (!res.ok) throw new Error('Erro ao carregar anotações')
      const data = await res.json()
      setAnotacoes(Array.isArray(data) ? data : [])
      setAnotacoesErro('')
    } catch (e) {
      console.error('Erro ao carregar anotações:', e)
      setAnotacoesErro('Não foi possível carregar as anotações.')
    }
  }, [])

  // Só busca as anotações dentro do painel: na tela de login não existe sessão e a
  // rota responde 401 (antes isso disparava recarregamento sem parar).
  useEffect(() => {
    if (page !== 'dashboard') return
    carregarAnotacoes()
  }, [page, carregarAnotacoes])

  const salvarAnotacao = async (e) => {
    e?.preventDefault()
    const texto = novaAnotacao.trim()
    if (!texto) return
    setAnotacoesErro('')
    try {
      const res = await apiFetch('/api/anotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const corpo = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAnotacoesErro(corro.error || 'Erro ao salvar')
        return
      }
      setAnotacoes((prev) => [corpo, ...prev])
      setNovaAnotacao('')
    } catch (err) {
      setAnotacoesErro('Erro ao salvar a anotação.')
    }
  }

  const alternarFixada = async (anotacao) => {
    try {
      const res = await apiFetch('/api/anotacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: anotacao.id, fixada: !anotacao.fixada }),
      })
      if (!res.ok) throw new Error()
      setAnotacoes((prev) =>
        prev.map((a) => (a.id === anotacao.id ? { ...a, fixada: !a.fixada } : a))
      )
    } catch {
      setAnotacoesErro('Não foi possível fixar/desfixar.')
    }
  }

  const salvarEdicao = async (id) => {
    const texto = editandoTexto.trim()
    if (!texto) return
    try {
      const res = await apiFetch('/api/anotacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, texto }),
      })
      if (!res.ok) throw new Error()
      setAnotacoes((prev) => prev.map((a) => (a.id === id ? { ...a, texto } : a)))
      setEditandoId(null)
      setEditandoTexto('')
    } catch {
      setAnotacoesErro('Não foi possível salvar a edição.')
    }
  }

  const excluirAnotacao = async (id) => {
    if (!window.confirm('Apagar esta anotação?')) return
    try {
      const res = await apiFetch(`/api/anotacoes?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setAnotacoes((prev) => prev.filter((a) => a.id !== id))
    } catch {
      setAnotacoesErro('Não foi possível apagar.')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !senha) {
      setError('Preencha todos os campos')
      return
    }
    setLoading(true)
    setError('')

    try {
      // A conferência é feita no servidor: as credenciais ficam no banco, então a
      // troca feita nas Configurações vale em qualquer aparelho (e a senha padrão
      // deixa de funcionar depois que o coordenador troca).
      const resp = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: email, senha }),
      })
      if (resp.ok) {
        // Guarda a marcação da sessão e o token — nunca a senha.
        const dadosLogin = await resp.json().catch(() => ({}))
        try {
          localStorage.setItem('painel_auth', 'true')
          localStorage.setItem('painel_email', String(email).trim())
          if (dadosLogin.token) localStorage.setItem('painel_token', dadosLogin.token)
        } catch (e2) {
          try {
            sessionStorage.setItem('painel_auth', 'true')
            sessionStorage.setItem('painel_email', String(email).trim())
            if (dadosLogin.token) sessionStorage.setItem('painel_token', dadosLogin.token)
          } catch (e3) { /* ignora */ }
        }
        setSenha('')
        setPage('dashboard')
        loadData()
      } else {
        const dados = await resp.json().catch(() => ({}))
        setError(dados.error || 'Usuário ou senha incorretos')
      }
    } catch (e2) {
      setError('Não foi possível entrar. Verifique sua conexão.')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('painel_auth')
      localStorage.removeItem('painel_email')
      localStorage.removeItem('painel_password')
      localStorage.removeItem('painel_token')
      sessionStorage.removeItem('painel_auth')
      sessionStorage.removeItem('painel_email')
      sessionStorage.removeItem('painel_password')
      sessionStorage.removeItem('painel_token')
    } catch (e) { /* ignora */ }
    setSenha('')
    setError('')
    setShowSettingsModal(false)
    setPage('login')
  }

  const abrirSenhaModal = async () => {
    setSenhaFormErro('')
    setSenhaFormOk('')
    setSenhaAtualForm('')
    setSenhaNovaForm('')
    setSenhaConfirmaForm('')
    setShowSenhaModal(true)
    try {
      const r = await apiFetch('/api/credenciais')
      const d = await r.json()
      setSenhaConfigurada(Boolean(d.configurado))
      if (d.usuario) setEmail(d.usuario)
    } catch (e) { /* segue com o que já está na tela */ }
  }

  const salvarSenha = async (e) => {
    e.preventDefault()
    setSenhaFormErro('')
    setSenhaFormOk('')
    if (senhaNovaForm.length < 6) {
      setSenhaFormErro('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senhaNovaForm !== senhaConfirmaForm) {
      setSenhaFormErro('As duas senhas digitadas não são iguais.')
      return
    }
    if (!senhaAtualForm) {
      setSenhaFormErro('Informe a senha atual.')
      return
    }
    setSalvandoSenha(true)
    try {
      const r = await apiFetch('/api/credenciais', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual: senhaAtualForm, novoUsuario: '', novaSenha: senhaNovaForm }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setSenhaFormOk('Senha salva! Agora entre com ela.')
        setSenhaConfigurada(true)
        setSenhaAtualForm('')
        setSenhaNovaForm('')
        setSenhaConfirmaForm('')
        if (d.usuario) setEmail(d.usuario)
      } else {
        setSenhaFormErro(d.error || 'Não foi possível salvar a senha')
      }
    } catch (e2) {
      setSenhaFormErro('Não foi possível salvar. Verifique sua conexão.')
    }
    setSalvandoSenha(false)
  }

  const handleChangeCredentials = async (e) => {
    e.preventDefault()
    setSettingsError('')
    setSettingsSuccess('')

    if (!currentPassword || !newPassword) {
      setSettingsError('Informe a senha atual e a nova senha')
      return
    }
    if (newPassword.length < 6) {
      setSettingsError('A nova senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (newPassword !== confirmarNovaSenha) {
      setSettingsError('As duas senhas digitadas não são iguais')
      return
    }

    setSalvandoCredenciais(true)
    try {
      // A senha atual é conferida no servidor e as novas credenciais são salvas no
      // banco — por isso passam a valer em qualquer aparelho, e não só neste navegador.
      const resp = await apiFetch('/api/credenciais', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual: currentPassword, novoUsuario: newEmail, novaSenha: newPassword }),
      })
      const dados = await resp.json().catch(() => ({}))
      if (resp.ok) {
        try { localStorage.setItem('painel_email', dados.usuario || newEmail) } catch (e2) { /* ignora */ }
        setSettingsSuccess('Credenciais atualizadas! Já valem em qualquer aparelho. Faça login novamente com elas.')
        setCurrentPassword('')
        setNewEmail('')
        setNewPassword('')
        setConfirmarNovaSenha('')
      } else {
        setSettingsError(dados.error || 'Não foi possível salvar as credenciais')
      }
    } catch (e2) {
      setSettingsError('Não foi possível salvar. Verifique sua conexão.')
    }
    setSalvandoCredenciais(false)
  }

  const handleAddSlot = async () => {
    if (!formData.data || !formData.hora_inicio || !formData.hora_fim) {
      alert('Preencha todos os campos')
      return
    }
    try {
      const response = await apiFetch('/api/slots', {
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
      const response = await apiFetch('/api/slots', {
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

  // Aprovar: o PATCH /api/agendamento ja avisa o aluno por e-mail, grava o sino
  // e registra a atividade. Nao reenviar — o aluno receberia o aviso duas vezes.
  const handleApprove = async (id) => {
    try {
      const res = await apiFetch('/api/agendamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'confirmed' })
      })
      if (!res.ok) throw new Error('Erro ao aprovar')
      await loadData()
    } catch (error) {
      console.error('Erro ao aprovar:', error)
      alert('Erro ao aprovar o atendimento. Tente novamente.')
    }
  }

  // Recusar: idem — o PATCH ja cuida do aviso ao aluno.
  const handleReject = async (id) => {
    try {
      const res = await apiFetch('/api/agendamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' })
      })
      if (!res.ok) throw new Error('Erro ao rejeitar')
      await loadData()
    } catch (error) {
      console.error('Erro ao rejeitar:', error)
      alert('Erro ao recusar o atendimento. Tente novamente.')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Limpar TODAS as solicitações?')) return
    try {
      const res = await apiFetch('/api/agendamento/all', { method: 'DELETE' })
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
    setTransferErro('')
    try {
      // Find the old slot ID from the booking
      const booking = bookings.find(b => b.id === bookingId)
      const oldHorarioId = booking?.horario_id
      const res = await apiFetch('/api/agendamento/transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          newHorarioId: selectedTransferSlot.id,
          oldHorarioId,
          liberarAntigo
        })
      })
      const corpo = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTransferErro(corpo.error || 'Erro ao transferir')
        return
      }
      
      // O PUT /api/agendamento/transfer ja avisa o aluno por e-mail e registra a
      // atividade. Nao reenviar por /api/notificacao (o aluno receberia duas vezes).
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
  const avisoVersao = versaoAntiga ? (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black text-sm font-medium px-4 py-3 flex items-center justify-between gap-3">
      <span>Esta página está desatualizada (versão antiga aberta no navegador).</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 bg-black/80 text-amber-300 px-3 py-1 rounded-lg font-bold"
      >
        Atualizar
      </button>
    </div>
  ) : null

  if (page === 'login') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
        {avisoVersao}
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
            {error && (
              <p className="text-xs text-gray-500 -mt-2 mb-4">
                Dica: toque em "ver" ao lado do campo da senha para conferir o que foi digitado.
                Espaço sobrando no fim ou letra trocada pelo teclado do celular impedem a entrada.
              </p>
            )}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Usuário</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="coordenadorvinicicu@gmail.com"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="input-field pr-14"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white"
                  >
                    {mostrarSenha ? 'ocultar' : 'ver'}
                  </button>
                </div>
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
            <button
              type="button"
              onClick={abrirSenhaModal}
              className="mt-3 w-full text-center text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Definir / alterar senha do coordenador
            </button>
          </div>
        </div>

        {showSenhaModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSenhaModal(false)}>
            <div className="bg-[#12121a] rounded-2xl w-full max-w-md border border-white/10 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{senhaConfigurada ? 'Alterar senha' : 'Definir senha'}</h3>
                <button type="button" onClick={() => setShowSenhaModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all" aria-label="Fechar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-2">
                {senhaConfigurada
                  ? 'Informe a senha atual, a nova senha e repita a nova.'
                  : 'Primeiro acesso: informe a senha que você usa hoje para entrar (a padrão do sistema) e escolha a nova.'}
              </p>
              <p className="text-xs text-gray-500 mb-4">Usuário: <span className="text-gray-300">{email || 'coordenadorvinicicu@gmail.com'}</span></p>

              <form onSubmit={salvarSenha} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Senha Atual</label>
                  <input
                    type="password"
                    value={senhaAtualForm}
                    onChange={e => setSenhaAtualForm(e.target.value)}
                    className="input-field"
                    placeholder="a senha que você usa para entrar hoje"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Nova Senha</label>
                  <input
                    type="password"
                    value={senhaNovaForm}
                    onChange={e => setSenhaNovaForm(e.target.value)}
                    className="input-field"
                    placeholder="mínimo 6 caracteres"
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Repita a Nova Senha</label>
                  <input
                    type="password"
                    value={senhaConfirmaForm}
                    onChange={e => setSenhaConfirmaForm(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>

                {senhaFormErro && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">{senhaFormErro}</div>
                )}
                {senhaFormOk && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm">{senhaFormOk}</div>
                )}

                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {salvandoSenha ? 'Salvando...' : 'Salvar senha'}
                </button>
                <p className="text-center text-xs text-gray-600">A senha vale para qualquer aparelho.</p>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // DASHBOARD PAGE
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {avisoVersao}
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
              onClick={() => { setShowNotif(!showNotif); if (!showNotif) { loadNotificacoes(); loadAtividades() } }}
              className="bg-gray-700/50 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-700 transition-all shadow-lg flex items-center gap-2 w-fit relative"
              title="Notificações e atividades"
            >
              🔔
              {naoLidasCoordenador > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {naoLidasCoordenador}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-gray-700/50 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-700 transition-all shadow-lg flex items-center gap-2 w-fit"
              title="Configurações"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ⚙️
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-700/50 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-600/70 transition-all shadow-lg flex items-center gap-2 w-fit"
              title="Sair do painel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
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

        {/* Erro de carregamento */}
        {erroCarregamento && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm flex items-center gap-2 animate-slide-down">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {erroCarregamento}
            <button onClick={loadData} className="ml-auto text-xs font-bold px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors">Tentar novamente</button>
          </div>
        )}

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
                      <button onClick={() => loadTransferSlots(b.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">Remarcar</button>
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
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {booking.email || 'sem e-mail'}
                        {booking.confirmado_via === 'whatsapp' && <span className="text-green-400"> · ✅ decidido pelo WhatsApp</span>}
                      </p>
                    </div>
                  </div>
                  {booking.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-500/15 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-lg">Pendente</span>
                      <button onClick={() => handleApprove(booking.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors">Aprovar</button>
                      <button onClick={() => handleReject(booking.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">Rejeitar</button>
                      <button onClick={() => loadTransferSlots(booking.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">Remarcar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${(booking.status === 'confirmed' || booking.status === 'aprovado') ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {booking.status === 'confirmed' || booking.status === 'aprovado' ? '✓ Aprovado' : '✗ Rejeitado'}
                      </span>
                      {(booking.status === 'confirmed' || booking.status === 'aprovado') && (
                        <button
                          onClick={() => loadTransferSlots(booking.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
                          title="Imprevisto? Mova este aluno para outro horário livre"
                        >
                          Remarcar
                        </button>
                      )}
                    </div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Remarcar atendimento</h3>
              <button onClick={() => setTransferModal(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Fechar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* De quem é o atendimento e onde ele está agora */}
            {transferBooking && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white font-medium">{transferBooking.nome || 'Aluno'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hoje: {transferBooking.horarios_disponiveis?.data} às {transferBooking.horarios_disponiveis?.hora_inicio?.slice(0, 5)}
                  {transferBooking.matricula ? ' · Matrícula ' + transferBooking.matricula : ''}
                </p>
              </div>
            )}

            <p className="text-gray-400 text-sm mb-3">Escolha o novo horário (só aparecem os livres):</p>
            <div className="space-y-2 mb-4">
              {transferSlots.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum horário livre. Cadastre um novo horário antes de remarcar.</p>
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

            {selectedTransferSlot && transferBooking && (
              <p className="text-xs text-blue-300 mb-3">
                {transferBooking.nome || 'O aluno'} sai de {transferBooking.horarios_disponiveis?.data} {transferBooking.horarios_disponiveis?.hora_inicio?.slice(0,5)} e passa para {selectedTransferSlot.data} {selectedTransferSlot.hora_inicio?.slice(0,5)}.
              </p>
            )}

            {selectedTransferSlot && transferBooking && (
              <label className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={liberarAntigo}
                  onChange={(e) => setLiberarAntigo(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-500"
                />
                <span className="text-xs text-gray-300">
                  <span className="font-bold text-white">Liberar o horário antigo</span>
                  <br />
                  {liberarAntigo
                    ? 'O horário que o aluno saiu fica livre para outro aluno agendar.'
                    : 'O horário que o aluno saiu continua ocupado (não aparece para outros alunos).'}
                </span>
              </label>
            )}

            {transferErro && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">{transferErro}</div>
            )}

            <button
              onClick={() => handleTransfer(transferModal)}
              disabled={!selectedTransferSlot}
              className={`w-full py-3 rounded-xl font-bold transition-all ${selectedTransferSlot ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            >
              Confirmar Remarcação
            </button>
          </div>
        </div>
      )}

      {/* Bloco de notas do coordenador */}
      <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
        <div className="card p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-blue-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              📝 Bloco de Notas
            </h3>
            <span className="text-xs text-gray-500">salvo no sistema</span>
          </div>

          {/* Nova anotação */}
          <form onSubmit={salvarAnotacao} className="flex gap-2 mb-3">
            <input
              type="text"
              value={novaAnotacao}
              onChange={e => setNovaAnotacao(e.target.value)}
              placeholder="Escreva uma anotação... (ex: fulano pediu para remarcar)"
              maxLength={2000}
              className="flex-1 bg-black/20 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 text-sm"
            />
            <button type="submit" disabled={!novaAnotacao.trim()} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${novaAnotacao.trim() ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
              Salvar
            </button>
          </form>

          {anotacoesErro && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">{anotacoesErro}</div>
          )}

          {/* Lista */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {anotacoes.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">Nenhuma anotação ainda. Escreva a primeira acima.</p>
            ) : (
              anotacoes.map((a) => (
                <div key={a.id} className={`p-3 rounded-xl border transition-all ${a.fixada ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/20 border-white/5'}`}>
                  {editandoId === a.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editandoTexto}
                        onChange={e => setEditandoTexto(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && salvarEdicao(a.id)}
                        className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500/50"
                      />
                      <button onClick={() => salvarEdicao(a.id)} className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/30">OK</button>
                      <button onClick={() => setEditandoId(null)} className="px-3 py-1 rounded-lg bg-gray-700/50 text-gray-400 text-xs font-bold hover:bg-gray-700">✕</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white text-sm whitespace-pre-wrap break-words">{a.texto}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-500">
                          {new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => alternarFixada(a)}
                            title={a.fixada ? 'Desfixar' : 'Fixar no topo'}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${a.fixada ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'}`}
                          >
                            {a.fixada ? '📌 Fixada' : '📌'}
                          </button>
                          <button
                            onClick={() => { setEditandoId(a.id); setEditandoTexto(a.texto) }}
                            title="Editar"
                            className="px-2 py-1 rounded-lg bg-gray-700/50 text-gray-400 text-[10px] font-bold hover:bg-gray-700 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => excluirAnotacao(a.id)}
                            title="Apagar"
                            className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </main>

      {/* Settings/Change Credentials Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-[#12121a] rounded-2xl w-full max-w-md border border-white/10 p-6 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">⚙️ Configurações</h3>
              <button onClick={() => setShowSettingsModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Fechar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {settingsSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2 animate-slide-down">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {settingsSuccess}
              </div>
            )}

            <form onSubmit={handleChangeCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Senha Atual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Novo Usuário</label>
                <input
                  type="text"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="input-field"
                  placeholder="deixe em branco para manter"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <p className="text-[11px] text-gray-500 mt-1">Em branco = troca só a senha.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="mínimo 6 caracteres"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Repita a Nova Senha</label>
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={e => setConfirmarNovaSenha(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
              {settingsError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-slide-down">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {settingsError}
                </div>
              )}
              <button
                type="submit"
                disabled={salvandoCredenciais}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                {salvandoCredenciais ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
              <p className="text-center text-xs text-gray-600">As novas credenciais valem em qualquer aparelho. Depois de salvar, use "Sair" e entre com elas.</p>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white">📱 WhatsApp do coordenador</h4>
              <p className="text-xs text-gray-500">
                Número que recebe o aviso de cada nova solicitação de atendimento.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Número com DDD</label>
                <input
                  type="tel"
                  value={whatsappNumero}
                  onChange={e => setWhatsappNumero(e.target.value)}
                  className="input-field"
                  placeholder="(88) 99999-9999"
                />
              </div>
              {whatsappStatus && (
                <div className={`px-4 py-3 rounded-xl text-sm ${whatsappStatus.ok ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                  {whatsappStatus.msg}
                </div>
              )}
              <button onClick={handleSalvarWhatsapp} className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25">
                Salvar número
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificações e atividades */}
      {showNotif && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNotif(false)}>
          <div className="bg-[#12121a] rounded-2xl w-full max-w-lg border border-white/10 p-6 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">🔔 Notificações</h3>
              <div className="flex items-center gap-2">
                <button onClick={marcarNotificacoesLidas} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-all">Marcar lidas</button>
                <button
                  onClick={async () => {
                    if (!confirm('Apagar todas as notificações do coordenador?')) return
                    try {
                      const res = await apiFetch('/api/notificacao?destinatario=coordenador', { method: 'DELETE' })
                      if (!res.ok) throw new Error('Erro ao limpar')
                      setNotificacoes([])
                      alert('Notificações limpas!')
                    } catch (e) {
                      alert('Erro ao limpar: ' + e.message)
                    }
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  Limpar tudo
                </button>
                <button onClick={() => setShowNotif(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Fechar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {notificacoes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Nenhuma notificação ainda.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {notificacoes.slice(0, 15).map((n) => (
                  <div key={n.id} className={`p-3 rounded-xl border text-sm whitespace-pre-line ${n.lida ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-blue-500/10 border-blue-500/20 text-white'}`}>
                    {n.mensagem}
                    <p className="text-[10px] text-gray-500 mt-2">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}

            <h4 className="text-sm font-bold text-white mb-3">📋 Atividades recentes</h4>
            {atividades.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Sem atividades registradas.</p>
            ) : (
              <div className="space-y-1.5">
                {atividades.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs text-gray-400 py-1.5 border-b border-white/5 last:border-0">
                    <span className="shrink-0">
                      {a.autor === 'aluno' ? '🎓' : a.autor === 'coordenador' ? '👨‍🏫' : '⚙️'}
                    </span>
                    <span className="flex-1">{a.detalhe || a.acao}</span>
                    <span className="shrink-0 text-gray-600">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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