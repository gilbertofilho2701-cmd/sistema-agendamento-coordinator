// Executa as migrações SQL direto no Postgres do Supabase.
// Uso: node migrate.mjs
// Requer no .env.local:  SUPABASE_DB_URL=postgresql://postgres.<ref>:<SENHA>@aws-0-<regiao>.pooler.supabase.com:5432/postgres
import fs from 'fs'
import path from 'path'
import pg from 'pg'

const root = path.dirname(new URL(import.meta.url).pathname)
const envPath = path.join(root, '.env.local')
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')

const url = process.env.SUPABASE_DB_URL || get('SUPABASE_DB_URL')
if (!url) {
  console.error('ERRO: defina SUPABASE_DB_URL no .env.local (Supabase > Connect > Session pooler > URI)')
  process.exit(1)
}

const dir = path.join(root, 'supabase', 'migrations')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
console.log('Migrações encontradas:', files.join(', '))

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
console.log('Conectado ao banco.')

for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8')
  try {
    await client.query(sql)
    console.log(`OK  ${f}`)
  } catch (e) {
    console.log(`ERRO ${f}: ${e.message}`)
  }
}

// Confere se as tabelas existem
const r = await client.query(
  `select table_name from information_schema.tables where table_schema='public' order by table_name`
)
console.log('Tabelas no schema public:', r.rows.map((x) => x.table_name).join(', '))
await client.end()
