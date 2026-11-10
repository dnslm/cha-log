import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './connection.js';
import { runMigrations } from './migrations.js';

let db;

beforeEach(() => {
  db = openDatabase(':memory:');
});

afterEach(() => {
  db.close();
});

describe('запуск миграций', () => {
  it('применяет все миграции из папки по порядку', () => {
    const applied = runMigrations(db);

    assert.deepEqual(applied, ['001_init.sql', '002_seed_dictionaries.sql']);
  });

  it('запоминает применённые миграции в schema_migrations', () => {
    runMigrations(db);

    const versions = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all()
      .map((row) => row.version);

    assert.deepEqual(versions, ['001_init.sql', '002_seed_dictionaries.sql']);
  });

  it('при повторном запуске ничего не применяет', () => {
    runMigrations(db);

    assert.deepEqual(runMigrations(db), []);
  });
});

describe('неудачная миграция', () => {
  let dir;

  beforeEach(() => {
    // временная папка с двумя миграциями: первая хорошая, вторая с ошибкой
    dir = mkdtempSync(join(tmpdir(), 'migrations-'));
    writeFileSync(join(dir, '001_ok.sql'), 'CREATE TABLE ok_table (id INTEGER PRIMARY KEY) STRICT;');
    writeFileSync(
      join(dir, '002_broken.sql'),
      `CREATE TABLE broken_table (id INTEGER PRIMARY KEY) STRICT;
       INSERT INTO table_that_does_not_exist VALUES (1);`,
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('выбрасывает ошибку с именем файла миграции', () => {
    assert.throws(() => runMigrations(db, dir), /002_broken\.sql/);
  });

  it('откатывает сломанную миграцию целиком и не отмечает её применённой', () => {
    assert.throws(() => runMigrations(db, dir));

    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .all()
      .map((row) => row.name);
    const versions = db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => row.version);

    assert.ok(tables.includes('ok_table'), 'первая миграция должна остаться применённой');
    assert.ok(!tables.includes('broken_table'), 'таблица из сломанной миграции должна откатиться');
    assert.deepEqual(versions, ['001_ok.sql']);
  });
});
