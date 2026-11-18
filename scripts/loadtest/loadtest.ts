import { runLoadTest } from '../../apps/api/scripts/loadtest.js';

runLoadTest().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
