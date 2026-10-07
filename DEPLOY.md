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
   - Start Command: (deixe padrão — o Vercel detecta o Next.js)
4. Adicione Environment Variables no dashboard

## Variáveis de Ambiente Necessárias
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

### Opcionais — WhatsApp Business (ver WHATSAPP_SETUP.md)
- WHATSAPP_TOKEN
- WHATSAPP_PHONE_ID
- WHATSAPP_TO_COORDENADOR
- WHATSAPP_VERIFY_TOKEN
- WHATSAPP_TEMPLATE_ALUNO / WHATSAPP_TEMPLATE_COORDENADOR / WHATSAPP_TEMPLATE_LANG

## Observações
- O sistema roda `next start` (o mesmo código serve local e produção).
  Existia um `server.js` separado que reimplementava as rotas e divergia do
  publicado — foi removido, pois causava funcionalidades que só falhavam no ar.
- `.env.local` está no `.gitignore` (não envia para GitHub)
- Migrações SQL ficam em `supabase/migrations/`
