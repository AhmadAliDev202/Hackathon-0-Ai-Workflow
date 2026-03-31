require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { audit } = require('./audit_logger');

const BASE_URL   = 'http://localhost:20128/v1';
const MODEL      = 'kr/qwen3-coder-next';
const MAX_LOOPS  = 5;

async function chat(messages, maxTokens = 1000) {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
               'Authorization': `Bearer ${process.env.ROUTER_API_KEY}` },
    body: JSON.stringify({ model: MODEL, stream: false, messages, max_tokens: maxTokens })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// Available tools the loop can call
const TOOLS = {
  read_needs_action: () => {
    const files = fs.readdirSync('./Needs_Action');
    return files.map(f => ({
      name: f,
      content: fs.readFileSync(path.join('./Needs_Action', f), 'utf-8')
    }));
  },
  mark_done: (filename) => {
    fs.renameSync(
      path.join('./Needs_Action', filename),
      path.join('./Done', filename)
    );
    return `Marked done: ${filename}`;
  },
  escalate: (reason) => {
    const f = path.join('./Pending_Approval', `escalation_${Date.now()}.json`);
    fs.writeFileSync(f, JSON.stringify({ reason, timestamp: new Date().toISOString() }, null, 2));
    return 'Escalated to human review';
  }
};

async function runRalphLoop(goal) {
  audit.info('ralph_loop', { goal, status: 'starting' });

  const history = [{
    role: 'system',
    content: `You are an autonomous business assistant. You have these tools:
- read_needs_action: reads all pending items
- mark_done(filename): moves a file to Done
- escalate(reason): sends item to human review

For each response, either:
1. Call a tool by writing: TOOL: tool_name(args)
2. Evaluate if goal is complete by writing: DONE: reason
3. Give up by writing: ESCALATE: reason

Goal: ${goal}`
  }];

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    audit.info('ralph_loop', { loop, status: 'thinking' });
    history.push({ role: 'user', content: `Loop ${loop}/${MAX_LOOPS}. What is your next action?` });

    const response = await chat(history);
    history.push({ role: 'assistant', content: response });

    console.log(`[Ralph Loop ${loop}]`, response);

    // Check for completion
    if (response.startsWith('DONE:')) {
      audit.info('ralph_loop', { status: 'complete', reason: response });
      return { success: true, result: response };
    }

    if (response.startsWith('ESCALATE:')) {
      TOOLS.escalate(response);
      audit.warn('ralph_loop', { status: 'escalated' });
      return { success: false, escalated: true };
    }

    // Execute tool call
    if (response.startsWith('TOOL:')) {
      const toolCall = response.replace('TOOL:', '').trim();
      let toolResult = 'Tool not found';

      if (toolCall.startsWith('read_needs_action')) {
        toolResult = JSON.stringify(TOOLS.read_needs_action());
      } else if (toolCall.startsWith('mark_done')) {
        const arg = toolCall.match(/\((.+)\)/)?.[1].replace(/['"]/g, '');
        toolResult = TOOLS.mark_done(arg);
      }

      history.push({ role: 'user', content: `Tool result: ${toolResult}` });
      audit.action('ralph_loop_tool', { toolCall, toolResult: toolResult.slice(0, 100) });
    }
  }

  // Max loops reached
  TOOLS.escalate('Max loops reached without completion');
  audit.warn('ralph_loop', { status: 'max_loops_reached', goal });
  return { success: false, reason: 'max loops' };
}

module.exports = { runRalphLoop };