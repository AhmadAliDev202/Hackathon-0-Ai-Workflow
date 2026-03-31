const fs   = require('fs');
const path = require('path');
const readline = require('readline');
const { sendEmail } = require('./skills/send_email');
const { requestApproval } = require('./skills/approval');
const APPROVAL_DIR = './Pending_Approval';

if (!fs.existsSync(APPROVAL_DIR)) fs.mkdirSync(APPROVAL_DIR);
await requestApproval(
  'send_email',
  { to: 'client@example.com', subject: 'Follow up' },
  () => sendEmail('client@example.com', 'Follow up', 'Hi, just checking in...')
);
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
  console.log(`Details:`, details);
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

module.exports = { requestApproval };