import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppState } from './types';

const dataDir = path.resolve(process.env.DATA_DIR || '.data');
const dbFile = path.join(dataDir, 'state.json');
const backupFile = `${dbFile}.bak`;
const lockFile = path.join(dataDir, 'state.lock');
const seedFile = path.join(process.cwd(), 'data', 'demo-state.json');

/** A writer that stops answering is allowed to be taken over after this long. */
const LOCK_STALE_MS = 15_000;
const LOCK_WAIT_MS = 10_000;

const empty: AppState = {
  tasks: [],
  runs: [],
  events: [],
  datasets: [],
  records: [],
  issues: [],
  reports: [],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Serializes read-modify-write cycles within this process.
 *
 * The chain is deliberately never allowed to hold a rejection. A single failed
 * write (full disk, permissions, a transient error) would otherwise poison the
 * chain permanently and every later `updateState` would reject forever. Each
 * caller still receives its own error; only the shared chain is reset.
 */
let lock: Promise<void> = Promise.resolve();

/**
 * Guards against concurrent processes (dev server + `pnpm seed`, two servers)
 * doing read-modify-write on the same file. A lockfile created with `wx` is the
 * only portable mutual exclusion; a stale lock from a crashed process is taken
 * over after LOCK_STALE_MS so a crash cannot wedge the store permanently.
 */
async function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  let handle: fs.FileHandle | null = null;
  const deadline = Date.now() + LOCK_WAIT_MS;

  for (;;) {
    try {
      handle = await fs.open(lockFile, 'wx');
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      try {
        const stat = await fs.stat(lockFile);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs.rm(lockFile, { force: true });
          continue;
        }
      } catch {
        continue; // the lock vanished between open and stat; retry immediately
      }
      if (Date.now() > deadline) {
        throw new Error('Timed out waiting for the state lock.');
      }
      await sleep(40);
    }
  }

  try {
    return await fn();
  } finally {
    await handle?.close().catch(() => {});
    await fs.rm(lockFile, { force: true }).catch(() => {});
  }
}

/** Replaces the state file in one step so a reader never observes a partial file. */
async function atomicWrite(state: AppState): Promise<void> {
  const tmp = `${dbFile}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  try {
    await fs.rename(tmp, dbFile);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

async function ensure(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbFile);
  } catch {
    try {
      await fs.copyFile(seedFile, dbFile);
    } catch {
      await atomicWrite(empty);
    }
  }
}

function asState(raw: unknown): AppState {
  const value = (raw ?? {}) as Partial<AppState>;
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  return {
    tasks: arr(value.tasks) as AppState['tasks'],
    runs: arr(value.runs) as AppState['runs'],
    events: arr(value.events) as AppState['events'],
    datasets: arr(value.datasets) as AppState['datasets'],
    records: (arr(value.records) as unknown[]).map(migrateRecord) as AppState['records'],
    issues: arr(value.issues) as AppState['issues'],
    reports: arr(value.reports) as AppState['reports'],
  };
}

/**
 * Records written before the schema became plan-driven carried startup-specific
 * top-level properties. They are folded into the dynamic `fields` shape on read,
 * so existing workspaces keep working without a reset.
 */
function migrateRecord(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const record = raw as Record<string, unknown> & { fields?: unknown };
  if (record.fields && typeof record.fields === 'object') return raw;
  const legacyKeys = [
    'company_name',
    'founders',
    'funding_amount',
    'funding_currency',
    'funding_raw',
    'latest_round',
    'website',
    'city',
    'source',
  ];
  const fields: Record<string, unknown> = {};
  for (const key of legacyKeys) {
    if (record[key] !== undefined) fields[key] = record[key];
  }
  const { id, datasetId, canonicalKey, confidence, status, sources, createdAt, updatedAt, ...rest } = record;
  for (const [key, value] of Object.entries(rest)) {
    if (!fields[key]) fields[key] = value;
  }
  return {
    id,
    datasetId,
    title: (fields.company_name as string) || 'Record',
    fields,
    canonicalKey: canonicalKey ?? '',
    confidence: confidence ?? 0,
    status: status ?? 'valid',
    sources: sources ?? [],
    createdAt,
    updatedAt,
  };
}

/**
 * Reads the state, falling back to the last good backup when the primary file
 * is corrupt. A corrupt file is never silently deleted: the next successful
 * write replaces it, and the backup survives until then.
 */
export async function readState(): Promise<AppState> {
  await ensure();
  for (const file of [dbFile, backupFile]) {
    try {
      return asState(JSON.parse(await fs.readFile(file, 'utf8')));
    } catch {
      // try the next source
    }
  }
  return { ...empty };
}

export async function updateState(
  fn: (s: AppState) => void | Promise<void>,
): Promise<AppState> {
  let result!: AppState;
  const run = lock.then(async () =>
    withFileLock(async () => {
      result = await readState();
      await fn(result);
      await atomicWrite(result);
      // Keep a one-generation backup so a crash mid-write or disk corruption
      // costs at most the newest change, never the whole workspace.
      await fs.copyFile(dbFile, backupFile).catch(() => {});
    }),
  );
  // Keep the chain healthy regardless of outcome; surface the error to this caller only.
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  await run;
  return result;
}

/** Clears every collection. Used by `pnpm seed` and `POST /api/reset`. */
export async function resetState(): Promise<AppState> {
  return updateState((s) => {
    s.tasks = [];
    s.runs = [];
    s.events = [];
    s.datasets = [];
    s.records = [];
    s.issues = [];
    s.reports = [];
  });
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
