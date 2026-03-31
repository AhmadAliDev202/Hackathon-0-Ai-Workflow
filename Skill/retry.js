const { audit } = require('./audit_logger');

async function withRetry(fn, options = {}) {
  const {
    retries    = 3,
    delayMs    = 2000,
    actionName = 'unknown',
    fallback   = null
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      audit.warn(actionName, { attempt, error: err.message });

      if (attempt === retries) {
        audit.error(actionName, { attempts: retries, status: 'failed' }, err);
        if (fallback) {
          audit.info(actionName, { status: 'using fallback' });
          return await fallback();
        }
        return null;
      }

      // Exponential backoff
      const wait = delayMs * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

const { withRetry } = require('./Skill/retry');

await withRetry(
  () => runLinkedInPoster(topic),
  { retries: 3, delayMs: 3000, actionName: 'linkedin_post',
    fallback: () => audit.info('linkedin_post', { status: 'skipped - will retry tomorrow' }) }
);

module.exports = { withRetry };