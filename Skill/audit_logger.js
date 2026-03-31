const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function getLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logDir, `${date}.jsonl`);
}

const audit = {
  action: (event, data = {}) => {
    const entry = { ts: new Date().toISOString(), level: 'action', event, ...data };
    fs.appendFileSync(getLogFile(), JSON.stringify(entry) + '\n');
    console.log(`[AUDIT] ${event}`, data);
  },
  warn: (event, data = {}) => {
    const entry = { ts: new Date().toISOString(), level: 'warn', event, ...data };
    fs.appendFileSync(getLogFile(), JSON.stringify(entry) + '\n');
    console.warn(`[WARN] ${event}`, data);
  },
  error: (event, data = {}) => {
    const entry = { ts: new Date().toISOString(), level: 'error', event, ...data };
    fs.appendFileSync(getLogFile(), JSON.stringify(entry) + '\n');
    console.error(`[ERROR] ${event}`, data);
  }
};

module.exports = { audit };