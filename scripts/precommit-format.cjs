const { execFileSync } = require('node:child_process');
const path = require('node:path');

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const stagedFiles = git([
  'diff',
  '--cached',
  '--name-only',
  '--diff-filter=ACMR',
  '-z',
])
  .split('\0')
  .filter(Boolean);

if (stagedFiles.length === 0) process.exit(0);

const prettier = require.resolve('prettier/bin/prettier.cjs');

execFileSync(
  process.execPath,
  [prettier, '--write', '--ignore-unknown', ...stagedFiles],
  { stdio: 'inherit' }
);

execFileSync('git', ['add', '--', ...stagedFiles], { stdio: 'inherit' });
