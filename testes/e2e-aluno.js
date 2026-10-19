// Teste de ponta a ponta da PÁGINA DO ALUNO.
//
// Regras que este arquivo segue (e que os testes anteriores não seguiam):
//
// 1. O horário de teste é criado pelo próprio teste, marcado com local "TESTE-AUTOMATICO",
//    então qualquer sobra é identificável.
// 2. O teste SEMPRE se limpa no final (bloco finally): apaga os agendamentos do horário de
//    teste e o próprio horário, mesmo se um passo falhar ou estourar o tempo. Um teste que
//    falha no meio NÃO deixa mais dado pendurado no banco.
// 3. A ordem dos passos é a que o app exige: identificar -> escrever o motivo -> escolher o
//    horário -> confirmar. Clicar no horário sem o motivo não abre nada (o app pede o motivo).
// 4. O modal de notificações abre sozinho quando o aluno tem notificação; o teste fecha
//    antes de continuar, senão o clique seguinte é interceptado.
//
// Uso:
//   node testes/e2e-aluno.js                          (contra produção)
//   ALVO=http://localhost:3006 node testes/e2e-aluno.js
//
// Sai com código 0 quando passa e 1 quando falha (a limpeza roda nos dois casos).

const fs = require('fs')
const path = require('path')

function carregarPlaywright() {
  try {
    return require('playwright')
  } catch (e) {
    const alternativo = process.env.PLAYWRIGHT_PATH || path.join(require('os').homedir(), 'node_modules/playwright')
    return require(alternativo)
  }
}

const { chromium } = carregarPlaywright()

const BASE = process.env.ALVO || 'https://coordinator-app-seven.vercel.app'
const MARCA = 'TESTE-AUTOMATICO'
const SAIDA = process.env.SAIDA || '/tmp'
const EMAIL_TESTE = process.env.EMAIL_TESTE || 'heitor123h@gmail.com'

// credenciais do Supabase para montar e limpar o horário de teste
function carregarEnv() {
  const env = {}
  const arquivo = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(arquivo)) throw new Error('não achei .env.local para pegar as chaves do Supabase')
  for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
  return env
}

const env = carregarEnv()
const SUPABASE = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const CHAVE = env.SUPABASE_SERVICE_KEY

