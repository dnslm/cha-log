import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb, addUser, addTea, addTasting } from './testing.js';

let db;

// перед каждым тестом создаём новую базу, после каждого закрываем
beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

function count(table) {
  return db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
}

describe('схема: таблицы и справочники', () => {
  it('создаёт все таблицы', () => {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all()
      .map((row) => row.name);

    assert.deepEqual(tables, [
      'brew_methods',
      'categories',
      'producers',
      'regions',
      'schema_migrations',
      'tastings',
      'tea_suggestions',
      'teas',
      'users',
    ]);
  });

  it('заполняет справочники начальными значениями', () => {
    const categories = db
      .prepare('SELECT name FROM categories')
      .all()
      .map((row) => row.name);

    assert.ok(categories.includes('Улун'));
    assert.ok(categories.includes('Пуэр'));
    assert.ok(count('brew_methods') > 0);
  });
});

describe('схема: внешние ключи', () => {
  it('не даёт создать чай с несуществующей категорией', () => {
    assert.throws(
      () => db.exec(`INSERT INTO teas (name, category_id) VALUES ('Чай', 99999)`),
      /FOREIGN KEY constraint failed/,
    );
  });

  it('не даёт удалить чай, у которого есть дегустации (RESTRICT)', () => {
    const userId = addUser(db);
    const teaId = addTea(db);
    addTasting(db, userId, teaId);

    assert.throws(
      () => db.prepare('DELETE FROM teas WHERE id = ?').run(teaId),
      /FOREIGN KEY constraint failed/,
    );
  });

  it('не даёт удалить категорию, на которую есть ссылки (RESTRICT)', () => {
    addTea(db, { category: 'Улун' });

    assert.throws(
      () => db.exec(`DELETE FROM categories WHERE name = 'Улун'`),
      /FOREIGN KEY constraint failed/,
    );
  });

  it('удаляет дегустации и предложения вместе с пользователем (CASCADE)', () => {
    const userId = addUser(db);
    const teaId = addTea(db);
    addTasting(db, userId, teaId);
    db.prepare('INSERT INTO tea_suggestions (user_id, name) VALUES (?, ?)').run(userId, 'Новый чай');

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    assert.equal(count('tastings'), 0);
    assert.equal(count('tea_suggestions'), 0);
  });

  it('обнуляет ссылку в предложении, если созданный чай удалён (SET NULL)', () => {
    const userId = addUser(db);
    const teaId = addTea(db);
    db.prepare('INSERT INTO tea_suggestions (user_id, name, created_tea_id) VALUES (?, ?, ?)').run(
      userId,
      'Новый чай',
      teaId,
    );

    db.prepare('DELETE FROM teas WHERE id = ?').run(teaId);

    const suggestion = db.prepare('SELECT created_tea_id FROM tea_suggestions').get();
    assert.equal(suggestion.created_tea_id, null);
  });
});

describe('схема: пользователи', () => {
  it('считает email одинаковым без учёта регистра', () => {
    addUser(db, { email: 'Tea@Example.com' });

    assert.throws(() => addUser(db, { email: 'tea@example.com' }), /UNIQUE constraint failed/);
  });

  it('допускает только роли user и admin', () => {
    assert.doesNotThrow(() => addUser(db, { email: 'a@example.com', role: 'admin' }));
    assert.throws(
      () => addUser(db, { email: 'b@example.com', role: 'boss' }),
      /CHECK constraint failed/,
    );
  });
});

describe('схема: дегустации', () => {
  let userId;
  let teaId;

  beforeEach(() => {
    userId = addUser(db);
    teaId = addTea(db);
  });

  it('принимает оценки от 1 до 10 и отсутствие оценки', () => {
    assert.doesNotThrow(() => addTasting(db, userId, teaId, { rating: 1 }));
    assert.doesNotThrow(() => addTasting(db, userId, teaId, { rating: 10 }));
    assert.doesNotThrow(() => addTasting(db, userId, teaId, { rating: null }));
  });

  it('отклоняет оценки вне диапазона 1–10', () => {
    assert.throws(() => addTasting(db, userId, teaId, { rating: 0 }), /CHECK constraint failed/);
    assert.throws(() => addTasting(db, userId, teaId, { rating: 11 }), /CHECK constraint failed/);
  });

  it('отклоняет температуру воды вне диапазона 0–100', () => {
    assert.throws(() => addTasting(db, userId, teaId, { waterTempC: -1 }), /CHECK constraint failed/);
    assert.throws(() => addTasting(db, userId, teaId, { waterTempC: 101 }), /CHECK constraint failed/);
  });

  it('отклоняет текст в числовом поле (режим STRICT)', () => {
    assert.throws(() => addTasting(db, userId, teaId, { waterTempC: 'горячая' }));
  });
});
