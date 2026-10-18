import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const main = await load('workflow.json');
const alerts = await load('error-workflow.json');

for (const workflow of [main, alerts]) {
  assert.equal(workflow.active, false, 'Public templates must be inactive');
  assert.deepEqual(workflow.pinData, {}, 'Pinned execution data must not be exported');
  const names = new Set(workflow.nodes.map(node => node.name));
  assert.equal(names.size, workflow.nodes.length, 'Node names must be unique');
  for (const node of workflow.nodes) {
    assert.equal(node.credentials, undefined, 'Credential references must be removed');
    assert.equal(node.webhookId, undefined, 'Deployment webhook identifiers must be removed');
  }
  for (const [source, ports] of Object.entries(workflow.connections)) {
    assert(names.has(source), 'Connection source must exist');
    for (const branches of Object.values(ports)) {
      for (const branch of branches) {
        for (const edge of branch) assert(names.has(edge.node), 'Connection target must exist');
      }
    }
  }
}

const node = name => main.nodes.find(value => value.name === name);
assert.equal(main.nodes.length, 17);
assert.equal(alerts.nodes.length, 2);
assert.equal(node('Basic LLM Chain1').onError, 'continueErrorOutput');
assert.equal(main.connections['Basic LLM Chain1'].main[1][0].node, 'Insert row');
assert.equal(node('Insert row').parameters.columns.value.status, 'pending');
assert.equal(node('Update row(s)').parameters.columns.value.status, 'sent');
assert.equal(node('Update row(s)1').parameters.columns.value.status, 'human');
for (const name of ['If2', 'If3']) {
  assert.equal(node(name).parameters.conditions.conditions[0].rightValue, 'pending');
}
assert.equal(node('If4').parameters.conditions.conditions[0].rightValue, 'YOUR_ADMIN_TELEGRAM_USER_ID');

// Evaluate only the known formatting expressions with synthetic data.
// This checks the published template text, not n8n execution or external services.
const evaluate = (expression, data) => {
  assert(expression.startsWith('={{') && expression.endsWith('}}'));
  return new Function('$json', 'return (' + expression.slice(3, -2) + ')')(data);
};
const sample = {
  ticket_id: 'DEMO-001', category: 'order_status', priority: 'normal',
  original_text: 'Where is my order? <test> & _text_', summary: 'Order status inquiry.',
  draft: 'A specialist will review <request> & follow up.'
};
const card = evaluate(node('Send a text message').parameters.text, sample);
assert(card.includes('\nCategory: order_status\n'));
assert(card.includes('&lt;test&gt; &amp; _text_'));
assert(!card.includes('\\n'), 'Card must contain real newlines');
const reply = evaluate(node('Send a text message1').parameters.text, sample);
assert.equal(reply, 'A specialist will review &lt;request&gt; &amp; follow up.');
const notification = evaluate(alerts.nodes.find(n => n.name === 'Notify owner in Telegram').parameters.text, {
  workflow: {id: 'demo-workflow', name: 'Demo workflow'},
  execution: {id: 'DEMO-002', lastNodeExecuted: 'Demo failure', mode: 'manual',
    url: 'https://example.invalid/demo', error: {message: 'SECRET_ERROR_STACK'}},
  customer: {text: 'PRIVATE_CUSTOMER_TEXT'}
});
assert(notification.includes('ТЕСТ'));
assert(notification.includes('Demo failure'));
assert(!notification.includes('SECRET_ERROR_STACK'));
assert(!notification.includes('PRIVATE_CUSTOMER_TEXT'));
console.log('PASS: template structure, references, privacy defaults, state guards and text formatting');
console.log('External n8n / Telegram / Gemini services were not called.');
