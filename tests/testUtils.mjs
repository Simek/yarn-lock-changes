import fs from 'fs';
import path from 'path';

export const getTestLockContent = (testName, filename) => {
  return fs.readFileSync(path.resolve(process.cwd(), './tests/unit/', testName, filename), {
    encoding: 'utf8'
  });
};
