const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The real view and API scripts run against a minimal DOM and an injectable fetch.
function createView(transport, { protocol = 'http:' } = {}) {
  const nodes = new Map();
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', value: '', style: {}, open: false,
      addEventListener() {}, showModal() { this.open = true; }, close() { this.open = false; },
    });
    return nodes.get(selector);
  }
  const context = vm.createContext({
    console, structuredClone, fetch: transport, location: { protocol }, window: {}, URL, Blob,
    document: { querySelector: node, getElementById: id => node('#' + id), querySelectorAll: () => [] },
    setTimeout: (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref(); return timer; }, clearTimeout,
  });
  const run = code => vm.runInContext(code, context);
  run(fs.readFileSync(path.join(__dirname, '..', '..', 'dist', 'app.js'), 'utf8'));
  const ready = run(fs.readFileSync(path.join(__dirname, '..', '..', 'dist', 'api-client.js'), 'utf8'));
  return { run, node, ready, set: (id, value) => { node('#' + id).value = value; } };
}

module.exports = { createView };
