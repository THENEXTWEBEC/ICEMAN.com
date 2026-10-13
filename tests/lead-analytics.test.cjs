const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
// Execute the production tracking helper and delegated submit listener with
// controlled DOM/network boundaries; no requests reach sales or GA4.
const tracking = source.slice(source.indexOf('  const track ='), source.indexOf('  const escapeHTML'));
const submit = source.slice(source.indexOf('  root.addEventListener("submit",'), source.indexOf('  const clearFieldError'));
function harness({ endpoint = 'https://leads.example.test', consent = true, search = '', response = { ok: true }, fail = false } = {}) {
  const events = [], calls = [], observers = [];
  const box = () => ({ classList: { add() {}, remove() {} }, style: {} });
  const error = box(), success = box(), button = { setAttribute() {}, removeAttribute() {} };
  const field = (name, value, type = 'text') => ({ name, value, type, checked: true, closest: () => null, focus() {} });
  const fields = [field('name', 'Test'), field('company', 'Test company'), field('city', 'Quito'), field('phone', '0991234567'), field('email', 'test@example.test'), field('business_type', 'Hotel'), field('consent', '', 'checkbox')];
  const form = { id: 'lead-form', dataset: {}, matches: () => false,
    elements: { consent: fields.at(-1), website: { value: '' } },
    querySelectorAll: () => fields,
    querySelector: selector => selector === '.consent-error' ? box() : button,
    reset() { fields.forEach(f => { f.value = ''; f.checked = false; }); } };
  let listener, resolveFetch;
  const context = { URL, URLSearchParams, JSON, console,
    root: { addEventListener: (_, callback) => { listener = callback; } },
    localStorage: { getItem: () => JSON.stringify({ analytics: consent }) },
    window: { location: { href: 'https://icemanec.com/empresas', search }, gtag: (...args) => events.push(args), dispatchEvent: event => observers.push(event.detail), open: () => null },
    CustomEvent: class { constructor(_, options) { this.detail = options.detail; } },
    document: { getElementById: id => id === 'form-error' ? error : success, querySelector: () => endpoint ? { content: endpoint } : null },
    FormData: class {
      constructor() { this.entries = fields.map(f => [f.name, f.value]); }
      get(name) { return this.entries.find(entry => entry[0] === name)?.[1] || ''; }
      getAll() { return []; }
      [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
    },
    waLink: message => 'https://wa.me/test?text=' + encodeURIComponent(message),
    fetch: (...args) => { calls.push(args); return new Promise((resolve, reject) => { resolveFetch = () => fail ? reject(new Error('network')) : resolve(response); }); }
  };
  vm.runInNewContext(tracking + submit, context);
  return { fields, form, calls, events, observers, success, button,
    submit: () => listener({ target: form, preventDefault() {} }),
    confirm: () => resolveFetch(), leads: () => events.filter(event => event[1] === 'generate_lead') };
}
test('confirmed receipt emits once; double submit while pending does not duplicate', async () => {
  const h = harness(); const pending = h.submit();
  assert.equal(h.leads().length, 0);
  await h.submit(); assert.equal(h.calls.length, 1);
  h.confirm(); await pending;
  assert.equal(h.leads().length, 1);
  assert.equal(h.events.filter(event => event[1] === 'b2b_form_submit').length, 1);
  assert.equal(h.leads()[0][2].form_id, 'lead-form');
  assert.equal(h.leads()[0][2].debug_mode, undefined);
  assert.equal(JSON.stringify(h.leads()).includes('test@example.test'), false);
  await h.submit(); assert.equal(h.leads().length, 1);
});
test('configured Formspree endpoint receives JSON and requests JSON confirmation', async () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
  const endpoint = html.match(/name="iceman-lead-endpoint" content="([^"]+)"/)[1];
  assert.equal(endpoint, 'https://formspree.io/f/mzedjaza');
  const h = harness({ endpoint }); const pending = h.submit();
  const [url, options] = h.calls[0];
  assert.equal(url, endpoint);
  assert.equal(options.headers.Accept, 'application/json');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(JSON.parse(options.body).company, 'Test company');
  h.confirm(); await pending; assert.equal(h.leads().length, 1);
});
for (const [label, options] of [['HTTP failure', { response: { ok: false } }], ['network failure', { fail: true }], ['analytics rejected', { consent: false }]]) {
  test(label + ' does not emit a lead', async () => {
    const h = harness(options); const pending = h.submit(); h.confirm(); await pending;
    assert.equal(h.leads().length, 0);
  });
}
test('open/abandon, invalid fields and honeypot do not emit or request', async () => {
  const h = harness(); assert.equal(h.events.length, 0);
  h.fields[0].value = ''; await h.submit(); assert.equal(h.calls.length, 0);
  h.fields[0].value = 'Test'; h.form.elements.website.value = 'bot';
  await h.submit(); assert.equal(h.calls.length, 0); assert.equal(h.leads().length, 0);
});
test('WhatsApp preparation preserves legacy event without claiming conversion', async () => {
  const h = harness({ endpoint: '' }); await h.submit();
  assert.equal(h.calls.length, 0); assert.equal(h.leads().length, 0);
  assert.equal(h.events[0][1], 'b2b_form_submit');
  assert.equal(h.events[0][2].destination, 'whatsapp');
});
test('debug mode is enabled only by explicit query option; retry after failure works', async () => {
  const response = { ok: false }, h = harness({ search: '?ga4_debug=1', response });
  let pending = h.submit(); h.confirm(); await pending;
  assert.equal(h.form.dataset.submitting, undefined);
  response.ok = true; pending = h.submit(); h.confirm(); await pending;
  assert.equal(h.leads().length, 1); assert.equal(h.leads()[0][2].debug_mode, true);
});
test('a second independent successful submission is counted', async () => {
  const h = harness(); const original = h.fields.map(f => f.value);
  let pending = h.submit(); h.confirm(); await pending;
  h.fields.forEach((f, i) => { f.value = original[i]; f.checked = true; });
  pending = h.submit(); h.confirm(); await pending;
  assert.equal(h.leads().length, 2);
});
