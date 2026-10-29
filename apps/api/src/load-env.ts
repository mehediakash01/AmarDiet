import { config } from 'dotenv';
import path from 'node:path';

/**
 * Loads .env files BEFORE anything else reads process.env.
 *
 * Plain `import 'dotenv/config'` only looks in the current working
 * directory, so the API silently ran with NO AI keys whenever it was
 * started from somewhere other than apps/api (e.g. `node apps/api/dist/index.js`
 * from the repo root, or a process manager with a different cwd).
 *
 * Order matters: dotenv never overrides a variable that is already set,
 * so the first file that defines a variable wins.
 *   1. apps/api/.env   (the documented location)
 *   2. <repo root>/.env
 *   3. ./.env          (current working directory, the old behaviour)
 */
const apiDir = path.resolve(__dirname, '..'); // src/ or dist/ -> apps/api
const candidates = [
  path.join(apiDir, '.env'),
  path.resolve(apiDir, '..', '..', '.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const file of candidates) {
  config({ path: file });
}
