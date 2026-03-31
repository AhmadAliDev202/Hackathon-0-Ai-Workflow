require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { postToFacebook } = require('./Skill/meta_poster');
const { postTweet }      = require('./Skill/twitter_poster');

const server = new Server(
  { name: 'social-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler('tools/list', async () => ({
  tools: [
    { name: 'post_facebook', description: 'Post to Facebook page',
      inputSchema: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } } },
    { name: 'post_twitter',  description: 'Post a tweet',
      inputSchema: { type: 'object', required: ['text'],    properties: { text:    { type: 'string' } } } }
  ]
}));

server.setRequestHandler('tools/call', async req => {
  const { name, arguments: a } = req.params;
  if (name === 'post_facebook') { await postToFacebook(a.message); return { content: [{ type: 'text', text: 'Posted to Facebook' }] }; }
  if (name === 'post_twitter')  { await postTweet(a.text);           return { content: [{ type: 'text', text: 'Tweet posted' }] }; }
  throw new Error('Unknown tool');
});

(async () => { await server.connect(new StdioServerTransport()); })();