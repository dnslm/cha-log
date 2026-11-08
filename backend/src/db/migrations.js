import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

// применяет все ещё не применённые миграции из папки migrations по порядку имён файлов.
// какие миграции уже применены, хранится в таблице schema_migrations.
// каждая миграция выполняется в транзакции: или применяется целиком, или никак.
// возвращает список имён файлов, применённых в этот раз.
export function runMigrations(db, dir = MIGRATIONS_DIR) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    ) STRICT
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => row.version),
  );

  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const markApplied = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');
  const appliedNow = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(dir, file), 'utf8');

    db.exec('BEGIN');
    try {
      db.exec(sql);
      markApplied.run(file);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Миграция ${file} не применена: ${error.message}`);
    }

    appliedNow.push(file);
  }

  return appliedNow;
}
