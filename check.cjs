// Backward-compatible entry point: node check.cjs
// Tests use temporary databases and never change data/restman.sqlite.
require('./tests/api.test.cjs');
require('./tests/api-client.test.cjs');
require('./tests/frontend.test.cjs');
