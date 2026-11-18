import { runEvaluation } from '../../apps/api/scripts/eval.js';

runEvaluation().catch((err) => {
  console.error('Eval failed:', err);
  process.exit(1);
});
