const http = require('http');
const fs = require('fs');
const path = require('path');
const { SupabaseClient } = require('@supabase/supabase-js');

// Read .env.local for local development (optional)
let envVars = {};
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
  envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const [k, ...v] = l.trim().split('=');
    envVars[k] = v.join('=');
  });
} catch (e) {
  // .env.local not found (e.g., on cloud deployment) - use process.env only
}

const SUPABASE_URL = process.env.SUPABASE_URL || envVars.SUPABASE_URL || 'https://naoqyfuvfqwdckbjemvw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || envVars.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hb3F5ZnV2ZnF3ZGNrYmplbXZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTM1Mjc1NCwiZXhwIjoyMTA2OTI4NzU0fQ.krG0jJ378xrkhu1cMFiSHbLfyxukmzNQ1Z2i8FP1-fY';
const BASE = __dirname;
const PORT = process.env.PORT || 3000;
const supabaseAdmin = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const pageMap = {'/':'/index.html', '/painel':'/painel.html'};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/slots') {
        if (req.method === 'GET') {
          let query = supabaseAdmin.from('horarios_disponiveis').select('*').order('data', {ascending:true}).order('hora_inicio', {ascending:true});
          if (url.searchParams.has('date')) query = query.eq('data', url.searchParams.get('date'));
          const {data, error} = await query;
          if (error) throw error;
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify(data || []));
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', async () => {
            try {
              const slot = JSON.parse(body);
              delete slot.local;
              const {data, error} = await supabaseAdmin.from('horarios_disponiveis').insert([slot]).select();
              if (error) throw error;
              res.writeHead(201, {'Content-Type':'application/json'});
              res.end(JSON.stringify(data?.[0] || {}));
            } catch (err) {
              console.error('Slots POST error:', err.message);
              res.writeHead(500, {'Content-Type':'application/json'});
              res.end(JSON.stringify({error: err.message}));
            }
          });
          return;
        }
        if (req.method === 'DELETE') {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', async () => {
            try {
              const {id} = JSON.parse(body);
              await supabaseAdmin.from('agendamentos').delete().eq('horario_id', id);
              const {data, error} = await supabaseAdmin.from('horarios_disponiveis').delete().eq('id', id).select();
              if (error) throw error;
              res.writeHead(200, {'Content-Type':'application/json'});
              res.end(JSON.stringify({deleted: true}));
            } catch (err) {
              console.error('Slots DELETE error:', err.message);
              res.writeHead(500, {'Content-Type':'application/json'});
              res.end(JSON.stringify({error: err.message}));
            }
          });
          return;
        }
      }
      if (pathname === '/api/agendamento') {
        if (req.method === 'GET') {
          const {data, error} = await supabaseAdmin.from('agendamentos').select('*, horarios_disponiveis(*)').order('created_at', {ascending:false});
          if (error) throw error;
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify(data || []));
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', async () => {
            try {
              const booking = JSON.parse(body);
              const {data, error} = await supabaseAdmin.from('agendamentos').insert([booking]).select();
              if (error) throw error;
              // Mark the slot as unavailable
              await supabaseAdmin.from('horarios_disponiveis')
                .update({disponivel: false})
                .eq('id', booking.horario_id);
              res.writeHead(201, {'Content-Type':'application/json'});
              res.end(JSON.stringify(data?.[0] || {}));
            } catch (err) {
              console.error('Agendamento POST error:', err.message);
              res.writeHead(500, {'Content-Type':'application/json'});
              res.end(JSON.stringify({error: err.message}));
            }
          });
          return;
        }
        if (req.method === 'PATCH') {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', async () => {
            try {
              const {id, status} = JSON.parse(body);
              const {data, error} = await supabaseAdmin.from('agendamentos').update({status}).eq('id', id).select();
              if (error) throw error;
              res.writeHead(200, {'Content-Type':'application/json'});
              res.end(JSON.stringify(data?.[0] || {}));
            } catch (err) {
              console.error('Agendamento PATCH error:', err.message);
              res.writeHead(500, {'Content-Type':'application/json'});
              res.end(JSON.stringify({error: err.message}));
            }
          });
          return;
        }
      }
      if (pathname === '/api/agendamento/pending') {
        if (req.method === 'DELETE') {
          try {
            const {data, error} = await supabaseAdmin.from('agendamentos').delete().eq('status', 'pending');
            if (error) throw error;
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify({deleted: true, count: data ? data.length : 0}));
            return;
          } catch (err) {
            console.error('Delete pending error:', err.message);
            res.writeHead(500, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error: err.message}));
            return;
          }
        }
      }
      if (pathname === '/api/agendamento/all') {
        if (req.method === 'DELETE') {
          try {
            const {data, error} = await supabaseAdmin.from('agendamentos').delete().gte('id', 0);
            if (error) throw error;
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify({deleted: true, count: data ? data.length : 0}));
            return;
          } catch (err) {
            console.error('Delete all error:', err.message);
            res.writeHead(500, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error: err.message}));
            return;
          }
        }
      }
      if (pathname === '/api/historico') {
        if (req.method === 'GET') {
          const matricula = url.searchParams.get('matricula');
          if (!matricula) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error: 'matrícula é obrigatória'}));
            return;
          }
          const {data, error} = await supabaseAdmin.from('agendamentos').select('*, horarios_disponiveis(*)').eq('matricula', matricula).order('created_at', {ascending: false});
          if (error) throw error;
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify(data || []));
          return;
        }
      }
      if (pathname === '/api/notificacao') {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', async () => {
            try {
              const {aluno_id, tipo, mensagem} = JSON.parse(body);
              // Salvar notificação no banco
              const {data, error} = await supabaseAdmin.from('notificacoes').insert([{
                aluno_id,
                tipo,
                mensagem,
                lida: false,
                created_at: new Date().toISOString()
              }]).select();
              if (error) throw error;
              res.writeHead(201, {'Content-Type':'application/json'});
              res.end(JSON.stringify({success: true, data: data?.[0]}));
            } catch (err) {
              console.error('Notificação error:', err.message);
              res.writeHead(500, {'Content-Type':'application/json'});
              res.end(JSON.stringify({error: err.message}));
            }
          });
          return;
        }
        if (req.method === 'GET') {
          const alunoId = url.searchParams.get('aluno_id');
          if (!alunoId) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error: 'aluno_id é obrigatório'}));
            return;
          }
          const {data, error} = await supabaseAdmin.from('notificacoes').select('*').eq('aluno_id', alunoId).order('created_at', {ascending: false});
          if (error) throw error;
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify(data || []));
          return;
        }
      }
      if (pathname === '/api/agendamento/transfer') {
        if (req.method === 'PUT') {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', async () => {
            try {
              const {bookingId, newHorarioId, oldHorarioId} = JSON.parse(body);
              
              // Verificar se o novo horário está disponível
              const {data: newSlot, error: slotError} = await supabaseAdmin
                .from('horarios_disponiveis')
                .select('*')
                .eq('id', newHorarioId)
                .single();
              if (slotError) throw slotError;
              if (!newSlot.disponivel) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error: 'Horário não está disponível'}));
                return;
              }
              
              // Verificar se o agendamento existe
              const {data: booking, error: bookingError} = await supabaseAdmin
                .from('agendamentos')
                .select('*')
                .eq('id', bookingId)
                .single();
              if (bookingError) throw bookingError;
              
              // Update the booking's horario_id
              const {data: updateData, error: updateError} = await supabaseAdmin
                .from('agendamentos')
                .update({horario_id: newHorarioId})
                .eq('id', bookingId)
                .select();
              if (updateError) throw updateError;
              
              // Free the old slot (se diferente do novo)
              if (oldHorarioId !== newHorarioId) {
                await supabaseAdmin.from('horarios_disponiveis')
                  .update({disponivel: true})
                  .eq('id', oldHorarioId);
              }
              // Occupy the new slot
              await supabaseAdmin.from('horarios_disponiveis')
                .update({disponivel: false})
                .eq('id', newHorarioId);
              
              res.writeHead(200, {'Content-Type':'application/json'});
              res.end(JSON.stringify({success: true, data: updateData?.[0]}));
              return;
            } catch (err) {
              console.error('Transfer error:', err.message);
              res.writeHead(500, {'Content-Type':'application/json'});
              res.end(JSON.stringify({error: err.message}));
              return;
            }
          });
        }
      }
        return;
      res.writeHead(404, {'Content-Type':'application/json'});
      res.end(JSON.stringify({error:'Not found'}));
      return;
    } catch (err) {
      console.error('API error:', err.message);
      res.writeHead(500, {'Content-Type':'application/json'});
      res.end(JSON.stringify({error:err.message}));
      return;
    }
  }

  // Serve static files from .next/static
  if (pathname.startsWith('/_next/static/')) {
    const staticPath = path.join(BASE, pathname.slice(1).replace("_next", ".next"));
    if (fs.existsSync(staticPath)) {
      const ext = path.extname(staticPath);
      const contentTypes = { '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };
      res.writeHead(200, {'Content-Type': contentTypes[ext] || 'application/octet-stream'});
      res.end(fs.readFileSync(staticPath));
      return;
    }
  }

  const fpath = path.join(BASE, '.next', 'server', 'pages', pageMap[pathname]?.slice(1) || pathname);
  if (fs.existsSync(fpath)) {
    const html = fs.readFileSync(fpath, 'utf-8');
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(html);
  } else {
    res.writeHead(404, {'Content-Type':'text/html'});
    res.end('<h1>404</h1>');
  }
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
