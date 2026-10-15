const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino'); const express = require('express'); const QRCode = require('qrcode'); const fs = require('fs');
const app = express();
let qrImage = 'Avvio... attendi 15 sec poi aggiorna'; let status = 'Avvio...';
async function loadSession(){
  if(process.env.SESSION_ID){
    try{
      const data = JSON.parse(Buffer.from(process.env.SESSION_ID, 'base64').toString());
      if(!fs.existsSync('auth')) fs.mkdirSync('auth');
      fs.writeFileSync('auth/creds.json', JSON.stringify(data, null, 2));
      console.log('Sessione ripristinata da SESSION_ID');
    }catch(e){ console.log('SESSION_ID non valido', e.message); }
  }
}
async function startBot(){
  await loadSession();
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'})) }, logger: P({level:'silent'}), browser: ['Chrome','10','0'] });
  sock.ev.on('creds.update', async ()=>{
    await saveCreds();
    try{
      const creds = fs.readFileSync('auth/creds.json');
      const b64 = Buffer.from(creds).toString('base64');
      console.log('\n\n========== COPIA QUESTO SESSION_ID ==========\n');
      console.log(b64);
      console.log('\n============================================\n');
    }catch{}
  });
  sock.ev.on('connection.update', async (u)=>{
    if(u.qr){ status='QR pronto - scansiona SUBITO'; qrImage = await QRCode.toDataURL(u.qr); }
    if(u.connection) status=u.connection;
    if(u.connection==='open'){ status='✅ CONNESSO! Guarda i LOGS di Render per copiare SESSION_ID'; qrImage='CONNESSO'; }
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const m=messages[0]; if(!m.message||m.key.fromMe) return;
    const t=(m.message.conversation||m.message.extendedTextMessage?.text||'').toLowerCase();
    let r="We beddu non ho capito! 😂";
    if(t.includes('ciao')||t.includes('we')) r="Wee ciao beddu! Comu stai? Minchia è na vita! 😎";
    if(t.includes('come stai')) r="Bene assai! E tu?";
    await sock.sendMessage(m.key.remoteJid,{text:r});
  });
}
startBot();
app.get('/',(req,res)=>res.send(`<body style="background:#111;color:#fff;text-align:center;padding:20px;font-family:sans-serif"><h1>🤌 Sicilian Bot</h1><h2>${status}</h2>${qrImage.startsWith('data:')?`<img src="${qrImage}" style="width:300px;background:#fff;padding:10px"/>`:`<h2>${qrImage}</h2>`}<br><p>Se vedi CONNESSO: vai su Render > Logs > copia il SESSION_ID lungo</p><a href="/">Aggiorna</a></body>`));
app.listen(process.env.PORT||3000);
