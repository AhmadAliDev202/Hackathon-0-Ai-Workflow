const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const { generateCEOBriefing } = require('./Skill/ceo_briefing');
const { runRalphLoop }        = require('./Skill/ralph_loop');
const { postToFacebook }      = require('./Skill/meta_poster');
const { postTweet }           = require('./Skill/twitter_poster');
const { withRetry }           = require('./Skill/retry');
 
const APPROVAL_DIR = './Pending_Approval';
if (!fs.existsSync(APPROVAL_DIR)) fs.mkdirSync(APPROVAL_DIR);
 
async function requestApproval(actionName, details, executeFn) {
  const filename    = `${actionName}_${Date.now()}.json`;
  const pendingPath = path.join(APPROVAL_DIR, filename);
 
  const record = {
    action:    actionName,
    details,
    status:    'pending',
    createdAt: new Date().toISOString()
  };
 
  fs.writeFileSync(pendingPath, JSON.stringify(record, null, 2));
  console.log(`\n[APPROVAL REQUIRED] Action: ${actionName}`);
  console.log('Details:', details);
  console.log(`Pending file: ${pendingPath}\n`);
 
  const approved = await askUser('Approve this action? (y/n): ');
 
  record.status    = approved ? 'approved' : 'rejected';
  record.decidedAt = new Date().toISOString();
  fs.writeFileSync(pendingPath, JSON.stringify(record, null, 2));
 
  if (approved) {
    console.log('✓ Approved — executing action...');
    await executeFn();
  } else {
    console.log('✗ Rejected — action cancelled');
  }
 
  return approved;
}
 
function askUser(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// Every Monday at 7am
cron.schedule('0 7 * * 1', generateCEOBriefing);
// Daily at 8:30am after reasoning loop
cron.schedule('30 8 * * *', () =>
  runRalphLoop('Process all pending items in Needs_Action, mark completed ones as done, escalate anything requiring human decision')
);


// Tue/Thu 10am — Facebook post (with approval + retry)
cron.schedule('0 10 * * 2,4', async () => {
  await requestApproval('facebook_post', { platform: 'Facebook' },
    () => withRetry(() => postToFacebook('Business update...'),
      { retries: 3, actionName: 'facebook_post' }));
});

// Daily 11am — Tweet (with approval)
cron.schedule('0 11 * * *', async () => {
  await requestApproval('twitter_post', { platform: 'Twitter' },
    () => withRetry(() => postTweet('Daily business insight...'),
      { retries: 3, actionName: 'twitter_post' }));
});

module.exports = { requestApproval };