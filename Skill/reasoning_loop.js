require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL   = 'http://localhost:20128/v1';
const MODEL      = 'kr/qwen3-coder-next';
const ROUTER_KEY = process.env.ROUTER_API_KEY;
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || './vault';

async function chat(messages) {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ROUTER_KEY}`
    },
    body: JSON.stringify({ model: MODEL, stream: false, messages, max_tokens: 1500 })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function runReasoningLoop(inputFiles) {
  const fileContents = inputFiles.map(f => {
    const name = path.basename(f);
    const body = fs.readFileSync(f, 'utf-8');
    return `=== ${name} ===\n${body}`;
  }).join('\n\n');

  const history = [
    {
      role: 'system',
      content: `You are a business planning assistant. You reason step-by-step, identify actionable tasks, priorities, and produce structured Markdown plans. Be concise and actionable.`
    },
    {
      role: 'user',
      content: `Here are my pending items:\n\n${fileContents}\n\nStep 1: Summarize what needs attention.`
    }
  ];

  // Turn 1: summarize
  const summary = await chat(history);
  history.push({ role: 'assistant', content: summary });
  history.push({ role: 'user', content: 'Step 2: List the top 5 priority actions with deadlines.' });

  // Turn 2: prioritize
  const priorities = await chat(history);
  history.push({ role: 'assistant', content: priorities });
  history.push({ role: 'user', content: 'Step 3: Write a final Plan.md in Markdown with sections: ## Summary, ## Priority Actions, ## Next Steps.' });

  // Turn 3: produce Plan.md
  const planMarkdown = await chat(history);

  // Save to Obsidian vault
  const date     = new Date().toISOString().split('T')[0];
  const planPath = path.join(VAULT_PATH, `Plan_${date}.md`);
  fs.writeFileSync(planPath, planMarkdown, 'utf-8');

  console.log('Plan.md written to:', planPath);
  return planPath;
}

module.exports = { runReasoningLoop };