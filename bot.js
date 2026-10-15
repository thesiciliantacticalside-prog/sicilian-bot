const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino'); const express = require('express'); const QRCode = require('qrcode'); const fs = require('fs');
const app = express();
let qrImage = 'Avvio...'; let status = 'Avvio...';

async function loadSession(){
  if(process.env.SESSION_ID){
    try{
      const data = JSON.parse(Buffer.from(process.env.SESSION_ID, 'base64').toString());
      if(!fs.existsSync('auth')) fs.mkdirSync('auth');
      fs.writeFileSync('auth/creds.json', JSON.stringify(data, null, 2));
    }catch(e){}
  }
}
async function startBot(){
  await loadSession();
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'})) }, logger: P({level:'silent'}), browser: ['Chrome','10','0'] });
  sock.ev.on('creds.update', async ()=>{ await saveCreds();
    try{ const b64 = Buffer.from(fs.readFileSync('auth/creds.json')).toString('base64'); console.log('\nSESSION_ID:\n'+b64+'\n'); }catch{}
  });
  sock.ev.on('connection.update', async (u)=>{
    if(u.qr){ status='QR PRONTO'; qrImage = await QRCode.toDataURL(u.qr); }
    if(u.connection==='open'){ status='✅ CONNESSO'; qrImage='CONNESSO'; }
    if(u.connection==='close'){ status='Riavvio...'; setTimeout(startBot, 3000); }
  });

  sock.ev.on('messages.upsert', async ({messages})=>{
    const m=messages[0]; if(!m.message||m.key.fromMe) return;
    const text = m.message.conversation||m.message.extendedTextMessage?.text||'';
    const t = text.toLowerCase().trim();
    const query = text.replace(/!cerca|!sconto|!offerta/gi,'').trim();

    let reply = '';

    if(t.startsWith('!cerca') || t.startsWith('!sconto') || t.startsWith('!offerta')){
      if(!query){ reply = "Scrivi così:!cerca torcia tattica"; }
      else {
        const q = encodeURIComponent(query + ' tattico sconto');
        const q2 = encodeURIComponent(query);
        reply = `🔍 *OFFERTE PER: ${query.toUpperCase()}*\n\n`+
        `📦 *Tattico / Accessori:*\n`+
        `• Trovaprezzi: https://www.trovaprezzi.it/cerca?query=${q2}\n`+
        `• Amazon: https://www.amazon.it/s?k=${q2}+tattico\n`+
        `• Armeria: https://www.armeriacasabella.it/?s=${q2}\n\n`+
        `💰 *Sconti attivi:*\n`+
        `• Google Shopping: https://www.google.com/search?tbm=shop&q=${q}\n`+
        `• Ebay: https://www.ebay.it/sch/i.html?_nkw=${q2}\n\n`+
        `Scrivi!cerca + prodotto per cercare altro.`;
      }
    } else if(t==='!menu'){
      reply = `🤌 *BOT TATTICO MENU*\n\n`+
      `!cerca [prodotto] - cerca sconti\n`+
      `Esempi:\n`+
      `!cerca fondina glock\n`+
      `!cerca zaino 40l tattico\n`+
      `!cerca torcia 1000 lumen\n`+
      `!cerca guanti tattici`;
    } else {
      return; // non risponde se non è un comando, così non spamma
    }
    await sock.sendMessage(m.key.remoteJid,{text:reply});
  });
}
startBot();
app.get('/',(req,res)=>{ res.set('Cache-Control','no-store'); res.send(`<body style="background:#111;color:#fff;text-align:center;padding:20px;font-family:sans-serif"><h1>🤌 Bot Tattico</h1><h2>${status}</h2>${qrImage.startsWith('data:')?`<img src="${qrImage}" style="width:320px;background:#fff;padding:10px"/>`:`<h2>${qrImage}</h2>`}<p>${new Date().toLocaleTimeString()}</p><a href="/" style="background:#25D366;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none">AGGIORNA QR</a></body>`); });
app.listen(process.env.PORT||3000);

