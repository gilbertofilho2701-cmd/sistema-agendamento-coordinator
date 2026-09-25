# Deploy na Nuvem

## Opções de Hospedagem

### Railway (Recomendado)
1. Crie conta em railway.app
2. Instale CLI: `npm install -g @railway/cli`
3. Conecte ao GitHub
4. Deploy automático:
```bash
railway init
railway up
```
5. No dashboard do Railway, adicione as variáveis de ambiente:
   - `SUPABASE_URL` = sua URL do Supabase
   - `SUPABASE_SERVICE_KEY` = sua service key do Supabase

### Render
1. Crie conta em render.com
2. Conecte repositório GitHub
3. Crie "Web Service"
4. Configurações:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: `3000`
5. Adicione Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

### Vercel
1. Crie conta em vercel.com
2. Importe repositório
3. Configurações:
   - Build Command: `npm run build`
   - Start Command: `node server.js`
   - Port: 3000
4. Adicione Environment Variables no dashboard

## Variáveis de Ambiente Necessárias
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Observações
- O servidor usa `node server.js` (não `next start`)
- Porta é configurada via `process.env.PORT`
- `.env.local` está no `.gitignore` (não envia para GitHub)
