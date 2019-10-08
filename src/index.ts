import { runBeatbox } from './beatbox';
import { runLoadTest } from './loadTest';

// runBeatbox();

runLoadTest().then(_ => process.exit());
