import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const getTestLockContent = (testName, filename) => {
  return fs.readFileSync(path.resolve(process.cwd(), './tests/unit/', testName, filename), {
    encoding: 'utf8'
  });
};
