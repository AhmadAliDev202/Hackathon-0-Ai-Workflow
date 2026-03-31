require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const ODOO_URL  = process.env.ODOO_URL;
const ODOO_DB   = process.env.ODOO_DB;
const ODOO_USER = process.env.ODOO_USER;
const ODOO_PASS = process.env.ODOO_PASSWORD;

// Odoo JSON-RPC helper
async function odooRpc(service, method, args) {
  const resp = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { service, method, args }
    })
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Get session UID
async function getUid() {
  return await odooRpc('common', 'authenticate',
    [ODOO_DB, ODOO_USER, ODOO_PASS, {}]);
}

async function odooCall(model, method, args, kwargs = {}) {
  const uid = await getUid();
  return await odooRpc('object', 'execute_kw',
    [ODOO_DB, uid, ODOO_PASS, model, method, args, kwargs]);
}

const server = new Server(
  { name: 'odoo-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'list_customers',
      description: 'List all customers from Odoo',
      inputSchema: { type: 'object', properties: {
        limit: { type: 'number', description: 'Max results' }
      }}
    },
    {
      name: 'create_invoice',
      description: 'Create a customer invoice in Odoo',
      inputSchema: { type: 'object', required: ['customer_id', 'amount', 'description'],
        properties: {
          customer_id: { type: 'number' },
          amount:      { type: 'number' },
          description: { type: 'string' }
        }}
    },
    {
      name: 'get_revenue',
      description: 'Get total revenue for current month',
      inputSchema: { type: 'object', properties: {} }
    }
  ]
}));

server.setRequestHandler('tools/call', async req => {
  const { name, arguments: a } = req.params;

  if (name === 'list_customers') {
    const customers = await odooCall('res.partner', 'search_read',
      [[[ 'customer_rank', '>', 0 ]]],
      { fields: ['name', 'email', 'phone'], limit: a.limit || 20 });
    return { content: [{ type: 'text', text: JSON.stringify(customers, null, 2) }] };
  }

  if (name === 'create_invoice') {
    const invoiceId = await odooCall('account.move', 'create', [{
      move_type:   'out_invoice',
      partner_id:  a.customer_id,
      invoice_line_ids: [[0, 0, {
        name:          a.description,
        price_unit:    a.amount,
        quantity:      1
      }]]
    }]);
    return { content: [{ type: 'text', text: `Invoice created: ID ${invoiceId}` }] };
  }

  if (name === 'get_revenue') {
    const now   = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const invoices = await odooCall('account.move', 'search_read',
      [[['move_type','=','out_invoice'],['state','=','posted'],['invoice_date','>=',start]]],
      { fields: ['amount_total'] });
    const total = invoices.reduce((s, i) => s + i.amount_total, 0);
    return { content: [{ type: 'text', text: `Monthly revenue: $${total.toFixed(2)}` }] };
  }

  throw new Error('Unknown tool');
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Odoo MCP Server running');
}
main();