async function supabase(caminho, opcoes = {}) {
  const r = await fetch(`${SUPABASE}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opcoes.headers || {}) },
  })
  const texto = await r.text()
  return { ok: r.ok, status: r.status, dados: texto ? JSON.parse(texto) : null }
}

async function criarHorarioDeTeste() {
  const { dados } = await supabase('horarios_disponiveis', {
    method: 'POST',
    body: JSON.stringify({ data: '2026-12-30', hora_inicio: '08:00', hora_fim: '08:30', disponivel: true, local: MARCA }),
  })
  return dados[0]
}

// Limpeza: apaga os agendamentos do horário de teste e o horário. Roda SEMPRE.
async function limpar(horarioId) {
  const resultado = { agendamentos: 0, horario: 0, sobrou: null }
  try {
    if (horarioId) {
      const apagados = await supabase(`agendamentos?horario_id=eq.${horarioId}`, { method: 'DELETE' })
      resultado.agendamentos = Array.isArray(apagados.dados) ? apagados.dados.length : 0
      const horario = await supabase(`horarios_disponiveis?id=eq.${horarioId}`, { method: 'DELETE' })
      resultado.horario = Array.isArray(horario.dados) ? horario.dados.length : 0
    }
    // rede de segurança: qualquer outra sobra marcada como teste
    await supabase(`agendamentos?nome=like.*Teste*`, { method: 'DELETE' })
    const sobras = await supabase(`horarios_disponiveis?local=eq.${MARCA}&select=id`)
    resultado.sobrou = Array.isArray(sobras.dados) ? sobras.dados.length : 0
    if (resultado.sobrou > 0) {
      await supabase(`horarios_disponiveis?local=eq.${MARCA}`, { method: 'DELETE' })
      const depois = await supabase(`horarios_disponiveis?local=eq.${MARCA}&select=id`)
      resultado.sobrou = Array.isArray(depois.dados) ? depois.dados.length : 0
    }
  } catch (e) {
    resultado.erro = String(e.message)
  }
  return resultado
}

;(async () => {
  let horario = null
  let browser = null
  let falha = null
  const passos = []

  try {
    horario = await criarHorarioDeTeste()
    console.log(`horário de teste criado: id ${horario.id} (${MARCA})`)

    browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext({ ...carregarPlaywright().devices['Pixel 7'] })
    const page = await ctx.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)))

    const tela = async () => (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ')
    const fecharModais = async () => {
      for (let i = 0; i < 3; i++) {
        const x = page.locator('button:has-text("✕")').first()
        if (!(await x.count())) break
        try { await x.click({ timeout: 1500 }) } catch (e) { break }
        await page.waitForTimeout(600)
      }
    }

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    passos.push('1. página abriu')

    // 1) identificar
    await page.locator('input[placeholder="Nome completo"]').fill('Teste Automatico Hermes')
    await page.locator('input[placeholder="Matrícula"]').fill('000000')
    await page.locator('input[placeholder="Curso"]').fill('ADS')
    await page.locator('input[placeholder="Turma"]').fill('Noite')
    await page.locator('input[placeholder="E-mail"]').fill(EMAIL_TESTE)
    await page.locator('button:has-text("Identificar e liberar horários")').click()
    await page.waitForTimeout(5000)
    if (!(await page.locator('button:has-text("Sair")').count())) throw new Error('não identificou o aluno')
    passos.push('2. aluno identificado')
    await fecharModais()   // o modal de notificações pode abrir sozinho

    // 2) motivo PRIMEIRO (o app exige antes de abrir a confirmação)
    await page.locator('textarea[placeholder^="Descreva brevemente"]').fill('Teste automatico do sistema - pode ignorar e recusar.')
    passos.push('3. motivo escrito')

    // 3) escolher o horário de teste
    const cartao = page.locator(`button:has-text("08:00")`).first()
    if (!(await cartao.count())) throw new Error('o horário de teste (08:00) não apareceu na página')
    await cartao.click()
    await page.waitForTimeout(2500)
    if (!(await page.locator('text=Confirmar Agendamento').count())) throw new Error('o modal de confirmação não abriu')
    passos.push('4. modal de confirmação aberto')

    // 4) confirmar (com espera pelo resultado, não pela animação)
    const resposta = page.waitForResponse((r) => r.url().includes('/api/agendamento') && r.request().method() === 'POST', { timeout: 30000 })
    await page.locator('button:has-text("Confirmar")').first().click({ timeout: 15000 })
    const resp = await resposta
    const corpo = await resp.json().catch(() => ({}))
    if (resp.status() !== 201) throw new Error(`o pedido não foi aceito (HTTP ${resp.status()})`)
    passos.push(`5. pedido criado (id ${corpo.id})`)

    const email = (corpo.aviso_aluno || {}).email || {}
    passos.push(`6. e-mail do aluno: ${email.ok ? 'enviado (id ' + email.id + ')' : 'NÃO enviado -> ' + JSON.stringify(email)}`)
    if (!email.ok) falha = 'o agendamento foi criado mas o e-mail não saiu'

    // Verificação da rede de segurança: força uma falha DEPOIS do pedido criado, para
    // conferir que a limpeza do bloco finally apaga o dado mesmo assim.
    //   FORCAR_FALHA=depois-do-pedido node testes/e2e-aluno.js
    if (process.env.FORCAR_FALHA === 'depois-do-pedido') {
      throw new Error('falha forçada de propósito, para testar a limpeza')
    }

    // 5) o horário fica ocupado para os outros alunos
    const resumo = await (await fetch(BASE + '/api/agendamento?resumo=1')).json()
    const aparece = Array.isArray(resumo) && resumo.some((r) => r.horario_id === horario.id && r.status === 'pending')
    passos.push(`7. horário aparece como pedido para os outros alunos: ${aparece ? 'sim' : 'NÃO'}`)
    if (!aparece) falha = falha || 'o horário não apareceu como pendente no resumo'

    // 6) histórico e notificações
    await fecharModais()
    const btnHist = page.locator('button:has-text("Histórico")').first()
    if (await btnHist.count()) {
      await btnHist.click()
      await page.waitForTimeout(4000)
      const abriu = (await tela()).includes('Pendente') || (await tela()).includes('pendente')
      passos.push(`8. histórico mostrou o pedido: ${abriu ? 'sim' : 'NÃO'}`)
      if (!abriu) falha = falha || 'o histórico não mostrou o pedido'
      await fecharModais()
    }

    if (erros.length) falha = falha || `erros de JavaScript: ${JSON.stringify(erros.slice(0, 3))}`
    passos.push(`9. erros de JavaScript: ${erros.length ? erros.length : 'nenhum'}`)

    await page.screenshot({ path: `${SAIDA}/e2e-aluno.png` }).catch(() => {})
  } catch (e) {
    falha = String(e.message).split('\n')[0]
  } finally {
    if (browser) await browser.close().catch(() => {})
    const limpeza = await limpar(horario && horario.id)
    console.log('\npassos:')
    for (const p of passos) console.log('  ' + p)
    console.log('\nlimpeza automática:')
    console.log(`  agendamentos apagados: ${limpeza.agendamentos}`)
    console.log(`  horário de teste apagado: ${limpeza.horario}`)
    console.log(`  sobras com a marca ${MARCA}: ${limpeza.sobrou}`)
    if (limpeza.erro) console.log(`  erro na limpeza: ${limpeza.erro}`)
    console.log(`\nresultado: ${falha ? 'FALHOU -> ' + falha : 'PASSOU'}`)
    process.exit(falha ? 1 : 0)
  }
})()
