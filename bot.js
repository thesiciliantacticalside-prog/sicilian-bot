const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const app = express();
let lastCode = 'Avvio in corso... attendi 10 sec e aggiorna';
let status = 'Avvio...';

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'})) },
    logger: P({level:'silent'}),
    browser: ['Ubuntu','Chrome','22.04']
  });
  sock.ev.on('creds.update', saveCreds);
  if(!sock.authState.creds.registered){
    status = 'Genero codice...';
    await new Promise(r=>setTimeout(r,6000));
    try{
      const num = process.env.NUMBER || '393407820723';
      const code = await sock.requestPairingCode(num);
      lastCode = code;
      status = 'Codice pronto! Mettilo su WhatsApp';
    }catch(e){ lastCode = 'Errore: '+e.message; }
  }
  sock.ev.on('connection.update', u=>{
    if(u.connection) status = u.connection;
    if(u.connection==='open'){ lastCode='✅ CONNESSO! Bot attivo'; status='Connesso - puoi scrivere al bot'; }
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const m=messages[0]; if(!m.message||m.key.fromMe) return;
    const text=m.message.conversation||m.message.extendedTextMessage?.text||'';
    if(!text) return;
    const t=text.toLowerCase();
    let reply="We beddu non ho capito, dimmi meglio! 😂";
    if(t.includes('ciao')||t.includes('we')||t.includes('oi')) reply="Wee ciao beddu! Comu stai? Minchia è na vita! 😎";
    else if(t.includes('comu stai')||t.includes('come stai')) reply="Bene assai cugino! E tu? Tutto apposto a Milano?";
    else if(t.includes('che fai')) reply="Nenti, sto qui che aspetto a tia! Che si dice di bello?";
    await sock.sendMessage(m.key.remoteJid,{text:reply});
  });
}
startBot();
app.get('/',(req,res)=>res.send(`<body style="background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:40px"><h1>🤌 Sicilian Bot</h1><h2>${status}</h2><div style="font-size:45px;background:#25D366;color:#000;padding:20px;border-radius:15px;display:inline-block;margin:20px;font-weight:bold">${lastCode}</div><p>WhatsApp > Impostazioni > Dispositivi collegati > Collega con numero di telefono</p><a href="/" style="color:#25D366">🔄 Aggiorna pagina</a><p>Numero: ${process.env.NUMBER||'393407820723'}</p></body>`));
app.listen(process.env.PORT||3000,()=>console.log('online'));
