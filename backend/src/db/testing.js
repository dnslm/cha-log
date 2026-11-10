// вспомогательные функции для тестов бд
// файл НЕ содержит тестов, поэтому `node --test` его не запускает.
import { openDatabase } from './connection.js';
import { runMigrations } from './migrations.js';

// новая пустая база в памяти с применёнными миграциями.
// каждый тест получает свою базу, поэтому тесты не влияют друг на друга.
export function createTestDb() {
  const db = openDatabase(':memory:');
  runMigrations(db);
  return db;
}

export function addUser(db, { email = 'user@example.com', role = 'user' } = {}) {
  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES (?, 'hash', 'Тестовый пользователь', ?)`,
    )
    .run(email, role);
  return Number(result.lastInsertRowid);
}

export function addTea(db, { name = 'Да Хун Пао', category = 'Улун' } = {}) {
  const categoryId = db.prepare('SELECT id FROM categories WHERE name = ?').get(category).id;
  const result = db
    .prepare('INSERT INTO teas (name, category_id) VALUES (?, ?)')
    .run(name, categoryId);
  return Number(result.lastInsertRowid);
}

export function addTasting(db, userId, teaId, fields = {}) {
  const { brewedAt = '2026-01-01 10:00:00', waterTempC = 95, rating = null } = fields;
  const brewMethodId = db.prepare('SELECT id FROM brew_methods LIMIT 1').get().id;
  const result = db
    .prepare(
      `INSERT INTO tastings (user_id, tea_id, brew_method_id, brewed_at, water_temp_c, rating)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, teaId, brewMethodId, brewedAt, waterTempC, rating);
  return Number(result.lastInsertRowid);
}
