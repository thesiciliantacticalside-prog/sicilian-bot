const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino'); const express = require('express'); const QRCode = require('qrcode'); const fs = require('fs');
const app = express();
let qrImage = 'Avvio... attendi 20 sec'; let status = 'Avvio...'; let sock;

async function loadSession(){
  if(process.env.SESSION_ID){
    try{
      const data = JSON.parse(Buffer.from(process.env.SESSION_ID, 'base64').toString());
      if(!fs.existsSync('auth')) fs.mkdirSync('auth');
      fs.writeFileSync('auth/creds.json', JSON.stringify(data, null, 2));
      console.log('Sessione ripristinata');
    }catch(e){}
  }
}
async function startBot(){
  await loadSession();
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'})) }, logger: P({level:'silent'}), browser: ['Chrome','10','0'] });
  sock.ev.on('creds.update', async ()=>{
    await saveCreds();
    try{
      const creds = fs.readFileSync('auth/creds.json');
      const b64 = Buffer.from(creds).toString('base64');
      console.log('\n\n========== COPIA SESSION_ID ==========\n'+b64+'\n================================\n');
    }catch{}
  });
  sock.ev.on('connection.update', async (u)=>{
    if(u.qr){ status='QR PRONTO - SCANSIONA ORA!'; qrImage = await QRCode.toDataURL(u.qr); console.log('Nuovo QR generato'); }
    if(u.connection) status=u.connection;
    if(u.connection==='open'){ status='✅ CONNESSO! Vai nei Logs'; qrImage='CONNESSO'; }
    if(u.connection==='close'){
      status='Riavvio tra 3 sec...';
      qrImage='Genero nuovo QR...';
      setTimeout(()=>{ startBot(); }, 3000);
    }
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const m=messages[0]; if(!m.message||m.key.fromMe) return;
    const t=(m.message.conversation||m.message.extendedTextMessage?.text||'').toLowerCase();
    let r="We beddu non ho capito! 😂";
    if(t.includes('ciao')||t.includes('we')) r="Wee ciao beddu! Comu stai?";
    await sock.sendMessage(m.key.remoteJid,{text:r});
  });
}
startBot();
app.get('/',(req,res)=>{
  res.set('Cache-Control','no-store');
  res.send(`<body style="background:#111;color:#fff;text-align:center;padding:20px;font-family:sans-serif"><h1>🤌 Sicilian Bot</h1><h2>${status}</h2>${qrImage.startsWith('data:')?`<img src="${qrImage}" style="width:320px;background:#fff;padding:10px"/>`:`<h2>${qrImage}</h2>`}<br><br><p style="color:#25D366">${new Date().toLocaleTimeString()}</p><a href="/" style="color:#fff;background:#25D366;padding:10px 20px;border-radius:10px;text-decoration:none">AGGIORNA QR</a><br><br><p>Se vedi CONNESSO: vai su Render > Logs > copia SESSION_ID</p></body>`);
});
app.listen(process.env.PORT||3000);
