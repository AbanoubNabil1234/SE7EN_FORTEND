import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = globSync('src/app/**/*.spec.ts').filter((file) =>
  !file.endsWith('app.spec.ts')
  && !file.endsWith('money.vo.spec.ts')
  && !file.endsWith('loading.service.spec.ts')
);
if (!files.length) {
  console.error('No spec files found under src/app');
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test', ...files],
  { stdio: 'inherit', cwd: process.cwd() }
);
process.exit(result.status ?? 1);
