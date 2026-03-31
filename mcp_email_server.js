require('dotenv').config();
const { Server }        = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const nodemailer        = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // Gmail App Password
  }
});

const server = new Server(
  { name: 'email-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name:        'send_email',
    description: 'Send an email via Gmail',
    inputSchema: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Email subject' },
        body:    { type: 'string', description: 'Email body (plain text)' }
      },
      required: ['to', 'subject', 'body']
    }
  }]
}));

server.setRequestHandler('tools/call', async req => {
  if (req.params.name !== 'send_email')
    throw new Error('Unknown tool');

  const { to, subject, body } = req.params.arguments;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to, subject, text: body
  });

  return {
    content: [{ type: 'text', text: `Email sent to ${to}` }]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Email Server running');
}
main();