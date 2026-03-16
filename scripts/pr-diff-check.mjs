import { execFileSync } from 'node:child_process';

const baseRef = process.env.PR_GUARD_BASE_REF || 'origin/main';

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

try {
  runGit(['rev-parse', '--verify', baseRef]);
} catch {
  console.error(`[pr-diff-check] Base ref not found: ${baseRef}`);
  console.error('[pr-diff-check] Set PR_GUARD_BASE_REF to an available ref, for example origin/main.');
  process.exit(1);
}

const diffRange = `${baseRef}...HEAD`;

console.log(`[pr-diff-check] Checking patch hygiene for ${diffRange}`);

try {
  execFileSync('git', ['diff', '--check', diffRange], { stdio: 'inherit' });
  console.log('[pr-diff-check] Patch is clean.');
} catch (error) {
  process.exit(error.status || 1);
}
