import { runEpoch } from '../epoch';

runEpoch()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[epoch] failed:', e);
    process.exit(1);
  });