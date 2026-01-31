import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export function getTestLockContent(testName: string, filename: string) {
  return fs.readFileSync(path.resolve(process.cwd(), './tests/unit/', testName, filename), {
    encoding: 'utf8',
  });
}
