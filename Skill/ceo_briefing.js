require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { audit }            = require('./audit_logger');
const { getEngagementSummary } = require('./meta_poster');
const { getTwitterSummary }    = require('./twitter_poster');

const BASE_URL   = 'http://localhost:20128/v1';
const MODEL      = 'kr/qwen3-coder-next';
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || './vault';

async function generateCEOBriefing() {
  audit.info('ceo_briefing', { status: 'starting' });

  // 1. Gather data
  const date      = new Date().toISOString().split('T')[0];
  const logsDir   = './logs';
  const weekLogs  = fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.log'))
    .slice(-7)
    .map(f => fs.readFileSync(path.join(logsDir, f), 'utf-8'))
    .join('\n');

  const pendingFiles = fs.readdirSync('./Needs_Action');
  const doneFiles    = fs.readdirSync('./Done');

  let socialData = 'Social data unavailable';
  try {
    const [meta, twitter] = await Promise.allSettled([
      getEngagementSummary(),
      getTwitterSummary()
    ]);
    socialData = JSON.stringify({ meta: meta.value, twitter: twitter.value }, null, 2);
  } catch(e) { audit.warn('ceo_briefing', { social: 'failed to fetch' }); }

  // 2. Generate briefing with AI
  const prompt = `
You are a Chief of Staff generating a weekly CEO briefing.

AUDIT LOGS (last 7 days):
${weekLogs.slice(0, 3000)}

PENDING ITEMS: ${pendingFiles.length} files in Needs_Action
COMPLETED: ${doneFiles.length} files in Done
SOCIAL MEDIA: ${socialData}

Generate a professional CEO briefing in Markdown with these sections:
## Executive Summary
## Key Metrics This Week
## Actions Completed
## Pending Items Requiring Attention
## Social Media Performance
## Recommendations for Next Week
`;

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ROUTER_API_KEY}` },
    body: JSON.stringify({ model: MODEL, stream: false, max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }] })
  });
  const data     = await resp.json();
  const briefing = data.choices?.[0]?.message?.content?.trim() || 'Briefing generation failed';

  // 3. Save to vault
  const outPath = path.join(VAULT_PATH, `CEO_Briefing_${date}.md`);
  fs.writeFileSync(outPath, briefing, 'utf-8');
  audit.info('ceo_briefing', { status: 'complete', path: outPath });
  console.log('CEO Briefing saved:', outPath);
}

module.exports = { generateCEOBriefing };