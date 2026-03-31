require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs     = require('fs');
const path   = require('path');
const { processFile } = require('./ai');
 
const INBOX  = './Inbox';
const ACTION = './Needs_Action';
const seen   = new Set(); // prevent duplicate processing
 
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});
 
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Scan QR code in WhatsApp → Linked Devices');
});
 
client.on('authenticated', () => console.log('WhatsApp authenticated'));
client.on('ready',         () => console.log('WhatsApp watcher ready'));
 
client.on('disconnected', reason => {
  console.log('WhatsApp disconnected:', reason);
  console.log('Reinitializing...');
  client.initialize();
});
 
client.on('auth_failure', msg => {
  console.error('WhatsApp auth failed:', msg);
});
 
// message_create catches ALL messages including ones you send to yourself
client.on('message_create', async msg => {
  const isSelfChat = msg.from === msg.to;
  if (msg.fromMe && !isSelfChat) return; // skip outgoing to others
  if (!msg.body || msg.body.trim() === '') return; // skip empty
 
  const msgId = msg.id._serialized;
  if (seen.has(msgId)) return; // dedup
  seen.add(msgId);
 
  const filename = `wa_${Date.now()}.txt`;
  const filePath = path.join(INBOX, filename);
  const content  = [
    `From: ${msg.from}`,
    `Time: ${new Date().toISOString()}`,
    `Body: ${msg.body}`
  ].join('\n');
 
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('WhatsApp message saved:', filename);
 
  try {
    const result = await processFile(filePath);
    if (result) fs.writeFileSync(filePath, result, 'utf-8');
  } catch (err) {
    console.error('AI processing error:', err.message);
  }
 
  const dest = path.join(ACTION, filename);
  fs.renameSync(filePath, dest);
  console.log('Moved to Needs_Action:', filename);
});
 
client.initialize();