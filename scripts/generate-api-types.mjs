import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configuredPath = process.argv[2] || process.env.REFA_OPENAPI_PATH;
const candidates = configuredPath ? [path.resolve(configuredPath)] : [
  path.resolve(root, '../../RefaDiazSystem/RefaDiazSupabase/supabase/docs/openapi.yaml'),
  path.join(homedir(), '.codex/worktrees/refadiaz-service-modules/supabase/docs/openapi.yaml'),
];
const source = candidates.find((candidate) => existsSync(candidate));
if (!source) {
  throw new Error('No se encontró OpenAPI. Usa npm run api:generate -- /ruta/al/backend/supabase/docs/openapi.yaml o REFA_OPENAPI_PATH.');
}
process.stdout.write(`Contrato: ${source}\n`);
const result = spawnSync(process.execPath, [
  path.join(root, 'node_modules/openapi-typescript/bin/cli.js'), source,
  '--output', path.join(root, 'src/api/refadiaz-api.d.ts'),
], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
