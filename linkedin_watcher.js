require('dotenv').config();
const cron          = require('node-cron');
const fs            = require('fs');
const path          = require('path');
const { processFile } = require('./ai');

const { RestliClient } = require('linkedin-api-client');

const INBOX  = './Inbox';
const ACTION = './Needs_Action';
const seen   = new Set(); 

const client = new RestliClient();

async function pollLinkedIn() {
  try {
    const resp = await client.get({
      resourcePath: '/messages',
      accessToken:  process.env.LINKEDIN_ACCESS_TOKEN,
      queryParams:  { q: 'mailbox', count: 10 }
    });

    const messages = resp?.data?.elements || [];

    for (const msg of messages) {
      if (seen.has(msg.entityUrn)) continue;
      seen.add(msg.entityUrn);

      const filename = `linkedin_${Date.now()}.txt`;
      const filePath = path.join(INBOX, filename);

      const body = [
        `Source: LinkedIn`,
        `From: ${msg.sender?.name?.localizedName || 'Unknown'}`,
        `Message: ${msg.body?.text || ''}`
      ].join('\n');

      fs.writeFileSync(filePath, body, 'utf-8');
      console.log('LinkedIn message saved:', filename);

      const result = await processFile(filePath);
      if (result) fs.writeFileSync(filePath, result, 'utf-8');

      fs.renameSync(filePath, path.join(ACTION, filename));
    }
  } catch (err) {
    console.error('LinkedIn poll error:', err.message);
  }
}

cron.schedule('*/5 * * * *', pollLinkedIn);
console.log('LinkedIn watcher started (polling every 5 min)');
pollLinkedIn();