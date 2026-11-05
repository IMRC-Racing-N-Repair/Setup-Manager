import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const generatedDirectories = ['node_modules', '.expo', 'ios', 'android'];

for (const directory of generatedDirectories) {
  const target = resolve(projectRoot, directory);
  if (!target.startsWith(`${projectRoot}/`) && !target.startsWith(`${projectRoot}\\`)) {
    throw new Error(`Refusing to remove path outside the project: ${target}`);
  }
  await rm(target, { recursive: true, force: true });
  console.log(`Removed generated directory: ${directory}`);
}

console.log('Generated native and dependency folders are clean.');

